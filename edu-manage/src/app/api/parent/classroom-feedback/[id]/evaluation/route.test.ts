import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  createManyNotifications: vi.fn(),
}))

vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/notifications', () => ({ createManyNotifications: mocks.createManyNotifications }))
vi.mock('@/lib/business-visibility', () => ({ parentLinkedStudentWhere: (parentId: string) => ({ parentId }) }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET, POST } from './route'

describe('/api/parent/classroom-feedback/[id]/evaluation', () => {
  const feedbackFindFirst = vi.fn()
  const studentFindMany = vi.fn()
  const receiptFindUnique = vi.fn()
  const evaluationFindUnique = vi.fn()
  const evaluationCreate = vi.fn()
  const userFindMany = vi.fn()
  const transaction = vi.fn()
  const prisma = {
    classroomFeedback: { findFirst: feedbackFindFirst },
    student: { findMany: studentFindMany },
    feedbackParentReadReceipt: { findUnique: receiptFindUnique },
    parentClassroomFeedbackEvaluation: {
      findUnique: evaluationFindUnique,
      create: evaluationCreate,
    },
    user: { findMany: userFindMany },
    $transaction: transaction,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'parent-1', name: '王女士', role: 'parent' })
    mocks.getRequestPrisma.mockResolvedValue(prisma)
    feedbackFindFirst.mockResolvedValue({
      id: 'feedback-1',
      studentIds: ['student-1'],
      isSingleSession: false,
      teacher: { name: '李老师', division: 'JUNIOR' },
      classLesson: { subject: '数学', group: { division: 'JUNIOR', course: { subject: '数学' } } },
    })
    studentFindMany.mockResolvedValue([{ id: 'student-1', name: '小明' }])
    receiptFindUnique.mockResolvedValue(null)
    evaluationFindUnique.mockResolvedValue(null)
    evaluationCreate.mockResolvedValue({
      id: 'evaluation-1',
      satisfied: false,
      reason: '希望课堂讲解能再具体一些',
      createdAt: new Date('2026-11-05T02:00:00.000Z'),
    })
    userFindMany.mockResolvedValue([{ id: 'admin-1' }, { id: 'admin-2' }])
    transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma))
    mocks.createManyNotifications.mockResolvedValue({ count: 2 })
  })

  it('does not let teacher accounts read or submit a parent evaluation', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'teacher-1', role: 'teacher' })
    const request = new NextRequest('http://localhost/api/parent/classroom-feedback/feedback-1/evaluation')

    const readResponse = await GET(request, { params: Promise.resolve({ id: 'feedback-1' }) })
    const submitResponse = await POST(new NextRequest(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 'UNSATISFIED', reason: '原因说明足够长' }),
    }), { params: Promise.resolve({ id: 'feedback-1' }) })

    expect(readResponse.status).toBe(403)
    expect(submitResponse.status).toBe(403)
    expect(feedbackFindFirst).not.toHaveBeenCalled()
  })

  it('requires a reason for an unsatisfied evaluation', async () => {
    const response = await POST(new NextRequest('http://localhost/api/parent/classroom-feedback/feedback-1/evaluation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 'UNSATISFIED', reason: '  ' }),
    }), { params: Promise.resolve({ id: 'feedback-1' }) })

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ error: '请至少用 5 个字说明不满意的原因' })
    expect(evaluationCreate).not.toHaveBeenCalled()
  })

  it('sends dissatisfied evaluations only to active admins in the feedback division', async () => {
    const response = await POST(new NextRequest('http://localhost/api/parent/classroom-feedback/feedback-1/evaluation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 'UNSATISFIED', reason: '希望课堂讲解能再具体一些' }),
    }), { params: Promise.resolve({ id: 'feedback-1' }) })

    expect(response.status).toBe(201)
    expect(userFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { role: 'admin', status: 'active', division: 'JUNIOR' },
    }))
    expect(mocks.createManyNotifications).toHaveBeenCalledOnce()
    const notifications = mocks.createManyNotifications.mock.calls[0][1]
    expect(notifications.map((notification: { userId: string }) => notification.userId)).toEqual(['admin-1', 'admin-2'])
    expect(notifications.every((notification: { userId: string }) => notification.userId !== 'teacher-1')).toBe(true)
    expect(notifications[0]).toMatchObject({
      type: 'FEEDBACK_REVIEW',
      relatedType: 'CLASSROOM_FEEDBACK_REVIEW',
      relatedId: 'evaluation-1',
      href: '/parent-feedback-reviews?evaluationId=evaluation-1',
    })
    expect(evaluationCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ reviewStatus: 'PENDING', satisfied: false }),
    }))
  })

  it('notifies management of satisfied evaluations so they can record reward follow-up', async () => {
    evaluationCreate.mockResolvedValue({
      id: 'evaluation-2',
      satisfied: true,
      reason: null,
      createdAt: new Date('2026-11-05T02:00:00.000Z'),
    })

    const response = await POST(new NextRequest('http://localhost/api/parent/classroom-feedback/feedback-1/evaluation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 'SATISFIED' }),
    }), { params: Promise.resolve({ id: 'feedback-1' }) })

    expect(response.status).toBe(201)
    expect(userFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { role: 'admin', status: 'active', division: 'JUNIOR' },
    }))
    expect(mocks.createManyNotifications).toHaveBeenCalledWith(prisma, [
      expect.objectContaining({
        userId: 'admin-1',
        title: '收到家长的课堂满意评价',
        relatedId: 'evaluation-2',
        href: '/parent-feedback-reviews?evaluationId=evaluation-2',
      }),
      expect.objectContaining({ userId: 'admin-2' }),
    ])
  })

  it('rejects feedback that is not linked to the parent', async () => {
    studentFindMany.mockResolvedValue([])
    const response = await POST(new NextRequest('http://localhost/api/parent/classroom-feedback/feedback-1/evaluation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 'SATISFIED' }),
    }), { params: Promise.resolve({ id: 'feedback-1' }) })

    expect(response.status).toBe(403)
    expect(evaluationCreate).not.toHaveBeenCalled()
  })

  it('returns an existing evaluation without exposing another parent’s response', async () => {
    evaluationFindUnique.mockResolvedValue({
      satisfied: false,
      reason: '希望课堂讲解能再具体一些',
      reviewStatus: 'IN_PROGRESS',
      reviewNote: '管理团队正在联系家长',
      createdAt: new Date('2026-11-05T02:00:00.000Z'),
    })

    const response = await GET(new NextRequest('http://localhost/api/parent/classroom-feedback/feedback-1/evaluation'), {
      params: Promise.resolve({ id: 'feedback-1' }),
    })

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload).toMatchObject({ evaluation: { rating: 'UNSATISFIED', reason: '希望课堂讲解能再具体一些' } })
    expect(payload.evaluation).not.toHaveProperty('reviewStatus')
    expect(payload.evaluation).not.toHaveProperty('reviewNote')
    expect(evaluationFindUnique.mock.calls[0][0].where).toEqual({
      feedbackId_parentUserId: { feedbackId: 'feedback-1', parentUserId: 'parent-1' },
    })
  })
})
