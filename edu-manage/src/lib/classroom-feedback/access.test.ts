import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import {
  canAccessFeedbackImage,
  canCreateFeedback,
  canViewFeedback,
  getParentFeedbackStudentIds,
  hasRequiredLessonContent,
  hasMeaningfulFeedbackContent,
  feedbackStudentLimitError,
  MAX_STUDENTS_PER_FEEDBACK,
  redactFeedbackForParent,
  resolveTeacherFeedbackCreationScope,
} from './access'

const sharedFeedback = {
  teacherId: 'teacher-a',
  status: 'PUBLISHED',
  studentIds: ['student-a', 'student-b', 'student-c'],
  classLesson: { teacherId: 'teacher-a' },
}

describe('classroom feedback P0 access rules', () => {
  it('includes parent-owned historical records but excludes soft-deleted records', async () => {
    const findMany = vi.fn(async () => [{ id: 'student-active' }])
    const prisma = { student: { findMany } } as unknown as PrismaClient

    await expect(getParentFeedbackStudentIds(prisma, 'parent-a')).resolves.toEqual(['student-active'])
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: [{ parentId: 'parent-a' }, { parentUserId: 'parent-a' }],
        deletedAt: null,
      }),
    }))
  })

  it('uses the same five-student maximum for every teacher feedback entry point', () => {
    expect(MAX_STUDENTS_PER_FEEDBACK).toBe(5)
    expect(feedbackStudentLimitError('teacher', 5)).toBeNull()
    expect(feedbackStudentLimitError('teacher', 6)).toBe('一次最多反馈5名学生')
    expect(feedbackStudentLimitError('admin', 6)).toBeNull()
  })

  it('allows only the linked student feedback for a parent', () => {
    expect(canViewFeedback({ id: 'parent-a', role: 'parent' }, sharedFeedback, ['student-a'])).toBe(true)
    expect(canViewFeedback({ id: 'parent-a', role: 'parent' }, {
      ...sharedFeedback,
      studentIds: ['student-b'],
    }, ['student-a'])).toBe(false)
  })

  it('rejects another teacher and allows an administrator', () => {
    expect(canViewFeedback({ id: 'user-a', role: 'teacher', teacherId: 'teacher-a' }, sharedFeedback)).toBe(true)
    expect(canViewFeedback({ id: 'user-b', role: 'teacher', teacherId: 'teacher-b' }, sharedFeedback)).toBe(false)
    expect(canViewFeedback({ id: 'admin', role: 'admin' }, sharedFeedback)).toBe(true)
  })

  it('requires every submitted student to be in the server-authorized scope', () => {
    expect(canCreateFeedback(['student-a'], ['student-a', 'student-b'])).toBe(true)
    expect(canCreateFeedback(['student-a', 'student-x'], ['student-a', 'student-b'])).toBe(false)
    expect(canCreateFeedback(['student-a', 'student-a'], ['student-a'])).toBe(false)
  })

  it('rejects a forged group id and an out-of-scope student', async () => {
    const prisma = {
      classGroup: { findFirst: vi.fn(async () => null) },
      classLesson: { findFirst: vi.fn() },
      student: { findMany: vi.fn(async () => []) },
    } as unknown as PrismaClient

    await expect(resolveTeacherFeedbackCreationScope(prisma, {
      teacherId: 'teacher-a',
      feedbackGroupId: 'group-b',
      requestedStudentIds: ['student-a'],
      submittedCourseType: 'GROUP',
    })).resolves.toMatchObject({ allowed: false, reason: 'group' })

    await expect(resolveTeacherFeedbackCreationScope(prisma, {
      teacherId: 'teacher-a',
      feedbackGroupId: 'group-a',
      requestedStudentIds: ['student-a'],
      requireLesson: true,
      submittedCourseType: 'GROUP',
    })).resolves.toMatchObject({ allowed: false, reason: 'lesson-required' })

    await expect(resolveTeacherFeedbackCreationScope(prisma, {
      teacherId: 'teacher-a',
      requestedStudentIds: ['student-b'],
      submittedCourseType: 'GROUP',
    })).resolves.toMatchObject({ allowed: false, reason: 'student' })
  })

  it('does not resolve feedback scope for deleted, cancelled, or postponed lessons', async () => {
    const findFirst = vi.fn(async () => null)
    const prisma = {
      classLesson: { findFirst },
      classGroup: { findFirst: vi.fn() },
      student: { findMany: vi.fn() },
    } as unknown as PrismaClient

    await expect(resolveTeacherFeedbackCreationScope(prisma, {
      teacherId: 'teacher-a',
      classLessonId: 'lesson-cancelled',
      requestedStudentIds: ['student-a'],
      requireLesson: true,
      submittedCourseType: 'GROUP',
    })).resolves.toMatchObject({ allowed: false, reason: 'lesson' })

    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'POSTPONED'] },
      }),
    }))
  })

  it('limits a multi-subject class to the explicitly selected subject', async () => {
    const prisma = {
      classGroup: {
        findFirst: vi.fn(async () => ({
          id: 'group-a',
          termId: 'term-a',
          intensiveMode: 'NORMAL',
          course: { type: 'GROUP', subject: '语文' },
          teacherAssignments: [{ subject: '数学' }, { subject: '英语' }],
          enrollments: [
            { studentId: 'student-math', subjects: ['数学', '英语'], student: { id: 'student-math', name: '牛博研', parentId: null, parentUserId: null } },
            { studentId: 'student-chinese', subjects: ['语文'], student: { id: 'student-chinese', name: '语文学员', parentId: null, parentUserId: null } },
          ],
        })),
      },
      classLesson: { findFirst: vi.fn() },
      student: { findMany: vi.fn(async () => []) },
    } as unknown as PrismaClient

    await expect(resolveTeacherFeedbackCreationScope(prisma, {
      teacherId: 'teacher-a',
      feedbackGroupId: 'group-a',
      requestedSubject: '数学',
      requestedStudentIds: ['student-math'],
      submittedCourseType: 'GROUP',
    })).resolves.toMatchObject({ allowed: true, students: [{ id: 'student-math' }] })

    await expect(resolveTeacherFeedbackCreationScope(prisma, {
      teacherId: 'teacher-a',
      feedbackGroupId: 'group-a',
      requestedSubject: '数学',
      requestedStudentIds: ['student-chinese'],
      submittedCourseType: 'GROUP',
    })).resolves.toMatchObject({ allowed: false, students: [] })
  })

  it('rejects a teacher with a different assigned subject on a lesson', async () => {
    const prisma = {
      classLesson: {
        findFirst: vi.fn(async () => ({
          id: 'lesson-english',
          teacherId: null,
          subject: '英语',
          groupId: 'group-a',
          termId: 'term-a',
          intensiveMode: 'NORMAL',
          group: {
            id: 'group-a',
            teacherId: 'teacher-primary',
            termId: 'term-a',
            intensiveMode: 'NORMAL',
            course: { type: 'GROUP', subject: '英语' },
            teacherAssignments: [{ subject: '数学' }],
            enrollments: [{
              studentId: 'student-a',
              subjects: ['英语'],
              student: { id: 'student-a', name: '学员甲', parentId: null, parentUserId: null },
            }],
          },
          lessonStudents: [],
        })),
      },
      classGroup: { findFirst: vi.fn() },
      student: { findMany: vi.fn() },
    } as unknown as PrismaClient

    await expect(resolveTeacherFeedbackCreationScope(prisma, {
      teacherId: 'teacher-math',
      classLessonId: 'lesson-english',
      requestedStudentIds: ['student-a'],
      requestedSubject: '英语',
    })).resolves.toMatchObject({ allowed: false, reason: 'lesson', students: [] })
  })

  it('rejects lesson feedback for leave/absent students and allows attended students', async () => {
    const classLesson = {
      id: 'lesson-a',
      teacherId: 'teacher-a',
      subject: '数学',
      lessonDate: new Date('2026-10-28T16:00:00.000Z'),
      groupId: 'group-a',
      termId: 'term-a',
      status: 'SCHEDULED',
      attendanceSubmittedAt: null,
      attendances: [],
      intensiveMode: 'NORMAL',
      group: {
        id: 'group-a',
        teacherId: 'teacher-a',
        termId: 'term-a',
        intensiveMode: 'NORMAL',
        course: { type: 'GROUP', subject: '数学' },
        teacherAssignments: [{ subject: '数学' }],
        enrollments: [
          { studentId: 'student-leave', subjects: ['数学'], student: { id: 'student-leave', name: '请假学员', parentId: null, parentUserId: null } },
          { studentId: 'student-present', subjects: ['数学'], student: { id: 'student-present', name: '到课学员', parentId: null, parentUserId: null } },
        ],
      },
      lessonStudents: [
        { student: { id: 'student-leave', name: '请假学员', parentId: null, parentUserId: null } },
        { student: { id: 'student-present', name: '到课学员', parentId: null, parentUserId: null } },
      ],
    }
    const prisma = {
      classLesson: { findFirst: vi.fn(async () => classLesson) },
      classGroup: { findFirst: vi.fn() },
      student: { findMany: vi.fn() },
      attendance: {
        findMany: vi.fn()
          .mockResolvedValueOnce([{ lessonId: 'lesson-a', studentId: 'student-leave', status: 'LEAVE' }])
          .mockResolvedValueOnce([{ lessonId: 'lesson-a', studentId: 'student-present', status: 'PRESENT' }]),
      },
      leaveRequest: { findMany: vi.fn(async () => []) },
    } as unknown as PrismaClient

    await expect(resolveTeacherFeedbackCreationScope(prisma, {
      teacherId: 'teacher-a',
      classLessonId: 'lesson-a',
      requestedStudentIds: ['student-present'],
      requireLesson: true,
      requireAttendanceSubmitted: true,
    })).resolves.toMatchObject({ allowed: false, reason: 'attendance-required' })

    await expect(resolveTeacherFeedbackCreationScope(prisma, {
      teacherId: 'teacher-a',
      classLessonId: 'lesson-a',
      requestedSubject: '数学',
      requestedStudentIds: ['student-leave'],
    })).resolves.toMatchObject({ allowed: false, reason: 'blocked', students: [] })

    await expect(resolveTeacherFeedbackCreationScope(prisma, {
      teacherId: 'teacher-a',
      classLessonId: 'lesson-a',
      requestedSubject: '数学',
      requestedStudentIds: ['student-present'],
    })).resolves.toMatchObject({ allowed: true, students: [{ id: 'student-present' }] })
  })

  it('allows backfill feedback for a historical lesson after its attendance is submitted', async () => {
    const lesson = {
      id: 'lesson-past',
      teacherId: 'teacher-a',
      subject: '数学',
      lessonDate: new Date(Date.now() - 36 * 60 * 60 * 1000),
      groupId: 'group-a',
      status: 'COMPLETED',
      attendanceSubmittedAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
      attendances: [{ studentId: 'student-a' }],
      lessonStudents: [{ student: { id: 'student-a', name: '学员甲', parentId: null, parentUserId: null } }],
      group: {
        id: 'group-a',
        teacherId: 'teacher-a',
        termId: 'term-a',
        intensiveMode: 'NORMAL',
        course: { type: 'GROUP', subject: '数学' },
        teacherAssignments: [{ subject: '数学' }],
        enrollments: [{
          studentId: 'student-a',
          subjects: ['数学'],
          student: { id: 'student-a', name: '学员甲', parentId: null, parentUserId: null },
        }],
      },
    }
    const prisma = {
      classLesson: { findFirst: vi.fn(async () => lesson) },
      attendance: { findMany: vi.fn(async () => []) },
      leaveRequest: { findMany: vi.fn(async () => []) },
    } as unknown as PrismaClient

    await expect(resolveTeacherFeedbackCreationScope(prisma, {
      teacherId: 'teacher-a',
      classLessonId: lesson.id,
      requestedStudentIds: ['student-a'],
      requireLesson: true,
      requireAttendanceSubmitted: true,
    })).resolves.toMatchObject({ allowed: true, feedbackGroupId: 'group-a', termId: 'term-a', students: [{ id: 'student-a' }] })
  })

  it('accepts legacy completed attendance and uses the teacher assignment subject fallback', async () => {
    const classLesson = {
      id: 'legacy-lesson',
      teacherId: null,
      subject: null,
      lessonDate: new Date('2026-10-28T16:00:00.000Z'),
      groupId: 'group-a',
      termId: 'term-a',
      status: 'COMPLETED',
      attendanceSubmittedAt: null,
      attendances: [{ studentId: 'student-a' }],
      group: {
        id: 'group-a',
        teacherId: 'teacher-a',
        termId: 'term-a',
        intensiveMode: 'NORMAL',
        course: { type: 'GROUP', subject: '语文' },
        teacherAssignments: [{ subject: '数学' }],
        enrollments: [{
          studentId: 'student-a',
          subjects: ['数学'],
          student: { id: 'student-a', name: '学员甲', parentId: null, parentUserId: null },
        }],
      },
      lessonStudents: [{ student: { id: 'student-a', name: '学员甲', parentId: null, parentUserId: null } }],
    }
    const prisma = {
      classLesson: { findFirst: vi.fn(async () => classLesson) },
      classGroup: { findFirst: vi.fn() },
      student: { findMany: vi.fn() },
      attendance: { findMany: vi.fn(async () => []) },
      leaveRequest: { findMany: vi.fn(async () => []) },
    } as unknown as PrismaClient

    await expect(resolveTeacherFeedbackCreationScope(prisma, {
      teacherId: 'teacher-a',
      classLessonId: 'legacy-lesson',
      requestedStudentIds: ['student-a'],
      requestedSubject: '数学',
      requireLesson: true,
      requireAttendanceSubmitted: true,
    })).resolves.toMatchObject({ allowed: true, students: [{ id: 'student-a' }] })
  })

  it('requires student-only feedback to match both the teacher assignment and enrollment subject', async () => {
    const prisma = {
      classLesson: { findFirst: vi.fn() },
      classGroup: { findFirst: vi.fn(async () => null) },
      student: {
        findMany: vi.fn(async () => [{
          id: 'student-a',
          name: '学员甲',
          parentId: null,
          parentUserId: null,
          enrollments: [{
            subjects: ['英语'],
            group: {
              teacherId: 'teacher-primary',
              course: { subject: '英语' },
              teacherAssignments: [{ subject: '英语' }],
            },
          }],
        }]),
      },
    } as unknown as PrismaClient

    await expect(resolveTeacherFeedbackCreationScope(prisma, {
      teacherId: 'teacher-a',
      requestedStudentIds: ['student-a'],
      requestedSubject: '数学',
    })).resolves.toMatchObject({ allowed: false, students: [] })

    await expect(resolveTeacherFeedbackCreationScope(prisma, {
      teacherId: 'teacher-a',
      requestedStudentIds: ['student-a'],
      requestedSubject: '英语',
    })).resolves.toMatchObject({ allowed: true, students: [{ id: 'student-a' }] })
  })

  it('当课次学科不属于教师任教学科时拒绝创建课次反馈', async () => {
    const prisma = {
      teacher: {
        findUnique: vi.fn().mockResolvedValue({ id: 'teacher-bio', subjects: '生物' }),
      },
      classLesson: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'lesson-chem',
          subject: '化学',
          teacherId: 'teacher-bio',
          lessonStudents: [{ student: { id: 'student-a', name: 'A' } }],
          attendances: [],
          group: {
            course: { type: 'GROUP', subject: '化学' },
            enrollments: [{ studentId: 'student-a', subjects: ['化学'], student: { id: 'student-a', name: 'A' } }],
            teacherAssignments: [{ teacherId: 'teacher-bio', subject: '化学' }],
          },
        }),
      },
    } as unknown as PrismaClient

    const res = await resolveTeacherFeedbackCreationScope(prisma, {
      teacherId: 'teacher-bio',
      classLessonId: 'lesson-chem',
      requestedStudentIds: ['student-a'],
    })
    expect(res.allowed).toBe(false)
  })

  it('redacts every other student and rating from a parent DTO', () => {
    const knowledgeCard = {
      edition: '冀教版',
      grade: '初一',
      subject: '数学',
      topic: '一元一次方程',
      definition: '只含有一个未知数，且未知数的次数都是1、等号两边都是整式的方程，叫做一元一次方程。',
      formulas: ['ax+b=0（a≠0）', '移项时改变符号'],
      example: { question: '解方程 x+2=5', steps: ['两边同时减2', '计算得到x=3', '代回原式检验'], answer: 'x=3' },
      tips: ['移项时记得变号', '解完后代回检验'],
      verified: false,
    }
    const result = redactFeedbackForParent({
      id: 'feedback-1',
      studentIds: ['student-a', 'student-b', 'student-c'],
      knowledgeCard,
      students: [{ id: 'student-a', name: 'A' }, { id: 'student-b', name: 'B' }],
      studentRatings: [
        { studentId: 'student-a', rating: 'GREAT' },
        { studentId: 'student-b', rating: 'NEEDS_IMPROVEMENT' },
        { studentId: 'student-c', rating: 'OKAY' },
      ],
    }, ['student-a'])

    expect(result.studentIds).toEqual(['student-a'])
    expect(result.students).toEqual([{ id: 'student-a', name: 'A' }])
    expect(result.studentRatings).toEqual([{ studentId: 'student-a', rating: 'GREAT' }])
    expect(result.knowledgeCard).toEqual(knowledgeCard)
    expect(JSON.stringify(result)).not.toContain('student-b')
    expect(JSON.stringify(result)).not.toContain('student-c')
  })
})

