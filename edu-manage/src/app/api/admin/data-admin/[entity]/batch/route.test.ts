import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn(), mutate: vi.fn(), prisma: vi.fn() }))
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.prisma }))
vi.mock('@/lib/data-admin/mutations', () => ({ DATA_ADMIN_BATCH_ENTITIES: ['students', 'class-groups', 'class-lessons', 'exam-papers', 'materials'], mutateDataAdminRecord: mocks.mutate }))
import { POST } from './route'

describe('batch data administration', () => {
  const notificationFindMany = vi.fn()
  const notificationUpdateMany = vi.fn()
  const activityLogCreate = vi.fn()
  const linkedStudentFindMany = vi.fn()
  const classroomFeedbackFindMany = vi.fn()
  const receiptUpsert = vi.fn()
  const transaction = vi.fn()
  const tx = {
    notification: { findMany: notificationFindMany, updateMany: notificationUpdateMany },
    activityLog: { create: activityLogCreate },
    student: { findMany: linkedStudentFindMany },
    classroomFeedback: { findMany: classroomFeedbackFindMany },
    feedbackParentReadReceipt: { upsert: receiptUpsert },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'admin1', role: 'admin', division: 'JUNIOR' } })
    mocks.prisma.mockResolvedValue({
      student: { findUnique: mocks.find },
      notification: { findMany: notificationFindMany, updateMany: notificationUpdateMany },
      activityLog: { create: activityLogCreate },
      $transaction: transaction,
    })
    mocks.find.mockResolvedValue({ id: 's1' })
    mocks.mutate.mockResolvedValue({ id: 'trash1' })
    notificationFindMany.mockResolvedValue([{
      userId: 'parent-1',
      type: 'CLASSROOM_FEEDBACK',
      relatedType: 'CLASSROOM_FEEDBACK',
      relatedId: 'feedback-1',
      user: { role: 'parent' },
    }])
    notificationUpdateMany.mockResolvedValue({ count: 1 })
    activityLogCreate.mockResolvedValue({})
    linkedStudentFindMany.mockResolvedValue([{ id: 'student-1' }])
    classroomFeedbackFindMany.mockResolvedValue([{ id: 'feedback-1' }])
    receiptUpsert.mockResolvedValue({})
    transaction.mockImplementation(async (callback: (client: typeof tx) => unknown) => callback(tx))
  })
  const request = (payload: unknown) => new NextRequest('http://localhost/api/admin/data-admin/students/batch', { method: 'POST', body: JSON.stringify(payload) })
  const params = { params: Promise.resolve({ entity: 'students' }) }
  it('returns exact successful and failed IDs instead of pretending all succeeded', async () => {
    mocks.mutate.mockImplementation(async (_db, _entity, id) => { if (id === 's2') throw new Error('关联数据冲突') })
    const response = await POST(request({ action: 'softDelete', ids: ['s1', 's2', 's1'] }), params)
    expect(await response.json()).toMatchObject({ success: false, partial: true, count: 1, succeededIds: ['s1'], failures: [{ id: 's2', error: '关联数据冲突' }] })
    expect(mocks.mutate).toHaveBeenCalledTimes(2)
  })
  it('never mutates a record outside the session division', async () => {
    mocks.find.mockResolvedValue(null)
    const response = await POST(request({ action: 'restore', ids: ['senior-student'] }), params)
    expect(await response.json()).toMatchObject({ success: false, count: 0, failures: [{ id: 'senior-student', error: '记录不存在或不在当前学部' }] })
    expect(mocks.find).toHaveBeenCalledWith({ where: { id: 'senior-student', division: 'JUNIOR' } })
    expect(mocks.mutate).not.toHaveBeenCalled()
  })
  it('rejects a non-admin before querying data', async () => {
    mocks.auth.mockResolvedValue({ user: { role: 'teacher' } })
    expect((await POST(request({ action: 'softDelete', ids: ['s1'] }), params)).status).toBe(403)
    expect(mocks.prisma).not.toHaveBeenCalled()
  })
  it('rejects null request bodies rather than failing with an unhandled exception', async () => {
    expect((await POST(request(null), params)).status).toBe(400)
    expect(mocks.mutate).not.toHaveBeenCalled()
  })

  it('syncs parent classroom-feedback receipts when an admin marks notification rows read', async () => {
    const response = await POST(request({ action: 'markRead', ids: ['feedback-notification-1'] }), {
      params: Promise.resolve({ entity: 'notifications' }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, count: 1 })
    expect(notificationFindMany.mock.calls[0][0]).toMatchObject({
      where: { id: { in: ['feedback-notification-1'] }, deletedAt: null, student: { division: 'JUNIOR' } },
      select: { user: { select: { role: true } }, relatedType: true, relatedId: true },
    })
    expect(receiptUpsert).toHaveBeenCalledWith({
      where: { feedbackId_parentUserId: { feedbackId: 'feedback-1', parentUserId: 'parent-1' } },
      create: expect.objectContaining({ readAt: expect.any(Date) }),
      update: expect.objectContaining({ readAt: expect.any(Date) }),
    })
  })
})
