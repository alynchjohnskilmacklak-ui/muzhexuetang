import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getRequestPrisma: vi.fn() }))
vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

describe('GET /api/feedback/[id]/messages parent read state', () => {
  const parentMessageFindFirst = vi.fn()
  const replyUpdateMany = vi.fn()
  const transaction = vi.fn()
  const conversation = {
    id: 'message-1',
    replies: [{ id: 'reply-1', role: 'teacher', isReadByParent: true }],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'parent-1', role: 'parent' })
    parentMessageFindFirst.mockResolvedValue({ id: 'message-1' })
    replyUpdateMany.mockResolvedValue({ count: 1 })
    const tx = {
      parentMessageReply: { updateMany: replyUpdateMany },
      parentMessage: { findFirst: vi.fn().mockResolvedValue(conversation) },
    }
    transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx))
    mocks.getRequestPrisma.mockResolvedValue({
      parentMessage: { findFirst: parentMessageFindFirst },
      $transaction: transaction,
    })
  })

  it('marks staff replies as parent-read only for the owning parent conversation', async () => {
    const response = await GET(new NextRequest('http://localhost/api/feedback/feedback-1/messages'), {
      params: Promise.resolve({ id: 'feedback-1' }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ conversation: { id: 'message-1' } })
    expect(parentMessageFindFirst.mock.calls[0][0].where).toEqual({ feedbackId: 'feedback-1', parentId: 'parent-1' })
    expect(replyUpdateMany.mock.calls[0][0].where).toMatchObject({
      messageId: 'message-1',
      role: { not: 'parent' },
      isReadByParent: false,
    })
    expect(transaction).toHaveBeenCalledOnce()
  })

  it('does not mark anything when the parent does not own the feedback conversation', async () => {
    parentMessageFindFirst.mockResolvedValue(null)

    const response = await GET(new NextRequest('http://localhost/api/feedback/foreign/messages'), {
      params: Promise.resolve({ id: 'foreign' }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ conversation: null })
    expect(transaction).not.toHaveBeenCalled()
  })
})
