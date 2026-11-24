import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { localDateColumnValue } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  isClassGroupInActiveTerm: vi.fn(),
  syncStudentHourSnapshot: vi.fn(),
}))

vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/admin-term-scope', () => ({ isClassGroupInActiveTerm: mocks.isClassGroupInActiveTerm }))
vi.mock('@/lib/student-hour-snapshot', () => ({ syncStudentHourSnapshot: mocks.syncStudentHourSnapshot }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

const groupId = 'group-1'
const lesson = (id: string, date: string, startTime: string, subject: string | null, overrides: Record<string, unknown> = {}) => ({
  lessonDate: localDateColumnValue(date),
  startTime,
  subject,
  status: 'SCHEDULED',
  deletedAt: null,
  id,
  ...overrides,
})

describe('POST /api/class-groups/[id]/sync-hours', () => {
  beforeEach(() => vi.clearAllMocks())

  it('按报名科目和插班时间计算余额，并同步报名、流水和学生汇总', async () => {
    const mathEnrollment = {
      id: 'enrollment-math', studentId: 'student-math', subjects: ['数学'],
      enrolledAt: new Date('2026-10-12T08:00:00+08:00'), totalHours: 3, usedHours: 3, remainHours: 0,
    }
    const englishEnrollment = {
      id: 'enrollment-english', studentId: 'student-english', subjects: ['英语'],
      enrolledAt: new Date('2026-10-12T08:00:00+08:00'), totalHours: 2.5, usedHours: 2, remainHours: 0.5,
    }
    const lessons = [
      lesson('math-default-1', '2026-11-07', '09:00', null),
      lesson('math-explicit', '2026-11-14', '09:00', '数学'),
      lesson('english', '2026-11-07', '10:00', '英语'),
      lesson('before-enrollment', '2026-10-10', '09:00', '数学'),
      lesson('completed', '2026-11-21', '09:00', '数学', { status: 'COMPLETED' }),
      lesson('cancelled', '2026-11-28', '09:00', '数学', { status: 'CANCELLED' }),
      lesson('deleted', '2026-12-05', '09:00', '数学', { deletedAt: new Date() }),
    ]
    const enrollmentUpdate = vi.fn()
    const hourTransactionCreate = vi.fn()
    const tx = {
      enrollment: { update: enrollmentUpdate },
      hourTransaction: { create: hourTransactionCreate },
      activityLog: { create: vi.fn() },
    }
    const prisma = {
      classGroup: {
        findUnique: vi.fn().mockResolvedValue({
          id: groupId,
          name: '周末综合班',
          startDate: localDateColumnValue('2026-10-01'),
          lessonMinutes: 60,
          course: { subject: '数学' },
        }),
      },
      enrollment: { findMany: vi.fn().mockResolvedValue([mathEnrollment, englishEnrollment]) },
      classLesson: { findMany: vi.fn().mockResolvedValue(lessons) },
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    }
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
    mocks.getRequestPrisma.mockResolvedValue(prisma)
    mocks.isClassGroupInActiveTerm.mockResolvedValue(true)

    const response = await POST(new NextRequest(`http://localhost/api/class-groups/${groupId}/sync-hours`, { method: 'POST' }), {
      params: Promise.resolve({ id: groupId }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ updated: 2 })
    expect(enrollmentUpdate).toHaveBeenNthCalledWith(1, {
      where: { id: mathEnrollment.id },
      data: { remainHours: 2, totalHours: 5 },
    })
    expect(enrollmentUpdate).toHaveBeenNthCalledWith(2, {
      where: { id: englishEnrollment.id },
      data: { remainHours: 1, totalHours: 3 },
    })
    expect(hourTransactionCreate).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({ studentId: 'student-math', amount: 2, beforeHours: 0, afterHours: 2 }),
    }))
    expect(hourTransactionCreate).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({ studentId: 'student-english', amount: 0.5, beforeHours: 0.5, afterHours: 1 }),
    }))
    expect(mocks.syncStudentHourSnapshot).toHaveBeenCalledTimes(2)
    expect(mocks.syncStudentHourSnapshot).toHaveBeenCalledWith(tx, 'student-math')
    expect(mocks.syncStudentHourSnapshot).toHaveBeenCalledWith(tx, 'student-english')
  })

  it('科目缺失的插班记录不会被错误校准为零余额', async () => {
    const classLessonFindMany = vi.fn()
    const transaction = vi.fn()
    const prisma = {
      classGroup: {
        findUnique: vi.fn().mockResolvedValue({
          id: groupId,
          name: '周末数学班',
          startDate: localDateColumnValue('2026-10-01'),
          lessonMinutes: 60,
          course: { subject: '数学' },
        }),
      },
      enrollment: {
        findMany: vi.fn().mockResolvedValue([{
          id: 'enrollment-legacy',
          studentId: 'student-legacy',
          subjects: [],
          enrolledAt: new Date('2026-10-12T08:00:00+08:00'),
          totalHours: 20,
          usedHours: 5,
          remainHours: 15,
        }]),
      },
      classLesson: { findMany: classLessonFindMany },
      $transaction: transaction,
    }
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
    mocks.getRequestPrisma.mockResolvedValue(prisma)
    mocks.isClassGroupInActiveTerm.mockResolvedValue(true)

    const response = await POST(new NextRequest(`http://localhost/api/class-groups/${groupId}/sync-hours`, { method: 'POST' }), {
      params: Promise.resolve({ id: groupId }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      updated: 0,
      skipped: 1,
      skippedStudentIds: ['student-legacy'],
      message: '没有可校准的科目数据，另有 1 位学员未填写报名科目，余额未修改',
    })
    expect(classLessonFindMany).not.toHaveBeenCalled()
    expect(transaction).not.toHaveBeenCalled()
  })
})
