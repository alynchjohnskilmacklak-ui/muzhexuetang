import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { localDateColumnValue } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  isClassGroupInActiveTerm: vi.fn(),
  recordCourseChangeEvent: vi.fn(),
}))

vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/admin-term-scope', () => ({ isClassGroupInActiveTerm: mocks.isClassGroupInActiveTerm }))
vi.mock('@/lib/course-change-events', () => ({ recordCourseChangeEvent: mocks.recordCourseChangeEvent }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

const groupUpdatedAt = new Date('2026-10-20T08:00:00.000Z')

function group() {
  return {
    id: 'group-1',
    name: '周末数学班',
    division: 'JUNIOR',
    teacherId: 'teacher-1',
    teacher: { id: 'teacher-1', name: '任老师' },
    roomId: 'room-1',
    room: { id: 'room-1', name: '201教室' },
    startDate: localDateColumnValue('2026-11-06'),
    endDate: localDateColumnValue('2026-12-31'),
    status: 'WAITING',
    totalLessons: 1,
    lessonStartTime: '09:00',
    lessonMinutes: 60,
    recurringDays: ['FRI'],
    intensiveMode: 'NORMAL',
    termId: 'term-1',
    updatedAt: groupUpdatedAt,
    course: { isActive: true, subject: '数学', totalLessons: 1 },
    term: {
      id: 'term-1',
      status: 'ACTIVE',
      startDate: localDateColumnValue('2026-10-01'),
      endDate: localDateColumnValue('2026-12-31'),
    },
    teacherAssignments: [{ teacherId: 'teacher-1', subject: '数学', createdAt: groupUpdatedAt }],
    classLessons: [],
  }
}

const template = [{ teacherId: 'teacher-1', subject: '数学', startTime: '09:00', endTime: '10:00' }]

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/class-groups/group-1/generate-lessons', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

function setup({ oldLessons = [], existingLessons = [] }: { oldLessons?: unknown[]; existingLessons?: unknown[] } = {}) {
  const currentGroup = group()
  const lessonFindMany = vi.fn()
    .mockResolvedValueOnce(oldLessons)
    .mockResolvedValueOnce(existingLessons)
    .mockResolvedValueOnce([{ id: 'new-lesson', subject: '数学' }])
    .mockResolvedValueOnce([{ id: 'new-lesson' }])
  const lessonUpdateMany = vi.fn().mockResolvedValue({ count: oldLessons.length })
  const lessonCreateMany = vi.fn().mockResolvedValue({ count: 1 })
  const tx = {
    classGroup: {
      findFirst: vi.fn().mockResolvedValue(currentGroup),
      update: vi.fn(),
    },
    teacher: { findMany: vi.fn().mockResolvedValue([{ id: 'teacher-1', name: '任老师' }]) },
    classLesson: {
      findMany: lessonFindMany,
      updateMany: lessonUpdateMany,
      createMany: lessonCreateMany,
      count: vi.fn().mockResolvedValue(1),
    },
    enrollment: { findMany: vi.fn().mockResolvedValue([{ studentId: 'student-1', subjects: ['数学'] }]) },
    classLessonStudent: { createMany: vi.fn() },
    activityLog: { create: vi.fn() },
    attendance: { deleteMany: vi.fn() },
  }
  const transaction = vi.fn(async (callback: (client: unknown) => Promise<unknown>, _options?: unknown) => callback(tx))
  const prisma = {
    classGroup: { findFirst: vi.fn().mockResolvedValue(currentGroup) },
    $transaction: transaction,
  }

  mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
  mocks.getRequestPrisma.mockResolvedValue(prisma)
  mocks.isClassGroupInActiveTerm.mockResolvedValue(true)
  mocks.recordCourseChangeEvent.mockResolvedValue({ event: { id: 'change-1' }, recipientCount: 1 })

  return { transaction, tx, lessonUpdateMany, lessonCreateMany }
}

describe('POST /api/class-groups/[id]/generate-lessons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-05T06:00:00.000Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('rejects an invalid start date before entering the schedule-generation loop', async () => {
    const { transaction } = setup()

    const response = await POST(request({ startDate: 'not-a-date', recurringDays: ['FRI'], totalDays: 1, scheduleTemplate: template }), {
      params: Promise.resolve({ id: 'group-1' }),
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: '请选择有效的开始日期' })
    expect(transaction).not.toHaveBeenCalled()
  })

  it('rejects generated lessons that already started today', async () => {
    const { transaction } = setup()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-30T06:00:00.000Z'))

    try {
      const response = await POST(request({ startDate: '2026-10-30', recurringDays: ['FRI'], totalDays: 1, scheduleTemplate: template }), {
        params: Promise.resolve({ id: 'group-1' }),
      })

      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ error: '生成的课次不能早于当前时间，历史课程请使用补录流程' })
      expect(transaction).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects a template teacher who is not assigned to the selected subject', async () => {
    const { transaction } = setup()

    const response = await POST(request({
      startDate: '2026-11-06',
      recurringDays: ['FRI'],
      totalDays: 1,
      scheduleTemplate: [{ teacherId: 'teacher-2', subject: '数学', startTime: '09:00', endTime: '10:00' }],
    }), { params: Promise.resolve({ id: 'group-1' }) })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: '课次模板中的教师或科目未分配到该班级' })
    expect(transaction).not.toHaveBeenCalled()
  })

  it('does not replace the old schedule when the generated lessons conflict with another class', async () => {
    const conflict = {
      id: 'other-lesson',
      groupId: 'group-2',
      lessonDate: localDateColumnValue('2026-11-06'),
      teacherId: 'teacher-1',
      subject: '英语',
      startTime: '09:30',
      endTime: '10:30',
      teacher: { id: 'teacher-1', name: '任老师' },
      lessonStudents: [{ studentId: 'student-2' }],
      group: {
        name: '周五英语班',
        teacherId: 'teacher-1',
        course: { subject: '英语' },
        room: { id: 'room-2', name: '202教室' },
        teacher: { id: 'teacher-1', name: '任老师' },
        teacherAssignments: [{ teacherId: 'teacher-1', subject: '英语', teacher: { id: 'teacher-1', name: '任老师' } }],
        enrollments: [{ studentId: 'student-2', subjects: ['英语'] }],
      },
    }
    const { transaction, lessonUpdateMany, lessonCreateMany } = setup({ oldLessons: [{ id: 'old-plan' }], existingLessons: [conflict] })

    const response = await POST(request({ startDate: '2026-11-06', recurringDays: ['FRI'], totalDays: 1, scheduleTemplate: template }), {
      params: Promise.resolve({ id: 'group-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toBe('生成课表存在教师、教室或学员时间冲突，请调整后重试')
    expect(payload.conflicts).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'teacher' })]))
    expect(lessonUpdateMany).not.toHaveBeenCalled()
    expect(lessonCreateMany).not.toHaveBeenCalled()
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
      timeout: 30_000,
    })
  })

  it('preserves replaced lesson records as cancelled rows instead of deleting attendance history', async () => {
    const { tx, lessonUpdateMany, lessonCreateMany } = setup({ oldLessons: [{ id: 'old-plan' }] })

    const response = await POST(request({ startDate: '2026-11-06', recurringDays: ['FRI'], totalDays: 1, scheduleTemplate: template }), {
      params: Promise.resolve({ id: 'group-1' }),
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ count: 1, replacedCount: 1, dates: ['2026-11-06'] })
    expect(lessonUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: { in: ['old-plan'] }, status: 'SCHEDULED' }),
      data: { status: 'CANCELLED', cancelReason: '重新生成课表，原安排已保留供查询' },
    }))
    expect(lessonCreateMany).toHaveBeenCalledTimes(1)
    expect(tx.attendance.deleteMany).not.toHaveBeenCalled()
  })
})
