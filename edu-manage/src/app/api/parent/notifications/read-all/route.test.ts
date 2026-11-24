import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getRequestPrisma: vi.fn() }))
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { PATCH } from './route'

describe('PATCH /api/parent/notifications/read-all', () => {
  const notificationFindMany = vi.fn()
  const notificationUpdateMany = vi.fn()
  const notificationCount = vi.fn()
  const studentFindMany = vi.fn()
  const classroomFeedbackFindMany = vi.fn()
  const receiptUpsert = vi.fn()
  const transaction = vi.fn()
  const tx = {
    notification: { findMany: notificationFindMany, updateMany: notificationUpdateMany },
    student: { findMany: studentFindMany },
    classroomFeedback: { findMany: classroomFeedbackFindMany },
    feedbackParentReadReceipt: { upsert: receiptUpsert },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'parent-1', role: 'parent' } })
    mocks.getRequestPrisma.mockResolvedValue({
      notification: { count: notificationCount },
      $transaction: transaction,
    })
    notificationFindMany.mockResolvedValue([
      { type: 'CLASSROOM_FEEDBACK', relatedType: 'CLASSROOM_FEEDBACK', relatedId: 'feedback-1' },
      { type: 'SYSTEM', relatedType: 'SYSTEM', relatedId: null },
    ])
    notificationUpdateMany.mockResolvedValue({ count: 2 })
    notificationCount.mockResolvedValue(3)
    studentFindMany.mockResolvedValue([{ id: 'student-1' }])
    classroomFeedbackFindMany.mockResolvedValue([{ id: 'feedback-1' }])
    receiptUpsert.mockResolvedValue({})
    transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx))
  })

  it('marks notifications and linked classroom feedback read in one transaction', async () => {
    const response = await PATCH()

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, updatedCount: 2, unreadCount: 3 })
    expect(notificationFindMany.mock.calls[0][0].where).toMatchObject({
      userId: 'parent-1',
      read: false,
      AND: [{
        OR: [
          { studentId: null },
          { student: { is: { OR: [{ parentId: 'parent-1' }, { parentUserId: 'parent-1' }], status: { not: 'INACTIVE' }, deletedAt: null } } },
        ],
      }],
    })
    expect(notificationUpdateMany.mock.calls[0][0].where).toMatchObject({
      AND: [{ OR: [{ studentId: null }, { student: { is: expect.any(Object) } }] }],
    })
    expect(notificationUpdateMany.mock.calls[0][0].data).toMatchObject({ read: true, readAt: expect.any(Date) })
    expect(receiptUpsert).toHaveBeenCalledWith({
      where: { feedbackId_parentUserId: { feedbackId: 'feedback-1', parentUserId: 'parent-1' } },
      create: expect.objectContaining({ readAt: expect.any(Date) }),
      update: expect.objectContaining({ readAt: expect.any(Date) }),
    })
    expect(transaction).toHaveBeenCalledOnce()
  })

  it('rejects non-parent sessions before querying notifications', async () => {
    mocks.auth.mockResolvedValue({ user: { id: 'teacher-1', role: 'teacher' } })

    const response = await PATCH()

    expect(response.status).toBe(403)
    expect(mocks.getRequestPrisma).not.toHaveBeenCalled()
  })

  it('rejects anonymous sessions before querying notifications', async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await PATCH()

    expect(response.status).toBe(401)
    expect(mocks.getRequestPrisma).not.toHaveBeenCalled()
  })
})
