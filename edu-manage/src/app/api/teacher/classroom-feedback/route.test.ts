import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireCurrentTeacher: vi.fn(),
  resolveTeacherFeedbackCreationScope: vi.fn(),
}))

vi.mock('@/lib/teacher-portal', () => ({ requireCurrentTeacher: mocks.requireCurrentTeacher }))
vi.mock('@/lib/classroom-feedback/single-session-actor', () => ({ requireSingleSessionActor: vi.fn() }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))
vi.mock('@/lib/teacher-salary', () => ({ triggerFeedbackBonus: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/classroom-feedback/access', () => ({
  filterStudentRatingsForStudents: vi.fn(() => ({})),
  feedbackStudentLimitError: vi.fn(() => null),
  hasMeaningfulFeedbackContent: vi.fn(() => true),
  hasRequiredLessonContent: vi.fn(() => true),
  normalizeLessonContent: vi.fn((value: unknown) => String(value || '')),
  parseFeedbackCourseType: vi.fn(() => 'GROUP'),
  resolveTeacherFeedbackCreationScope: mocks.resolveTeacherFeedbackCreationScope,
}))
vi.mock('@/lib/classroom-feedback/create', () => ({ createClassroomFeedbackWithSideEffects: vi.fn() }))
vi.mock('@/lib/classroom-feedback/idempotency', () => ({
  createFeedbackOnce: vi.fn(),
  hashFeedbackPayload: vi.fn(),
  parseFeedbackClientRequestId: vi.fn(() => 'request-1'),
}))

import { POST } from './route'

describe('POST /api/teacher/classroom-feedback day guard', () => {
  it('rejects publishing until every selected student has all five required tag categories', async () => {
    const prisma = { $transaction: vi.fn() }
    mocks.requireCurrentTeacher.mockResolvedValue({
      user: { id: 'user-1' },
      teacher: { id: 'teacher-1', name: '王老师' },
      prisma,
    })
    mocks.resolveTeacherFeedbackCreationScope.mockResolvedValue({
      allowed: true,
      reason: null,
      students: [{ id: 'student-1', name: '验收学员甲' }],
      feedbackGroupId: 'group-1',
      feedbackCourseType: 'GROUP',
      termId: 'term-1',
    })

    const response = await POST(new NextRequest('http://localhost/api/teacher/classroom-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientRequestId: 'request-1',
        classLessonId: 'lesson-today',
        subject: '数学',
        feedbackCourseType: 'GROUP',
        targetType: 'STUDENT',
        status: 'PUBLISHED',
        lessonContent: '本节课完成了一次函数相关练习，并说明了主要解题步骤。',
        studentIds: ['student-1'],
        studentRatings: [{ studentId: 'student-1', tags: ['专注听讲'] }],
      }),
    }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toContain('验收学员甲还需选择：常用、知识掌握、学习习惯、后续关注、课堂辅导')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('lets a historical lesson reach feedback validation without a today-only guard', async () => {
    const prisma = {}
    mocks.requireCurrentTeacher.mockResolvedValue({
      user: { id: 'user-1' },
      teacher: { id: 'teacher-1', name: '王老师' },
      prisma,
    })
    mocks.resolveTeacherFeedbackCreationScope.mockResolvedValue({
      allowed: true,
      reason: null,
      students: [{ id: 'student-1', name: '验收学员甲' }],
      feedbackGroupId: 'group-1',
      feedbackCourseType: 'GROUP',
      termId: 'term-1',
    })

    const response = await POST(new NextRequest('http://localhost/api/teacher/classroom-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientRequestId: 'request-1',
        classLessonId: 'lesson-not-today',
        subject: '数学',
        feedbackCourseType: 'GROUP',
        targetType: 'STUDENT',
        status: 'PUBLISHED',
        lessonContent: '本次课堂练习了相关知识点，并完成了例题讲解。',
        studentIds: ['student-1'],
      }),
    }))
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toContain('还需选择')
    const scopeInput = mocks.resolveTeacherFeedbackCreationScope.mock.calls.at(-1)?.[1]
    expect(scopeInput).toMatchObject({ classLessonId: 'lesson-not-today', requireAttendanceSubmitted: true })
    expect(scopeInput).not.toHaveProperty('requireTodayLesson')
  })

  it('returns a clear conflict when a selected student is on leave or absent', async () => {
    const prisma = {}
    mocks.requireCurrentTeacher.mockResolvedValue({
      user: { id: 'user-1' },
      teacher: { id: 'teacher-1', name: '王老师' },
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

    const response = await POST(new NextRequest('http://localhost/api/teacher/classroom-feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientRequestId: 'request-1',
        classLessonId: 'lesson-today',
        subject: '数学',
        feedbackCourseType: 'GROUP',
        targetType: 'STUDENT',
        status: 'PUBLISHED',
        lessonContent: '本次课堂练习了相关知识点，并完成了例题讲解。',
        studentIds: ['student-on-leave'],
      }),
    }))

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: '该学员本节课已请假或未到校，不能提交课堂反馈' })
    expect(mocks.resolveTeacherFeedbackCreationScope).toHaveBeenCalledWith(prisma, expect.objectContaining({
      classLessonId: 'lesson-today',
      requestedStudentIds: ['student-on-leave'],
      requireAttendanceSubmitted: true,
    }))
  })
})