describe('classroom feedback optional images', () => {
  it('requires at least ten non-whitespace characters for published lesson content', () => {
    expect(hasRequiredLessonContent('第一章 方程')).toBe(false)
    expect(hasRequiredLessonContent('第一章 一元二次方程基础解法')).toBe(true)
  })

  it('accepts substantive text without an image', () => {
    expect(hasMeaningfulFeedbackContent({
      overallComment: '今天课堂能够独立完成例题，解题步骤清楚，课后继续巩固计算准确率。',
    })).toBe(true)
  })

  it('accepts two content signals and rejects empty feedback', () => {
    expect(hasMeaningfulFeedbackContent({
      summary: '完成课堂练习',
      knowledgePoints: ['一元二次方程'],
    })).toBe(true)
    expect(hasMeaningfulFeedbackContent({})).toBe(false)
    expect(hasMeaningfulFeedbackContent({ overallComment: '很好' })).toBe(false)
  })
})

describe('classroom feedback image access', () => {
  function imagePrisma(feedbackOverrides: Record<string, unknown> = {}) {
    return {
      fileAsset: {
        findMany: vi.fn(async () => [{
          id: 'asset-1',
          storageKey: 'feedback-1.jpg',
          url: 'https://private.example.com/feedback-1.jpg',
          previewUrl: 'https://private.example.com/feedback-preview-1.webp',
          thumbnailUrl: 'https://private.example.com/feedback-thumbnail-1.webp',
          ownerType: 'feedback',
          feedbackId: 'feedback-1',
          uploadedById: 'teacher-user-a',
        }]),
      },
      classroomFeedback: {
        findMany: vi.fn(async () => [{
          id: 'feedback-1',
          teacherId: 'teacher-a',
          status: 'PUBLISHED',
          deletedAt: null,
          studentIds: ['student-a'],
          imageUrls: ['feedback-1.jpg'],
          classLesson: { teacherId: 'teacher-a' },
          ...feedbackOverrides,
        }]),
      },
      feedbackParentReadReceipt: {
        findMany: vi.fn(async () => []),
      },
      studyHallHomeworkEntry: {
        findMany: vi.fn(async () => []),
      },
      student: {
        findMany: vi.fn(async ({ where }: { where: { OR: Array<{ parentId?: string; parentUserId?: string }> } }) => {
          const parentId = where.OR[0]?.parentId || where.OR[1]?.parentUserId
          return parentId === 'parent-a' ? [{ id: 'student-a' }] : [{ id: 'student-b' }]
        }),
      },
    } as unknown as PrismaClient
  }

  it('allows the owning teacher and linked parent but rejects other users', async () => {
    const teacherAccess = await canAccessFeedbackImage(
      imagePrisma(),
      { id: 'teacher-user-a', role: 'teacher', teacherId: 'teacher-a' },
      ['feedback-preview-1.webp'],
    )
    expect(teacherAccess.get('feedback-preview-1.webp')?.allowed).toBe(true)

    const parentAccess = await canAccessFeedbackImage(
      imagePrisma(),
      { id: 'parent-a', role: 'parent' },
      ['https://private.example.com/feedback-thumbnail-1.webp'],
    )
    expect(parentAccess.get('https://private.example.com/feedback-thumbnail-1.webp')?.allowed).toBe(true)

    const otherParentAccess = await canAccessFeedbackImage(
      imagePrisma(),
      { id: 'parent-b', role: 'parent' },
      ['feedback-1.jpg'],
    )
    expect(otherParentAccess.get('feedback-1.jpg')?.allowed).toBe(false)

    const otherTeacherAccess = await canAccessFeedbackImage(
      imagePrisma(),
      { id: 'teacher-user-b', role: 'teacher', teacherId: 'teacher-b' },
      ['feedback-1.jpg'],
    )
    expect(otherTeacherAccess.get('feedback-1.jpg')?.allowed).toBe(false)
  })

  it('denies teacher and parent access after feedback is archived, revoked, or soft-deleted', async () => {
    for (const status of ['ARCHIVED', 'REVOKED']) {
      const archivedAccess = await canAccessFeedbackImage(
        imagePrisma({ status }),
        { id: 'teacher-user-a', role: 'teacher', teacherId: 'teacher-a' },
        ['feedback-1.jpg'],
      )
      expect(archivedAccess.get('feedback-1.jpg')?.allowed).toBe(false)
    }

    const deletedFeedback = imagePrisma({ deletedAt: new Date('2026-11-08T00:00:00.000Z') })
    const teacherAccess = await canAccessFeedbackImage(
      deletedFeedback,
      { id: 'teacher-user-a', role: 'teacher', teacherId: 'teacher-a' },
      ['feedback-1.jpg'],
    )
    const parentAccess = await canAccessFeedbackImage(
      deletedFeedback,
      { id: 'parent-a', role: 'parent' },
      ['feedback-1.jpg'],
    )

    expect(teacherAccess.get('feedback-1.jpg')?.allowed).toBe(false)
    expect(parentAccess.get('feedback-1.jpg')?.allowed).toBe(false)
  })

  it('allows a linked parent and assigned teacher to open study-hall homework photos', async () => {
    const studyHallPrisma = (parentStudentId = 'student-a') => ({
      fileAsset: {
        findMany: vi.fn(async () => [{
          id: 'asset-study-hall',
          storageKey: 'feedback-study-hall.jpg',
          url: '/api/uploads/feedback-study-hall.jpg',
          previewUrl: null,
          thumbnailUrl: null,
          ownerType: 'feedback',
          feedbackId: null,
          uploadedById: 'teacher-user-a',
        }]),
      },
      classroomFeedback: { findMany: vi.fn(async () => []) },
      studyHallHomeworkEntry: {
        findMany: vi.fn(async () => [{
          studentId: 'student-a',
          beforeImageUrls: ['/api/uploads/feedback-study-hall.jpg'],
          afterImageUrls: [],
          lessonImageUrls: [],
          imageUrls: ['/api/uploads/feedback-study-hall.jpg'],
          classRecord: {
            recordedById: 'teacher-user-a',
            studyClass: { teachers: [{ teacherId: 'teacher-user-b' }] },
          },
        }]),
      },
      student: {
        findMany: vi.fn(async () => [{ id: parentStudentId }]),
      },
    }) as unknown as PrismaClient

    const parentAccess = await canAccessFeedbackImage(
      studyHallPrisma(),
      { id: 'parent-a', role: 'parent' },
      ['feedback-study-hall.jpg'],
    )
    expect(parentAccess.get('feedback-study-hall.jpg')).toEqual({ allowed: true, reason: 'study-hall' })

    const assignedTeacherAccess = await canAccessFeedbackImage(
      studyHallPrisma(),
      { id: 'teacher-user-b', role: 'teacher', teacherId: 'teacher-profile-b' },
      ['feedback-study-hall.jpg'],
    )
    expect(assignedTeacherAccess.get('feedback-study-hall.jpg')).toEqual({ allowed: true, reason: 'study-hall' })

    const unrelatedParentAccess = await canAccessFeedbackImage(
      studyHallPrisma('student-b'),
      { id: 'parent-b', role: 'parent' },
      ['feedback-study-hall.jpg'],
    )
    expect(unrelatedParentAccess.get('feedback-study-hall.jpg')?.allowed).toBe(false)
  })

  it('does not treat an unrelated FileAsset as public feedback media', async () => {
    const prisma = {
      fileAsset: {
        findMany: vi.fn(async () => [{
          id: 'asset-private',
          storageKey: 'admin-private/report.pdf',
          url: '/api/uploads/admin-private/report.pdf',
          previewUrl: null,
          thumbnailUrl: null,
          ownerType: 'admin_material',
          feedbackId: null,
          uploadedById: 'admin-user',
        }]),
      },
      classroomFeedback: {
        findMany: vi.fn(async () => [{
          id: 'feedback-1',
          teacherId: 'teacher-a',
          status: 'PUBLISHED',
          studentIds: ['student-a'],
          imageUrls: ['admin-private/report.pdf'],
          classLesson: { teacherId: 'teacher-a' },
        }]),
      },
      feedbackParentReadReceipt: {
        findMany: vi.fn(async () => []),
      },
      studyHallHomeworkEntry: { findMany: vi.fn(async () => []) },
      student: { findMany: vi.fn(async () => [{ id: 'student-a' }]) },
    } as unknown as PrismaClient

    const access = await canAccessFeedbackImage(
      prisma,
      { id: 'parent-unrelated', role: 'parent' },
      ['admin-private/report.pdf'],
    )
    expect(access.get('admin-private/report.pdf')).toMatchObject({ allowed: false, reason: 'forbidden' })
  })
})
