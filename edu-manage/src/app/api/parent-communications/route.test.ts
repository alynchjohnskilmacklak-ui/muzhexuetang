import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getRequestPrisma: vi.fn(), createNotification: vi.fn() }))
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/notifications', () => ({ createNotification: mocks.createNotification }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { DELETE, GET, PATCH, POST } from './route'

describe('GET /api/parent-communications schema-safe notification projection', () => {
  const postFindMany = vi.fn()
  const postCount = vi.fn()
  const paperFindMany = vi.fn()
  const paperCount = vi.fn()
  const notificationFindMany = vi.fn()
  const notificationCount = vi.fn()
  const notificationUpdateMany = vi.fn()
  const notificationFindFirst = vi.fn()
  const postCommentDeleteMany = vi.fn()
  const paperCommentDeleteMany = vi.fn()
  const transaction = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'admin-1', role: 'admin', name: '管理员' } })
    postFindMany.mockResolvedValue([])
    postCount.mockResolvedValue(0)
    paperFindMany.mockResolvedValue([])
    paperCount.mockResolvedValue(0)
    notificationFindMany.mockResolvedValue([])
    notificationCount.mockResolvedValue(0)
    notificationUpdateMany.mockResolvedValue({ count: 1 })
    notificationFindFirst.mockResolvedValue(null)
    postCommentDeleteMany.mockResolvedValue({ count: 1 })
    paperCommentDeleteMany.mockResolvedValue({ count: 1 })
    transaction.mockImplementation(async (callback: (tx: { notification: { updateMany: typeof notificationUpdateMany } }) => Promise<unknown>) => callback({
      notification: { updateMany: notificationUpdateMany },
    }))
    mocks.getRequestPrisma.mockResolvedValue({
      postComment: { findMany: postFindMany, count: postCount, deleteMany: postCommentDeleteMany },
      paperComment: { findMany: paperFindMany, count: paperCount, deleteMany: paperCommentDeleteMany },
      notification: { findMany: notificationFindMany, count: notificationCount, updateMany: notificationUpdateMany, findFirst: notificationFindFirst },
      $transaction: transaction,
    })
  })

  it('selects only fields used by the communications list, not WeCom-only columns', async () => {
    const response = await GET(new NextRequest('http://localhost/api/parent-communications'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ items: [], unreadCount: 0 })
    const select = notificationFindMany.mock.calls[0][0].select
    expect(select).toMatchObject({
      id: true,
      userId: true,
      title: true,
      content: true,
      relatedType: true,
      relatedId: true,
      read: true,
    })
    expect(select).not.toHaveProperty('qywxExternalUserId')
    expect(select).not.toHaveProperty('qywxSenderUserId')
    expect(select).not.toHaveProperty('qywxProcessingAt')
    expect(notificationCount.mock.calls[0][0].where).toMatchObject({
      user: { division: 'JUNIOR' },
      status: 'ACTIVE',
      deletedAt: null,
      read: false,
    })
    expect(postFindMany.mock.calls[0][0].where.post.student.division).toBe('JUNIOR')
    expect(paperFindMany.mock.calls[0][0].where.paper.student.division).toBe('JUNIOR')
    expect(notificationFindMany.mock.calls[0][0].where.user).toEqual({ division: 'JUNIOR' })
  })

  it('scopes the communication list to the administrator division', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'admin-2', role: 'admin', division: 'SENIOR' } })
    await GET(new NextRequest('http://localhost/api/parent-communications'))

    expect(postFindMany.mock.calls[0][0].where.post.student.division).toBe('SENIOR')
    expect(paperFindMany.mock.calls[0][0].where.paper.student.division).toBe('SENIOR')
    expect(notificationFindMany.mock.calls[0][0].where.user).toEqual({ division: 'SENIOR' })
  })

  it('rejects replies to a notification belonging to another division', async () => {
    const response = await POST(new NextRequest('http://localhost/api/parent-communications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'notification', targetId: 'senior-parent-notice', content: '已收到' }),
    }))

    expect(response.status).toBe(404)
    expect(notificationFindFirst.mock.calls[0][0].where).toMatchObject({
      id: 'senior-parent-notice',
      user: { role: 'parent', division: 'JUNIOR' },
    })
  })

  it('deletes only the selected in-division comment, not every comment on its target', async () => {
    const response = await DELETE(new NextRequest('http://localhost/api/parent-communications?type=post&id=comment-1&targetId=post-1', {
      method: 'DELETE',
    }))

    expect(response.status).toBe(200)
    expect(postCommentDeleteMany.mock.calls[0][0].where).toMatchObject({
      id: 'comment-1',
      author: { role: 'parent' },
      post: { student: { division: 'JUNIOR' } },
    })
    expect(postCommentDeleteMany.mock.calls[0][0].where).not.toHaveProperty('postId')
  })

  it('marks only the current admin recipient notification as read from the batched view action', async () => {
    const response = await PATCH(new NextRequest('http://localhost/api/parent-communications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [{ id: 'notice-1', type: 'notification' }] }),
    }))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, updatedCount: 1 })
    expect(notificationUpdateMany.mock.calls[0][0].where).toMatchObject({
      id: 'notice-1',
      userId: 'admin-1',
      status: 'ACTIVE',
      read: false,
    })
    expect(transaction).toHaveBeenCalledOnce()
  })
})
