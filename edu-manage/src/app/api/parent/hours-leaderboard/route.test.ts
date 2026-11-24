import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getLocalDayRange, todayLocal } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getRequestPrisma: vi.fn(), getParentChildren: vi.fn() }))
vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/parent-children', () => ({
  getParentChildren: mocks.getParentChildren,
  findParentChild: (children: Array<{ id: string; recordIds: string[] }>, requested: string | null) =>
    children.find((child) => requested && child.recordIds.includes(requested)) || null,
}))

import { GET } from './route'

describe('GET /api/parent/hours-leaderboard scope', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses Shanghai month boundaries and compares only same-group, same-subject lesson rosters', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'parent-1', role: 'parent' })
    mocks.getParentChildren.mockResolvedValue([{
      id: 'child-1', name: '学员甲', recordIds: ['child-1'],
    }])
    const lessonDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const groupRoster = [
      { studentId: 'child-1', subjects: ['数学'] },
      { studentId: 'peer-math', subjects: ['数学'] },
      { studentId: 'peer-english', subjects: ['英语'] },
    ]
    const db = {
      enrollment: {
        findMany: vi.fn()
          .mockResolvedValueOnce([{ studentId: 'child-1', groupId: 'group-1', subjects: ['数学'] }])
          .mockResolvedValueOnce([
            { groupId: 'group-1', subjects: ['数学'], student: { id: 'child-1', name: '学员甲' } },
            { groupId: 'group-1', subjects: ['数学'], student: { id: 'peer-math', name: '王小明' } },
            { groupId: 'group-1', subjects: ['英语'], student: { id: 'peer-english', name: '李小红' } },
          ]),
      },
      attendance: {
        findMany: vi.fn().mockResolvedValue([
          {
            studentId: 'child-1', hoursDeducted: 1.5,
            lesson: { lessonDate, subject: '数学', lessonStudents: [{ studentId: 'child-1' }], group: { enrollments: groupRoster } },
          },
          {
            studentId: 'peer-math', hoursDeducted: 2,
            lesson: { lessonDate, subject: '数学', lessonStudents: [{ studentId: 'peer-math' }], group: { enrollments: groupRoster } },
          },
          {
            studentId: 'peer-english', hoursDeducted: 8,
            lesson: { lessonDate, subject: '英语', lessonStudents: [{ studentId: 'peer-english' }], group: { enrollments: groupRoster } },
          },
        ]),
      },
    }
    mocks.getRequestPrisma.mockResolvedValue(db)

    const response = await GET(new NextRequest('http://localhost/api/parent/hours-leaderboard?studentId=child-1'))
    const payload = await response.json()
    const monthKey = todayLocal().slice(0, 7)
    const monthStart = getLocalDayRange(`${monthKey}-01`).start
    const [year, month] = monthKey.split('-').map(Number)
    const nextMonthKey = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7)
    const monthEnd = getLocalDayRange(`${nextMonthKey}-01`).start

    expect(response.status).toBe(200)
    expect(db.attendance.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        deletedAt: null,
        lesson: expect.objectContaining({
          groupId: { in: ['group-1'] },
          lessonDate: { gte: monthStart, lt: monthEnd },
          deletedAt: null,
        }),
      }),
    }))
    expect(payload).toMatchObject({ studentName: '学员甲', mineHours: 1.5, hasData: true })
    expect(payload.classmates).toEqual([{ maskedName: '王*明', hours: 2 }])
  })

  it('rejects non-parent sessions', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'teacher-1', role: 'teacher' })

    const response = await GET(new NextRequest('http://localhost/api/parent/hours-leaderboard'))

    expect(response.status).toBe(403)
    expect(mocks.getRequestPrisma).not.toHaveBeenCalled()
  })
})
