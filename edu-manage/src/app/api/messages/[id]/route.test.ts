import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  teacherCanAccessParentMessage: vi.fn(),
}))

vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))
vi.mock('@/lib/parent-message-access', () => ({ teacherCanAccessParentMessage: mocks.teacherCanAccessParentMessage }))

import { GET } from './route'

describe('GET /api/messages/:id read receipts', () => {
  const findUnique = vi.fn()
  const replyUpdateMany = vi.fn()
  const messageUpdate = vi.fn()

  const message = {
    id: 'message-1',
    parentId: 'parent-1',
    status: 'OPEN',
    replies: [
      { id: 'reply-parent', role: 'parent', isReadByParent: true, isReadByTeacher: false },
      { id: 'reply-teacher', role: 'teacher', isReadByParent: false, isReadByTeacher: true },
    ],
  }

  const request = () => new NextRequest('http://localhost/api/messages/message-1')
  const context = { params: Promise.resolve({ id: 'message-1' }) }

  beforeEach(() => {
    vi.clearAllMocks()
    findUnique.mockResolvedValue(message)
    replyUpdateMany.mockResolvedValue({ count: 1 })
    messageUpdate.mockResolvedValue({ ...message, status: 'READ' })
    mocks.getCurrentUser.mockResolvedValue({ id: 'parent-1', role: 'parent' })
    mocks.teacherCanAccessParentMessage.mockResolvedValue(true)
    mocks.getRequestPrisma.mockResolvedValue({
      parentMessage: { findUnique, update: messageUpdate },
      parentMessageReply: { updateMany: replyUpdateMany },
    })
  })

  it('marks teacher replies read when the linked parent opens the conversation', async () => {
    const response = await GET(request(), context)

    expect(response.status).toBe(200)
    expect(replyUpdateMany).toHaveBeenCalledWith({
      where: { messageId: 'message-1', isReadByParent: false },
      data: { isReadByParent: true },
    })
    expect((await response.json()).replies.every((reply: { isReadByParent: boolean }) => reply.isReadByParent)).toBe(true)
  })

  it('marks parent replies read and transitions an open conversation when its teacher opens it', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'teacher-user', role: 'teacher', teacherId: 'teacher-1' })

    const response = await GET(request(), context)

    expect(response.status).toBe(200)
    expect(replyUpdateMany).toHaveBeenCalledWith({
      where: { messageId: 'message-1', isReadByTeacher: false },
      data: { isReadByTeacher: true },
    })
    expect(messageUpdate).toHaveBeenCalledWith({ where: { id: 'message-1' }, data: { status: 'READ' } })
    const body = await response.json()
    expect(body.status).toBe('READ')
    expect(body.replies.every((reply: { isReadByTeacher: boolean }) => reply.isReadByTeacher)).toBe(true)
  })

  it('does not mark a conversation read when the teacher cannot access it', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'teacher-user', role: 'teacher', teacherId: 'other-teacher' })
    mocks.teacherCanAccessParentMessage.mockResolvedValue(false)

    const response = await GET(request(), context)

    expect(response.status).toBe(403)
    expect(replyUpdateMany).not.toHaveBeenCalled()
    expect(messageUpdate).not.toHaveBeenCalled()
  })
})
