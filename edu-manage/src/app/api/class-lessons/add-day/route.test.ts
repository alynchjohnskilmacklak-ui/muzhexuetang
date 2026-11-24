import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { dateRangeDays, localDateColumnValue, todayLocal } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  recordCourseChangeEvent: vi.fn(),
}))

vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/course-change-events', () => ({ recordCourseChangeEvent: mocks.recordCourseChangeEvent }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

const targetDate = dateRangeDays(todayLocal(), 3)[2]
const templateDate = dateRangeDays(todayLocal(), 3)[0]
const replacementDate = dateRangeDays(targetDate, 2)[1]

const group = {
  id: 'group-1',
  name: '周末班',
  status: 'ACTIVE',
  division: 'JUNIOR',
  totalLessons: 2,
  course: { totalLessons: 2, subject: '数学、物理' },
  enrollments: [
    { studentId: 'math-student', subjects: ['数学'], student: { name: '学员甲', parentId: 'parent-1' } },
    { studentId: 'physics-student', subjects: ['物理'], student: { name: '学员乙', parentId: 'parent-2' } },
    { studentId: 'english-student', subjects: ['英语'], student: { name: '学员丙', parentId: 'parent-3' } },
  ],
}

const slots = [
  { teacherId: 'math-teacher', subject: '数学', startTime: '08:30', endTime: '09:10' },
  { teacherId: 'physics-teacher', subject: '物理', startTime: '09:20', endTime: '10:00' },
]

function request(body: Record<string, unknown> = { date: targetDate, division: 'JUNIOR', groupIds: ['group-1'] }) {
  return new NextRequest('http://localhost/api/class-lessons/add-day', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function setup(transactionDayRows: Array<{ id: string }> = []) {
  const targetRows = slots.map((slot, index) => ({ id: `target-${index + 1}`, ...slot }))
  const replacementRows = slots.map((_, index) => ({
    id: `replacement-${index + 1}`,
    lessonDate: localDateColumnValue(replacementDate),
  }))

  const targetLessonFindMany = vi.fn()
    .mockResolvedValueOnce([]) // No lesson exists on the target date during preflight.
    .mockResolvedValueOnce(slots) // Copy the latest template day's time slots.
    .mockResolvedValueOnce(replacementRows) // Find one complete future teaching day to replace.
  const transactionLessonFindMany = vi.fn()
    .mockResolvedValueOnce(transactionDayRows)
    .mockResolvedValueOnce(targetRows)
  const createMany = vi.fn().mockResolvedValue({ count: slots.length })
  const rosterCreateMany = vi.fn().mockResolvedValue({ count: 2 })
  const updateMany = vi.fn().mockResolvedValue({ count: replacementRows.length })
  const transactionCount = vi.fn().mockResolvedValue(40)
  const groupUpdate = vi.fn().mockResolvedValue({ id: group.id })
  const activityLogCreate = vi.fn().mockResolvedValue({ id: 'activity-1' })
  const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({
    classLesson: {
      findMany: transactionLessonFindMany,
      createMany,
      updateMany,
      count: transactionCount,
    },
    classLessonStudent: { createMany: rosterCreateMany },
    classGroup: { update: groupUpdate },
  }))

  mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin' })
  mocks.recordCourseChangeEvent.mockResolvedValue({ recipientCount: 2 })
  mocks.getRequestPrisma.mockResolvedValue({
    classGroup: { findMany: vi.fn().mockResolvedValue([group]) },
    classLesson: {
      findMany: targetLessonFindMany,
      findFirst: vi.fn().mockResolvedValue({ lessonDate: localDateColumnValue(templateDate) }),
      count: vi.fn().mockResolvedValue(39),
    },
    activityLog: { create: activityLogCreate },
    $transaction: transaction,
  })

  return {
    transaction,
    transactionLessonFindMany,
    createMany,
    rosterCreateMany,
    updateMany,
    groupUpdate,
    activityLogCreate,
  }
}

describe('POST /api/class-lessons/add-day', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires an administrator and a valid date before querying or changing schedules', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'teacher-1', role: 'teacher' })

    const forbidden = await POST(request())

    expect(forbidden.status).toBe(403)
    expect(mocks.getRequestPrisma).not.toHaveBeenCalled()

    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin' })
    const db = setup()
    const invalidDate = await POST(request({ date: '2026-02-30', groupIds: ['group-1'] }))

    expect(invalidDate.status).toBe(400)
    expect(db.transaction).not.toHaveBeenCalled()
    expect(db.createMany).not.toHaveBeenCalled()
  })

  it("creates the target day's subject-scoped rosters and replaces one complete future day atomically", async () => {
    const db = setup()

    const response = await POST(request())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      date: targetDate,
      affectedGroups: 1,
      createdLessons: 2,
      replacedLessons: 2,
      replacedGroups: 1,
      notifiedParents: 2,
      partial: false,
    })
    expect(db.transaction).toHaveBeenCalledTimes(1)
    expect(db.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ groupId: 'group-1', subject: '数学', lessonDate: localDateColumnValue(targetDate) }),
        expect.objectContaining({ groupId: 'group-1', subject: '物理', lessonDate: localDateColumnValue(targetDate) }),
      ]),
      skipDuplicates: true,
    })
    expect(db.rosterCreateMany).toHaveBeenCalledWith({
      data: [
        { lessonId: 'target-1', studentId: 'math-student' },
        { lessonId: 'target-2', studentId: 'physics-student' },
      ],
      skipDuplicates: true,
    })
    expect(db.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ['replacement-1', 'replacement-2'] }, status: 'SCHEDULED' },
      data: expect.objectContaining({ status: 'CANCELLED', cancelReason: `计划内调课：替换为 ${targetDate}` }),
    }))
    expect(db.groupUpdate).toHaveBeenCalledWith({ where: { id: 'group-1' }, data: { totalLessons: 40 } })
    expect(db.activityLogCreate).toHaveBeenCalledTimes(1)
  })

  it('does not duplicate a target date that appears after preflight', async () => {
    const db = setup([{ id: 'raced-target-lesson' }])

    const response = await POST(request())
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ createdLessons: 0, replacedLessons: 0, skipped: 1, affectedGroups: 0 })
    expect(db.transaction).toHaveBeenCalledTimes(1)
    expect(db.transactionLessonFindMany).toHaveBeenCalledTimes(1)
    expect(db.createMany).not.toHaveBeenCalled()
    expect(db.updateMany).not.toHaveBeenCalled()
    expect(db.activityLogCreate).not.toHaveBeenCalled()
  })
})
