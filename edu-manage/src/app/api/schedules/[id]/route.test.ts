import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'
import { localDateColumnValue } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  isClassLessonInActiveTerm: vi.fn(),
  checkScheduleConflict: vi.fn(),
  recordCourseChangeEvent: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('next-auth', () => ({ default: vi.fn(), CredentialsSignin: class CredentialsSignin extends Error {} }))
vi.mock('next-auth/providers/credentials', () => ({ default: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/admin-term-scope', () => ({ isClassLessonInActiveTerm: mocks.isClassLessonInActiveTerm }))
vi.mock('@/lib/schedule-conflict', () => ({ checkScheduleConflict: mocks.checkScheduleConflict }))
vi.mock('@/lib/course-change-events', () => ({ recordCourseChangeEvent: mocks.recordCourseChangeEvent }))
vi.mock('@/lib/intensive-class', () => ({
  intensiveStudentCountError: vi.fn(() => null),
  toIntensiveTeachingType: vi.fn(() => null),
}))
vi.mock('@/lib/student-hour-snapshot', () => ({ syncStudentHourSnapshot: vi.fn() }))
vi.mock('@/lib/cancel-class-lesson', () => ({
  cancelScheduledLesson: vi.fn(),
  CancelLessonError: class CancelLessonError extends Error {},
}))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) } }))

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
    groupId: 'group-1',
    lessonStudents: [],
    group: {
      termId: 'term-1',
      status: 'ACTIVE',
      roomId: 'room-1',
      intensiveMode: null,
      teachingType: null,
      enrollments: [],
    },
  }
}

function request() {
  return new Request('http://localhost/api/schedules/lesson-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teacherId: 'teacher-1',
      startDate: targetDate,
      startTimeVal: '10:15',
      endTimeVal: '11:15',
    }),
  })
}

function setup(currentOverrides: Record<string, unknown> = {}) {
  const existing = existingLesson()
  const current = {
    division: existing.division,
    teacherId: existing.teacherId,
    subject: existing.subject,
    lessonDate: existing.lessonDate,
    startTime: existing.startTime,
    endTime: existing.endTime,
    status: existing.status,
    groupId: existing.groupId,
    attendanceSubmittedAt: null,
    hoursDeductedAt: null,
    group: { roomId: existing.group.roomId },
    ...currentOverrides,
  }
  const tx = {
    classLesson: {
      findFirst: vi.fn().mockResolvedValue(current),
      update: vi.fn().mockResolvedValue({ id: 'lesson-1', startTime: '10:15', endTime: '11:15' }),
    },
    teacher: { findFirst: vi.fn().mockResolvedValue({ id: 'teacher-1' }) },
    classGroup: { update: vi.fn() },
  }
  const transaction = vi.fn(async (callback: (client: typeof tx) => Promise<unknown>, _options?: unknown) => callback(tx))

  mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
  mocks.isClassLessonInActiveTerm.mockResolvedValue(true)
  mocks.checkScheduleConflict.mockResolvedValue([])
  mocks.recordCourseChangeEvent.mockResolvedValue({ event: { id: 'change-1' } })
  mocks.getRequestPrisma.mockResolvedValue({
    classLesson: { findUnique: vi.fn().mockResolvedValue(existing) },
    $transaction: transaction,
  })

  return { existing, current, tx, transaction }
}

describe('PATCH /api/schedules/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rechecks conflicts inside a serializable transaction before changing the lesson', async () => {
    const { tx, transaction } = setup()
    mocks.checkScheduleConflict
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ type: 'teacher', lessonId: 'lesson-2', courseName: '英语', timeRange: '10:30-11:30' }])

    const response = await PATCH(request() as unknown as NextRequest, { params: Promise.resolve({ id: 'lesson-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload).toMatchObject({ error: '时间冲突' })
    expect(payload.conflicts).toHaveLength(1)
    expect(mocks.checkScheduleConflict).toHaveBeenCalledTimes(2)
    expect(mocks.checkScheduleConflict.mock.calls[1][1]).toBe(tx)
    expect(tx.classLesson.update).not.toHaveBeenCalled()
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' })
  })

  it('rejects a stale lesson edit instead of overwriting a newer change', async () => {
    const { tx } = setup({ startTime: '09:30' })

    const response = await PATCH(request() as unknown as NextRequest, { params: Promise.resolve({ id: 'lesson-1' }) })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload).toMatchObject({ error: '课次已被其他人修改，请刷新后重试' })
    expect(mocks.checkScheduleConflict).toHaveBeenCalledTimes(1)
    expect(tx.classLesson.update).not.toHaveBeenCalled()
  })

  it('saves a valid reschedule and refreshes the parent schedule cache', async () => {
    const { tx, transaction } = setup()

    const response = await PATCH(request() as unknown as NextRequest, { params: Promise.resolve({ id: 'lesson-1' }) })

    expect(response.status).toBe(200)
    expect(tx.classLesson.update).toHaveBeenCalledOnce()
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' })
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/parent/schedule')
  })
})
