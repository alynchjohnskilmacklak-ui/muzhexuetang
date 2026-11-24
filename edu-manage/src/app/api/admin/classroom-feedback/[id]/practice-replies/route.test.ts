import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
  getFeedbackArchiveDetail: vi.fn(),
  createNotification: vi.fn(),
  AuthError: class AuthError extends Error { status = 403 },
  FeedbackArchiveAccessError: class FeedbackArchiveAccessError extends Error { status = 404 },
}))

vi.mock('@/lib/auth/guards', () => ({ requireAdminUser: mocks.requireAdminUser, AuthError: mocks.AuthError }))
vi.mock('@/lib/classroom-feedback/archive', () => ({
  getFeedbackArchiveDetail: mocks.getFeedbackArchiveDetail,
  FeedbackArchiveAccessError: mocks.FeedbackArchiveAccessError,
}))
vi.mock('@/lib/notifications', () => ({ createNotification: mocks.createNotification }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

describe('POST /api/admin/classroom-feedback/[id]/practice-replies', () => {
  const assetFindMany = vi.fn()
  const studentFindFirst = vi.fn()
  const feedbackFindFirst = vi.fn()
  const replyCreate = vi.fn()
  const transaction = vi.fn()
  const parentFindMany = vi.fn()
  const tx = { classroomFeedbackPracticeReply: { create: replyCreate }, user: { findMany: parentFindMany }, notification: { create: vi.fn(), createMany: vi.fn() } }
  const prisma = {
    fileAsset: { findMany: assetFindMany },
    student: { findFirst: studentFindFirst },
    classroomFeedback: { findFirst: feedbackFindFirst },
    $transaction: transaction,
  }

  const call = (body: unknown) => POST(new NextRequest('http://localhost/api/admin/classroom-feedback/feedback-1/practice-replies', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }), { params: Promise.resolve({ id: 'feedback-1' }) })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdminUser.mockResolvedValue({ id: 'admin-1', name: '管理', role: 'admin', division: 'JUNIOR', prisma })
    mocks.getFeedbackArchiveDetail.mockResolvedValue({
      id: 'feedback-1', status: 'PUBLISHED',
      students: [{ id: 'student-1', name: '小明', learningSnapshot: { practiceCheckin: { status: 'ASK_TEACHER', note: '希望老师再讲一次' } } }],
    })
    assetFindMany.mockResolvedValue([{ storageKey: 'admin_practice_reply/photo.webp' }])
    studentFindFirst.mockResolvedValue({ id: 'student-1', name: '小明', parentId: 'parent-1', parentUserId: null })
    feedbackFindFirst.mockResolvedValue({ id: 'feedback-1' })
    replyCreate.mockResolvedValue({
      id: 'reply-1', content: '管理团队会持续跟进。', imageUrls: ['/api/uploads/admin_practice_reply/photo.webp'],
      createdAt: new Date('2026-11-05T03:00:00.000Z'),
    })
    transaction.mockImplementation(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx))
    mocks.createNotification.mockResolvedValue({ id: 'notice-1' })
    parentFindMany.mockResolvedValue([{ id: 'parent-1' }])
  })

  it('stores management guidance and images and notifies only the linked parent', async () => {
    const response = await call({
      studentId: 'student-1',
      content: '管理团队会持续跟进。',
      imageUrls: ['/api/uploads/admin_practice_reply/photo.webp'],
    })

    expect(response.status).toBe(201)
    expect(replyCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ feedbackId: 'feedback-1', studentId: 'student-1', adminUserId: 'admin-1', imageUrls: ['/api/uploads/admin_practice_reply%2Fphoto.webp'] }),
    }))
    expect(mocks.createNotification).toHaveBeenCalledWith(tx, expect.objectContaining({
      userId: 'parent-1', relatedId: 'feedback-1', studentId: 'student-1', pushStatus: 'none',
    }))
    expect(mocks.createNotification).toHaveBeenCalledTimes(1)
  })

  it('rejects a reply when the parent has not submitted a practice check-in', async () => {
    mocks.getFeedbackArchiveDetail.mockResolvedValue({
      id: 'feedback-1', status: 'PUBLISHED',
      students: [{ id: 'student-1', learningSnapshot: { practiceCheckin: null } }],
    })

    const response = await call({ studentId: 'student-1', content: '批示内容' })

    expect(response.status).toBe(409)
    expect(replyCreate).not.toHaveBeenCalled()
  })

  it('rejects an image not uploaded for this student and feedback', async () => {
    assetFindMany.mockResolvedValue([])

    const response = await call({ studentId: 'student-1', content: '', imageUrls: ['/api/uploads/other/photo.webp'] })

    expect(response.status).toBe(400)
    expect(replyCreate).not.toHaveBeenCalled()
    expect(mocks.createNotification).not.toHaveBeenCalled()
  })

  it('does not allow a non-admin account to write a reply', async () => {
    mocks.requireAdminUser.mockRejectedValue(new mocks.AuthError('需要管理员权限'))

    const response = await call({ studentId: 'student-1', content: '批示内容' })

    expect(response.status).toBe(403)
    expect(mocks.getFeedbackArchiveDetail).not.toHaveBeenCalled()
  })
})
