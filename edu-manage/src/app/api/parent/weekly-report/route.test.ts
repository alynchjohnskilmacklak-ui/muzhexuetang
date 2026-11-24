import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getLocalWeekRange, todayLocal } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getRequestPrisma: vi.fn(), getParentChildren: vi.fn() }))
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/parent-children', async (original) => ({
  ...await original<typeof import('@/lib/parent-children')>(), getParentChildren: mocks.getParentChildren,
}))

import { GET } from './route'

describe('GET /api/parent/weekly-report date and deletion scopes', () => {
  it('uses the Shanghai week range and excludes soft-deleted leave requests', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'parent-1' } })
    mocks.getParentChildren.mockResolvedValue([])
    const db = {
      classLesson: { findMany: vi.fn().mockResolvedValue([]) },
      attendance: { findMany: vi.fn().mockResolvedValue([]) },
      gradeRecord: { findMany: vi.fn().mockResolvedValue([]) },
      notification: { findMany: vi.fn().mockResolvedValue([]) },
      leaveRequest: { findMany: vi.fn().mockResolvedValue([]) },
      classroomFeedback: { findMany: vi.fn().mockResolvedValue([]) },
    }
    mocks.getRequestPrisma.mockResolvedValue(db)

    const response = await GET(new NextRequest('http://localhost/api/parent/weekly-report'))
    const { start, end } = getLocalWeekRange(todayLocal())

    expect(response.status).toBe(200)
    expect(db.classLesson.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ lessonDate: { gte: start, lt: end } }),
    }))
    expect(db.leaveRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ deletedAt: null, leaveDate: { gte: start, lt: end } }),
    }))
  })
})
