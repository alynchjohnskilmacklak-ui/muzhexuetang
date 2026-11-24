import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { localDateColumnValue } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  isClassLessonInActiveTerm: vi.fn(),
  findScheduleMoveConflicts: vi.fn(),
  findStudentLessonConflicts: vi.fn(),
  recordCourseChangeEvent: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/admin-term-scope', () => ({ isClassLessonInActiveTerm: mocks.isClassLessonInActiveTerm }))
vi.mock('@/lib/schedule-conflicts', () => ({ findScheduleMoveConflicts: mocks.findScheduleMoveConflicts }))
vi.mock('@/lib/schedule-conflict', () => ({ findStudentLessonConflicts: mocks.findStudentLessonConflicts }))
vi.mock('@/lib/course-change-events', () => ({ recordCourseChangeEvent: mocks.recordCourseChangeEvent }))
vi.mock('@/lib/cancel-class-lesson', () => ({
  cancelScheduledLesson: vi.fn(),
  CancelLessonError: class CancelLessonError extends Error {},
}))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import { PATCH } from './route'

const originalDate = '2099-12-30'
const targetDate = '2099-12-31'

function existingLesson() {
  return {
    id: 'lesson-1',
    division: 'JUNIOR',
    teacherId: 'teacher-1',
    subject: '数学',
    lessonDate: localDateColumnValue(originalDate),
    startTime: '09:00',
    endTime: '10:00',
    status: 'SCHEDULED',
    attendanceSubmittedAt: null,
    hoursDeductedAt: null,
    groupId: 'group-1',
    group: {
      name: '数学班',
      teacherId: 'teacher-1',
      roomId: 'room-1',
      termId: 'term-1',
      status: 'ACTIVE',
      lessonMinutes: 60,
      course: { subject: '数学' },
      teacherAssignments: [],
    },
  }
}

function request() {
  return new NextRequest('http://localhost/api/class-lessons/lesson-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lessonDate: targetDate, startTime: '10:15', endTime: '11:15' }),
  })
}

function setup(currentOverrides: Record<string, unknown> = {}) {
  const lesson = existingLesson()
  const current = {
    teacherId: lesson.teacherId,
    subject: lesson.subject,
    lessonDate: lesson.lessonDate,
    startTime: lesson.startTime,
    endTime: lesson.endTime,
    status: lesson.status,
    groupId: lesson.groupId,
    attendanceSubmittedAt: null,
    hoursDeductedAt: null,
    ...currentOverrides,
  }
  const tx = {
    classLesson: {
      findFirst: vi.fn().mockResolvedValue(current),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({
        lessonDate: localDateColumnValue(targetDate),
        startTime: '10:15',
        endTime: '11:15',
        teacherId: 'teacher-1',
        subject: '数学',
        group: lesson.group,
      }),
    },
    classLessonStudent: { findMany: vi.fn().mockResolvedValue([{ studentId: 'student-1' }]), deleteMany: vi.fn(), createMany: vi.fn() },
    classGroupTeacher: { findMany: vi.fn().mockResolvedValue([]) },
    enrollment: { findMany: vi.fn().mockResolvedValue([]) },
    activityLog: { create: vi.fn() },
  }
  const transaction = vi.fn(async (callback: (client: typeof tx) => Promise<unknown>, _options?: unknown) => callback(tx))
  const prisma = {
    classLesson: {
      findUnique: vi.fn().mockResolvedValue(lesson),
      findMany: vi.fn().mockResolvedValue([]),
    },
    classLessonStudent: { findMany: vi.fn().mockResolvedValue([{ studentId: 'student-1' }]) },
    enrollment: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: transaction,
  }

  mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
  mocks.isClassLessonInActiveTerm.mockResolvedValue(true)
  mocks.findScheduleMoveConflicts.mockReturnValue([])
  mocks.findStudentLessonConflicts.mockResolvedValue([])
  mocks.recordCourseChangeEvent.mockResolvedValue({ event: { id: 'change-1' } })
  mocks.getRequestPrisma.mockResolvedValue(prisma)
  return { lesson, current, tx, transaction, prisma }
}

describe('PATCH /api/class-lessons/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rechecks student conflicts inside a serializable transaction before updating', async () => {
    const { tx, transaction } = setup()
    mocks.findStudentLessonConflicts
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ studentName: '张同学', courseName: '英语', timeRange: '10:30-11:30', lessonId: 'lesson-2' }])

    const response = await PATCH(request(), { params: Promise.resolve({ id: 'lesson-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toContain('学生冲突')
    expect(mocks.findStudentLessonConflicts).toHaveBeenCalledTimes(2)
    expect(mocks.findStudentLessonConflicts.mock.calls[1][0]).toBe(tx)
    expect(tx.classLesson.update).not.toHaveBeenCalled()
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' })
  })

  it('rejects a stale lesson update instead of overwriting a newer change', async () => {
    const { tx } = setup({ startTime: '09:30' })

    const response = await PATCH(request(), { params: Promise.resolve({ id: 'lesson-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe('课次已被其他人修改，请刷新后重试')
    expect(tx.classLesson.update).not.toHaveBeenCalled()
  })
})
