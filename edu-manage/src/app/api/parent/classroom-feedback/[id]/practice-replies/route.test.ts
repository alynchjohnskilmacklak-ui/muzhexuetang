import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getRequestPrisma: vi.fn() }))
vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/business-visibility', () => ({ parentLinkedStudentWhere: (parentId: string) => ({ parentId }) }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

describe('GET /api/parent/classroom-feedback/[id]/practice-replies', () => {
  const studentFindFirst = vi.fn()
  const feedbackFindFirst = vi.fn()
  const replyFindMany = vi.fn()
  const prisma = {
    student: { findFirst: studentFindFirst },
    classroomFeedback: { findFirst: feedbackFindFirst },
    classroomFeedbackPracticeReply: { findMany: replyFindMany },
  }

  const call = () => GET(new NextRequest('http://localhost/api/parent/classroom-feedback/feedback-1/practice-replies?studentId=student-1'), {
    params: Promise.resolve({ id: 'feedback-1' }),
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'parent-1', role: 'parent' })
    mocks.getRequestPrisma.mockResolvedValue(prisma)
    studentFindFirst.mockResolvedValue({ id: 'student-1' })
    feedbackFindFirst.mockResolvedValue({ id: 'feedback-1' })
    replyFindMany.mockResolvedValue([{
      id: 'reply-1', content: '管理团队回复', imageUrls: ['/api/uploads/reply.png'],
      createdAt: new Date('2026-11-05T03:00:00.000Z'),
    }])
  })

  it('returns management replies and photos to the linked parent', async () => {
    const response = await call()

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ replies: [{ id: 'reply-1', imageUrls: ['/api/uploads/reply.png'] }] })
    expect(feedbackFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'feedback-1', status: 'PUBLISHED', studentIds: { has: 'student-1' } }),
    }))
  })

  it('denies another parent and never queries replies for that student', async () => {
    studentFindFirst.mockResolvedValue(null)

    const response = await call()

    expect(response.status).toBe(403)
    expect(replyFindMany).not.toHaveBeenCalled()
  })

  it('does not expose the replies to teacher accounts', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'teacher-1', role: 'teacher' })

    const response = await call()

    expect(response.status).toBe(403)
    expect(studentFindFirst).not.toHaveBeenCalled()
  })
})
