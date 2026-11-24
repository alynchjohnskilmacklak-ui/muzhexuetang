import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getRequestPrisma: vi.fn() }))
vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

describe('GET /api/parent/unread-counts', () => {
  const notificationCount = vi.fn()
  const notificationGroupBy = vi.fn()
  const studentFindMany = vi.fn()
  const prisma = {
    student: { findMany: studentFindMany },
    examPaper: { count: vi.fn() },
    performancePost: { count: vi.fn() },
    notification: { count: notificationCount, groupBy: notificationGroupBy },
    classroomFeedback: { count: vi.fn() },
    parentMessage: { findMany: vi.fn() },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'parent-1', role: 'parent' })
    mocks.getRequestPrisma.mockResolvedValue(prisma)
    studentFindMany.mockResolvedValue([{ id: 'student-1' }])
    notificationCount.mockResolvedValue(0)
    notificationGroupBy.mockResolvedValue([])
    prisma.examPaper.count.mockResolvedValue(0)
    prisma.performancePost.count.mockResolvedValue(0)
    prisma.classroomFeedback.count.mockResolvedValue(0)
    prisma.parentMessage.findMany.mockResolvedValue([])
  })

  it('uses the current child scope for notification counters and type groups', async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    expect(notificationCount).toHaveBeenCalledTimes(3)
    for (const [args] of notificationCount.mock.calls) {
      expect(args.where).toMatchObject({
        AND: [{
          OR: [
            { studentId: null },
            { student: { is: { OR: [{ parentId: 'parent-1' }, { parentUserId: 'parent-1' }], status: { not: 'INACTIVE' }, deletedAt: null } } },
          ],
        }],
      })
    }
    expect(notificationGroupBy.mock.calls[0][0].where).toMatchObject({
      AND: [{ OR: [{ studentId: null }, { student: { is: expect.any(Object) } }] }],
    })
  })
})
