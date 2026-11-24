import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireCurrentTeacher: vi.fn(),
  resolveTeacherFeedbackCreationScope: vi.fn(),
}))

vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))
vi.mock('@/lib/teacher-portal', () => ({ requireCurrentTeacher: mocks.requireCurrentTeacher }))
vi.mock('@/lib/classroom-feedback/access', () => ({
  resolveTeacherFeedbackCreationScope: mocks.resolveTeacherFeedbackCreationScope,
}))

import { POST as postChatFeedback } from './chat/route'
import { POST as postArticleFeedback } from './article/route'

const attendanceRequiredScope = {
  allowed: false,
  reason: 'attendance-required',
  students: [],
  feedbackGroupId: 'group-1',
  feedbackCourseType: 'GROUP',
  termId: 'term-1',
}

const blockedStudentScope = {
  allowed: false,
  reason: 'blocked',
  students: [],
  feedbackGroupId: 'group-1',
  feedbackCourseType: 'GROUP',
  termId: 'term-1',
}

describe('teacher AI feedback lesson scope', () => {
  it('allows historical lessons through scope validation and still requires submitted attendance for AI chat', async () => {
    const prisma = {}
    mocks.requireCurrentTeacher.mockResolvedValue({
      teacher: { id: 'teacher-1', name: '任老师' },
      prisma,
    })
    mocks.resolveTeacherFeedbackCreationScope.mockResolvedValue(attendanceRequiredScope)

    const response = await postChatFeedback(new NextRequest('http://localhost/api/teacher/ai-feedback/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        classLessonId: 'lesson-not-today',
        studentIds: ['student-1'],
        subject: '数学',
        userInput: '本节课方程知识点掌握情况',
      }),
    }))

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: '本节课考勤尚未提交，完成考勤后才能生成反馈' })
    const scopeInput = mocks.resolveTeacherFeedbackCreationScope.mock.calls.at(-1)?.[1]
    expect(scopeInput).toMatchObject({ classLessonId: 'lesson-not-today', requireAttendanceSubmitted: true })
    expect(scopeInput).not.toHaveProperty('requireTodayLesson')
  })

  it('allows historical lessons through scope validation and still requires submitted attendance for AI articles', async () => {
    const prisma = {}
    mocks.requireCurrentTeacher.mockResolvedValue({
      teacher: { id: 'teacher-1', name: '任老师' },
      prisma,
    })
    mocks.resolveTeacherFeedbackCreationScope.mockResolvedValue(attendanceRequiredScope)

    const response = await postArticleFeedback(new NextRequest('http://localhost/api/teacher/ai-feedback/article', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        classLessonId: 'lesson-not-today',
        studentIds: ['student-1'],
        subject: '数学',
        lessonNote: '一元一次方程的移项与检验',
      }),
    }))

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: '本节课考勤尚未提交，完成考勤后才能生成反馈' })
    const scopeInput = mocks.resolveTeacherFeedbackCreationScope.mock.calls.at(-1)?.[1]
    expect(scopeInput).toMatchObject({ classLessonId: 'lesson-not-today', requireAttendanceSubmitted: true })
    expect(scopeInput).not.toHaveProperty('requireTodayLesson')
  })

  it('explains why AI chat cannot draft feedback for a student on leave or absent', async () => {
    const prisma = {}
    mocks.requireCurrentTeacher.mockResolvedValue({
      teacher: { id: 'teacher-1', name: '任老师' },
      prisma,
    })
    mocks.resolveTeacherFeedbackCreationScope.mockResolvedValue(blockedStudentScope)

    const response = await postChatFeedback(new NextRequest('http://localhost/api/teacher/ai-feedback/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        classLessonId: 'lesson-today',
        studentIds: ['student-on-leave'],
        subject: '数学',
        userInput: '本节课方程知识点掌握情况',
      }),
    }))

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: '该学员本节课已请假或未到校，不能生成课堂反馈' })
    expect(mocks.resolveTeacherFeedbackCreationScope).toHaveBeenCalledWith(prisma, expect.objectContaining({
      classLessonId: 'lesson-today',
      requestedStudentIds: ['student-on-leave'],
      requireAttendanceSubmitted: true,
    }))
  })

  it('explains why AI article generation cannot use a student on leave or absent', async () => {
    const prisma = {}
    mocks.requireCurrentTeacher.mockResolvedValue({
      teacher: { id: 'teacher-1', name: '任老师' },
      prisma,
    })
    mocks.resolveTeacherFeedbackCreationScope.mockResolvedValue(blockedStudentScope)

    const response = await postArticleFeedback(new NextRequest('http://localhost/api/teacher/ai-feedback/article', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        classLessonId: 'lesson-today',
        studentIds: ['student-on-leave'],
        subject: '数学',
        lessonNote: '一元一次方程的移项与检验',
      }),
    }))

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: '该学员本节课已请假或未到校，不能生成课堂反馈' })
    expect(mocks.resolveTeacherFeedbackCreationScope).toHaveBeenCalledWith(prisma, expect.objectContaining({
      classLessonId: 'lesson-today',
      requestedStudentIds: ['student-on-leave'],
      requireAttendanceSubmitted: true,
    }))
  })
})
