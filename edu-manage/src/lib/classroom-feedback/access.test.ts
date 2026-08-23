import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import {
  canAccessFeedbackImage,
  canCreateFeedback,
  canViewFeedback,
  hasRequiredLessonContent,
  hasMeaningfulFeedbackContent,
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
      requestedStudentIds: ['student-b'],
      submittedCourseType: 'GROUP',
    })).resolves.toMatchObject({ allowed: false, reason: 'student' })
  })

  it('redacts every other student and rating from a parent DTO', () => {
    const result = redactFeedbackForParent({
      id: 'feedback-1',
      studentIds: ['student-a', 'student-b', 'student-c'],
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
  function imagePrisma() {
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
          studentIds: ['student-a'],
          imageUrls: ['feedback-1.jpg'],
          classLesson: { teacherId: 'teacher-a' },
        }]),
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
})
