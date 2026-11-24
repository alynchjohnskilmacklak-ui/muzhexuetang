import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireAdminUser: vi.fn(),
  getFeedbackArchiveDetail: vi.fn(),
  evaluationFindMany: vi.fn(),
  practiceReplyFindMany: vi.fn(),
  AuthError: class AuthError extends Error {
    status = 403
  },
}))

vi.mock('@/lib/auth/guards', () => ({
  requireAdminUser: mocks.requireAdminUser,
  AuthError: mocks.AuthError,
}))
vi.mock('@/lib/classroom-feedback/archive', () => ({
  FeedbackArchiveAccessError: class FeedbackArchiveAccessError extends Error {
    status = 404
  },
  getFeedbackArchiveDetail: mocks.getFeedbackArchiveDetail,
}))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

describe('GET /api/admin/classroom-feedback/[id]/detail parent evaluations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdminUser.mockResolvedValue({
      id: 'admin-1',
      prisma: {
        parentClassroomFeedbackEvaluation: { findMany: mocks.evaluationFindMany },
        classroomFeedbackPracticeReply: { findMany: mocks.practiceReplyFindMany },
      },
    })
    mocks.getFeedbackArchiveDetail.mockResolvedValue({
      id: 'feedback-1',
      teacher: { name: '李老师' },
      students: [{ id: 'student-1', name: '小明' }],
    })
    mocks.evaluationFindMany.mockResolvedValue([{
      id: 'evaluation-1',
      satisfied: false,
      reason: '希望课堂讲解能再具体一些',
      createdAt: new Date('2026-11-05T02:00:00.000Z'),
      parent: { name: '王女士' },
    }])
    mocks.practiceReplyFindMany.mockResolvedValue([{
      id: 'reply-1', studentId: 'student-1', content: '感谢您的反馈，我们会协助孩子巩固。',
      imageUrls: ['/api/uploads/reply.png'], createdAt: new Date('2026-11-05T03:00:00.000Z'),
    }])
  })

  it('returns parent evaluations to an authorized management user', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/classroom-feedback/feedback-1/detail'), {
      params: Promise.resolve({ id: 'feedback-1' }),
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      id: 'feedback-1',
      parentEvaluations: [{ satisfied: false, reason: '希望课堂讲解能再具体一些', parent: { name: '王女士' } }],
      students: [{
        id: 'student-1',
        practiceReplies: [{ id: 'reply-1', content: '感谢您的反馈，我们会协助孩子巩固。', imageUrls: ['/api/uploads/reply.png'] }],
      }],
    })
    expect(mocks.evaluationFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { feedbackId: 'feedback-1' },
    }))
    expect(mocks.practiceReplyFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { feedbackId: 'feedback-1', studentId: { in: ['student-1'] } },
    }))
  })

  it('does not return parent evaluations to a teacher account', async () => {
    mocks.requireAdminUser.mockRejectedValue(new mocks.AuthError('无权限'))

    const response = await GET(new NextRequest('http://localhost/api/admin/classroom-feedback/feedback-1/detail'), {
      params: Promise.resolve({ id: 'feedback-1' }),
    })

    expect(response.status).toBe(403)
    expect(mocks.evaluationFindMany).not.toHaveBeenCalled()
    expect(mocks.practiceReplyFindMany).not.toHaveBeenCalled()
  })
})
