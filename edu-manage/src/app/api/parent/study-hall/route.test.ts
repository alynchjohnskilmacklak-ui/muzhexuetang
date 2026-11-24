import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ requireParentUser: vi.fn() }))
vi.mock('@/lib/auth/guards', () => ({ requireParentUser: mocks.requireParentUser }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { PATCH } from './route'

describe('PATCH /api/parent/study-hall', () => {
  const entryFindFirst = vi.fn()
  const notificationUpdateMany = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    entryFindFirst.mockResolvedValue({ id: 'entry-1' })
    notificationUpdateMany.mockResolvedValue({ count: 1 })
    mocks.requireParentUser.mockResolvedValue({
      id: 'parent-1',
      prisma: {
        studyHallHomeworkEntry: { findFirst: entryFindFirst },
        notification: { updateMany: notificationUpdateMany },
      },
    })
  })

  it('only marks notices for a currently linked child as read', async () => {
    const response = await PATCH(new NextRequest('http://localhost/api/parent/study-hall', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entryId: 'entry-1' }),
    }))

    expect(response.status).toBe(200)
    expect(notificationUpdateMany.mock.calls[0][0].where).toMatchObject({
      userId: 'parent-1',
      relatedType: 'STUDY_HALL_HOMEWORK',
      relatedId: 'entry-1',
      AND: [{
        OR: [
          { studentId: null },
          { student: { is: { OR: [{ parentId: 'parent-1' }, { parentUserId: 'parent-1' }], status: { not: 'INACTIVE' }, deletedAt: null } } },
        ],
      }],
    })
  })
})
