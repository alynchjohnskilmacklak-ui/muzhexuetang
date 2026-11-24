import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getRequestPrisma: vi.fn() }))
vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

describe('POST /api/parent/unread-counts/read-all', () => {
  const studentFindMany = vi.fn()
  const classroomFeedbackFindMany = vi.fn()
  const examPaperUpdateMany = vi.fn()
  const performancePostUpdateMany = vi.fn()
  const notificationUpdateMany = vi.fn()
  const parentMessageReplyUpdateMany = vi.fn()
  const feedbackReceiptCreateMany = vi.fn()
  const feedbackReceiptUpdateMany = vi.fn()
  const transaction = vi.fn()
  const tx = {
    examPaper: { updateMany: examPaperUpdateMany },
    performancePost: { updateMany: performancePostUpdateMany },
    notification: { updateMany: notificationUpdateMany },
    parentMessageReply: { updateMany: parentMessageReplyUpdateMany },
    feedbackParentReadReceipt: {
      createMany: feedbackReceiptCreateMany,
      updateMany: feedbackReceiptUpdateMany,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'parent-1', role: 'parent' })
    studentFindMany.mockResolvedValue([{ id: 'student-1' }])
    classroomFeedbackFindMany.mockResolvedValue([{ id: 'feedback-1' }])
    examPaperUpdateMany.mockResolvedValue({ count: 1 })
    performancePostUpdateMany.mockResolvedValue({ count: 2 })
    notificationUpdateMany.mockResolvedValue({ count: 3 })
    parentMessageReplyUpdateMany.mockResolvedValue({ count: 4 })
    feedbackReceiptCreateMany.mockResolvedValue({ count: 1 })
    feedbackReceiptUpdateMany.mockResolvedValue({ count: 0 })
    transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx))
    mocks.getRequestPrisma.mockResolvedValue({
      student: { findMany: studentFindMany },
      classroomFeedback: { findMany: classroomFeedbackFindMany },
      $transaction: transaction,
    })
  })

  it('marks every visible parent unread source as read in one transaction', async () => {
    const response = await POST()

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      success: true,
      updated: { papers: 1, posts: 2, notifications: 3, feedbacks: 1, messages: 4 },
    })
    expect(studentFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ OR: [{ parentId: 'parent-1' }, { parentUserId: 'parent-1' }] }),
    }))
    expect(classroomFeedbackFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ studentIds: { hasSome: ['student-1'] } }),
    }))
    expect(notificationUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        userId: 'parent-1',
        read: false,
        AND: [{
          OR: [
            { studentId: null },
            { student: { is: { OR: [{ parentId: 'parent-1' }, { parentUserId: 'parent-1' }], status: { not: 'INACTIVE' }, deletedAt: null } } },
          ],
        }],
      }),
    }))
    expect(parentMessageReplyUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        isReadByParent: false,
        role: { not: 'parent' },
        message: { parentId: 'parent-1' },
      }),
      data: { isReadByParent: true },
    }))
    expect(feedbackReceiptCreateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [{ feedbackId: 'feedback-1', parentUserId: 'parent-1', readAt: expect.any(Date) }],
      skipDuplicates: true,
    }))
  })

  it('rejects non-parent sessions without touching unread data', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'teacher-1', role: 'teacher' })

    const response = await POST()

    expect(response.status).toBe(403)
    expect(mocks.getRequestPrisma).not.toHaveBeenCalled()
    expect(transaction).not.toHaveBeenCalled()
  })
})
