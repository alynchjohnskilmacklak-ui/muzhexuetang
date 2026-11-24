import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getRequestPrisma: vi.fn() }))
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

describe('POST /api/performance/read', () => {
  const postFindMany = vi.fn()
  const postUpdateMany = vi.fn()
  const notificationUpdateMany = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'parent-1', role: 'parent' } })
    postFindMany.mockResolvedValue([{ id: 'post-1' }])
    postUpdateMany.mockResolvedValue({ count: 1 })
    notificationUpdateMany.mockResolvedValue({ count: 1 })
    mocks.getRequestPrisma.mockResolvedValue({
      $transaction: (callback: (tx: unknown) => unknown) => callback({
        performancePost: { findMany: postFindMany, updateMany: postUpdateMany },
        notification: { updateMany: notificationUpdateMany },
      }),
    })
  })

  it('marks linked performance posts and their notifications read in one transaction', async () => {
    const response = await POST(new NextRequest('http://localhost/api/performance/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postIds: ['post-1', 'foreign-post'] }),
    }))

    expect(response.status).toBe(200)
    expect(postFindMany.mock.calls[0][0].where).toMatchObject({
      id: { in: ['post-1', 'foreign-post'] },
      student: { OR: [{ parentId: 'parent-1' }, { parentUserId: 'parent-1' }] },
    })
    expect(postUpdateMany.mock.calls[0][0].where.id).toEqual({ in: ['post-1'] })
    expect(notificationUpdateMany.mock.calls[0][0].where).toMatchObject({
      userId: 'parent-1',
      read: false,
      OR: expect.arrayContaining([
        expect.objectContaining({ relatedId: 'post-1' }),
        expect.objectContaining({ href: { contains: 'feedbackId=post-1' } }),
      ]),
    })
    expect(await response.json()).toEqual({ updated: 1 })
  })

  it('rejects non-parent users', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'teacher-1', role: 'teacher' } })

    const response = await POST(new NextRequest('http://localhost/api/performance/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postIds: ['post-1'] }),
    }))

    expect(response.status).toBe(403)
    expect(mocks.getRequestPrisma).not.toHaveBeenCalled()
  })
})
