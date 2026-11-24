import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getRequestPrisma: vi.fn() }))
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

describe('GET /api/parent/notifications/unread-count', () => {
  const count = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'parent-1', role: 'parent' } })
    count.mockResolvedValue(2)
    mocks.getRequestPrisma.mockResolvedValue({ notification: { count } })
  })

  it('counts only generic notices and notices for currently linked active children', async () => {
    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ count: 2 })
    expect(count.mock.calls[0][0].where).toMatchObject({
      userId: 'parent-1',
      AND: [{
        OR: [
          { studentId: null },
          { student: { is: { OR: [{ parentId: 'parent-1' }, { parentUserId: 'parent-1' }], status: { not: 'INACTIVE' }, deletedAt: null } } },
        ],
      }],
    })
  })
})
