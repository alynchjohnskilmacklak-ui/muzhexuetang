import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getRequestPrisma: vi.fn() }))
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

describe('POST /api/parent/notifications/mark-read', () => {
  const updateMany = vi.fn()
  const notificationFindMany = vi.fn()
  const count = vi.fn()
  const studentFindMany = vi.fn()
  const classroomFeedbackFindMany = vi.fn()
  const feedbackReceiptUpsert = vi.fn()
  const performancePostUpdateMany = vi.fn()
  const examPaperUpdateMany = vi.fn()
  const parentMessageReplyUpdateMany = vi.fn()
  const transaction = vi.fn()
  const tx = {
    notification: { findMany: notificationFindMany, updateMany },
    student: { findMany: studentFindMany },
    classroomFeedback: { findMany: classroomFeedbackFindMany },
    feedbackParentReadReceipt: { upsert: feedbackReceiptUpsert },
    performancePost: { updateMany: performancePostUpdateMany },
    examPaper: { updateMany: examPaperUpdateMany },
    parentMessageReply: { updateMany: parentMessageReplyUpdateMany },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'parent-1', role: 'parent' } })
    updateMany.mockResolvedValue({ count: 2 })
    notificationFindMany.mockResolvedValue([])
    count.mockResolvedValue(4)
    studentFindMany.mockResolvedValue([{ id: 'student-1' }])
    classroomFeedbackFindMany.mockResolvedValue([])
    feedbackReceiptUpsert.mockResolvedValue({})
    performancePostUpdateMany.mockResolvedValue({ count: 1 })
    examPaperUpdateMany.mockResolvedValue({ count: 1 })
    parentMessageReplyUpdateMany.mockResolvedValue({ count: 1 })
    transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx))
    mocks.getRequestPrisma.mockResolvedValue({ notification: { updateMany, findMany: notificationFindMany, count }, $transaction: transaction })
  })

  const request = (body: Record<string, unknown>) => new NextRequest(
    'http://localhost/api/parent/notifications/mark-read',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  )

  it('marks only archived notifications for the parent when the archived page selects all', async () => {
    const response = await POST(request({ all: true, archived: true }))

    expect(response.status).toBe(200)
    expect(updateMany.mock.calls[0][0].where).toMatchObject({
      userId: 'parent-1',
      status: 'ARCHIVED',
      deletedAt: null,
      read: false,
      AND: [{
        OR: [
          { studentId: null },
          { student: { is: { OR: [{ parentId: 'parent-1' }, { parentUserId: 'parent-1' }], status: { not: 'INACTIVE' }, deletedAt: null } } },
        ],
      }],
    })
    expect(await response.json()).toMatchObject({ success: true, updatedCount: 2, unreadCount: 4 })
  })

  it('keeps category read actions scoped to archived notifications on the archived page', async () => {
    const response = await POST(request({ relatedTypes: ['CLASSROOM_FEEDBACK'], archived: true }))

    expect(response.status).toBe(200)
    expect(updateMany.mock.calls[0][0].where).toMatchObject({
      userId: 'parent-1',
      status: 'ARCHIVED',
      deletedAt: null,
      read: false,
      AND: [
        {
          OR: [
            { studentId: null },
            { student: { is: { OR: [{ parentId: 'parent-1' }, { parentUserId: 'parent-1' }], status: { not: 'INACTIVE' }, deletedAt: null } } },
          ],
        },
        { OR: [
          { relatedType: { in: ['CLASSROOM_FEEDBACK'] } },
          { relatedType: null, type: { in: ['CLASSROOM_FEEDBACK'] } },
        ] },
      ],
    })
  })

  it('syncs feedback read receipts when a parent marks feedback notifications read', async () => {
    notificationFindMany.mockResolvedValue([
      { type: 'CLASSROOM_FEEDBACK', relatedType: 'CLASSROOM_FEEDBACK', relatedId: 'feedback-1' },
    ])
    classroomFeedbackFindMany.mockResolvedValue([{ id: 'feedback-1' }])

    const response = await POST(request({ relatedTypes: ['CLASSROOM_FEEDBACK'] }))

    expect(response.status).toBe(200)
    expect(feedbackReceiptUpsert).toHaveBeenCalledWith({
      where: { feedbackId_parentUserId: { feedbackId: 'feedback-1', parentUserId: 'parent-1' } },
      create: expect.objectContaining({ readAt: expect.any(Date) }),
      update: expect.objectContaining({ readAt: expect.any(Date) }),
    })
  })

  it('syncs linked growth posts, exam papers, and message replies when notifications are read', async () => {
    notificationFindMany.mockResolvedValue([
      { type: 'PERFORMANCE_FEEDBACK', relatedType: 'PERFORMANCE_FEEDBACK', relatedId: 'post-1' },
      { type: 'PAPER_PUBLISHED', relatedType: 'PAPER_PUBLISHED', relatedId: 'paper-1' },
      { type: 'PARENT_MESSAGE_REPLY', relatedType: 'PARENT_MESSAGE', relatedId: 'message-1' },
      { type: 'PARENT_MESSAGE_REPLY', relatedType: null, relatedId: 'message-2' },
    ])

    const response = await POST(request({ all: true }))

    expect(response.status).toBe(200)
    expect(performancePostUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: { in: ['post-1'] }, isReadByParent: false }),
      data: { isReadByParent: true },
    }))
    expect(examPaperUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: { in: ['paper-1'] }, isReadByParent: false }),
      data: expect.objectContaining({ isReadByParent: true, readAt: expect.any(Date) }),
    }))
    expect(parentMessageReplyUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        isReadByParent: false,
        role: { not: 'parent' },
        message: { id: { in: ['message-1', 'message-2'] }, parentId: 'parent-1' },
      }),
      data: { isReadByParent: true },
    }))
  })

  it('does not query or update notifications for anonymous requests', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await POST(request({ all: true, archived: true }))

    expect(response.status).toBe(401)
    expect(mocks.getRequestPrisma).not.toHaveBeenCalled()
    expect(updateMany).not.toHaveBeenCalled()
  })

  it('rejects sessions without an explicit parent role', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'user-1' } })

    const response = await POST(request({ all: true }))

    expect(response.status).toBe(403)
    expect(mocks.getRequestPrisma).not.toHaveBeenCalled()
  })
})
