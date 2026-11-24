import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getRequestPrisma: vi.fn(),
  requireCurrentTeacher: vi.fn(),
  resolveTeacherFeedbackCreationScope: vi.fn(),
}))
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/teacher-portal', () => ({ requireCurrentTeacher: mocks.requireCurrentTeacher }))
vi.mock('@/lib/classroom-feedback/access', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/classroom-feedback/access')>()
  return { ...actual, resolveTeacherFeedbackCreationScope: mocks.resolveTeacherFeedbackCreationScope }
})

import { POST } from './route'

describe('POST /api/feedback admin lesson scope', () => {
  it('blocks a teacher from publishing until each student has all five required tag categories', async () => {
    const prisma = { $transaction: vi.fn() }
    mocks.auth.mockResolvedValue({ user: { id: 'teacher-user-1', role: 'teacher', name: '任老师' } })
    mocks.getRequestPrisma.mockResolvedValue(prisma)
    mocks.requireCurrentTeacher.mockResolvedValue({
      user: { id: 'teacher-user-1' },
      teacher: { id: 'teacher-1', name: '任老师' },
      prisma,
    })
    mocks.resolveTeacherFeedbackCreationScope.mockResolvedValue({
      allowed: true,
      reason: null,
      students: [{ id: 'student-1', name: '验收学员甲', parentId: null, parentUserId: null }],
      feedbackGroupId: 'group-1',
      feedbackCourseType: 'GROUP',
      termId: 'term-1',
    })

    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        clientRequestId: 'request-789',
        status: 'PUBLISHED',
        classLessonId: 'lesson-today',
        targetType: 'STUDENT',
        studentIds: ['student-1'],
        feedbackCourseType: 'GROUP',
        subject: '数学',
        lessonContent: '本节课完成了一次函数相关练习，并说明了主要解题步骤。',
        studentRatings: [{ studentId: 'student-1', tags: ['专注听讲'] }],
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toContain('验收学员甲还需选择：知识掌握、学习习惯、后续关注、课堂辅导')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('applies the same leave/absence and subject roster guard to administrator publishing', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'admin-1', role: 'admin', name: '管理员' } })
    mocks.resolveTeacherFeedbackCreationScope.mockResolvedValue({
      allowed: false,
      reason: 'blocked',
      students: [],
      feedbackGroupId: 'group-1',
      feedbackCourseType: 'GROUP',
      termId: 'term-1',
    })
    const transaction = vi.fn()
    const prisma = {
      classLesson: {
        findUnique: vi.fn().mockResolvedValue({
          teacherId: 'teacher-1',
          groupId: 'group-1',
          group: { teacherId: 'teacher-1', teacherAssignments: [], intensiveMode: 'NORMAL', course: { type: 'GROUP' } },
        }),
      },
      teacher: { findUnique: vi.fn().mockResolvedValue({ name: '胡老师' }) },
      $transaction: transaction,
    }
    mocks.getRequestPrisma.mockResolvedValue(prisma)

    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        status: 'PUBLISHED',
        classLessonId: 'lesson-1',
        targetType: 'STUDENT',
        studentIds: ['student-on-leave'],
        feedbackCourseType: 'GROUP',
        subject: '数学',
        lessonContent: '今天完成了课堂练习，并能说明关键解题步骤。',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toContain('请假或未到校')
    expect(mocks.resolveTeacherFeedbackCreationScope).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      teacherId: 'teacher-1',
      classLessonId: 'lesson-1',
      requestedStudentIds: ['student-on-leave'],
      requireLesson: true,
      requireAttendanceSubmitted: true,
    }))
    expect(transaction).not.toHaveBeenCalled()
  })

  it('lets a historical lesson reach feedback validation without a today-only guard', async () => {
    const prisma = { $transaction: vi.fn() }
    mocks.auth.mockResolvedValue({ user: { id: 'teacher-user-1', role: 'teacher', name: '任老师' } })
    mocks.getRequestPrisma.mockResolvedValue(prisma)
    mocks.requireCurrentTeacher.mockResolvedValue({
      user: { id: 'teacher-user-1' },
      teacher: { id: 'teacher-1', name: '任老师' },
      prisma,
    })
    mocks.resolveTeacherFeedbackCreationScope.mockResolvedValue({
      allowed: true,
      reason: null,
      students: [{ id: 'student-1', name: '验收学员甲', parentId: null, parentUserId: null }],
      feedbackGroupId: 'group-1',
      feedbackCourseType: 'GROUP',
      termId: 'term-1',
    })

    const request = new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        clientRequestId: 'request-123',
        status: 'PUBLISHED',
        classLessonId: 'lesson-not-today',
        targetType: 'STUDENT',
        studentIds: ['student-1'],
        feedbackCourseType: 'GROUP',
        subject: '数学',
        lessonContent: '本节课完成了课堂练习，并说明了关键解题步骤。',
        overallComment: '学生能够独立完成练习，课堂参与积极。',
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toContain('还需选择')
    const scopeInput = mocks.resolveTeacherFeedbackCreationScope.mock.calls.at(-1)?.[1]
    expect(scopeInput).toMatchObject({ classLessonId: 'lesson-not-today', requireAttendanceSubmitted: true })
    expect(scopeInput).not.toHaveProperty('requireTodayLesson')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('rejects teacher feedback for a student on leave or absent', async () => {
    const prisma = { $transaction: vi.fn() }
    mocks.auth.mockResolvedValue({ user: { id: 'teacher-user-1', role: 'teacher', name: '任老师' } })
    mocks.getRequestPrisma.mockResolvedValue(prisma)
    mocks.requireCurrentTeacher.mockResolvedValue({
      user: { id: 'teacher-user-1' },
      teacher: { id: 'teacher-1', name: '任老师' },
      prisma,
    })
    mocks.resolveTeacherFeedbackCreationScope.mockResolvedValue({
      allowed: false,
      reason: 'blocked',
      students: [],
      feedbackGroupId: 'group-1',
      feedbackCourseType: 'GROUP',
      termId: 'term-1',
    })

    const response = await POST(new NextRequest('http://localhost/api/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        clientRequestId: 'request-456',
        status: 'PUBLISHED',
        classLessonId: 'lesson-today',
        targetType: 'STUDENT',
        studentIds: ['student-on-leave'],
        feedbackCourseType: 'GROUP',
        subject: '数学',
        lessonContent: '本节课完成了课堂练习，并说明了关键解题步骤。',
        overallComment: '学生能够独立完成练习，课堂参与积极。',
      }),
    }))

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: '该学员本节课已请假或未到校，不能提交课堂反馈' })
    expect(mocks.resolveTeacherFeedbackCreationScope).toHaveBeenCalledWith(prisma, expect.objectContaining({
      teacherId: 'teacher-1',
      classLessonId: 'lesson-today',
      requestedStudentIds: ['student-on-leave'],
      requireAttendanceSubmitted: true,
    }))
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
