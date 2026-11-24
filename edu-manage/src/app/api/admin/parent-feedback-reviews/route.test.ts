import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ requireAdminUser: vi.fn() }))
vi.mock('@/lib/auth/guards', () => ({ requireAdminUser: mocks.requireAdminUser }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

describe('GET /api/admin/parent-feedback-reviews', () => {
  const count = vi.fn()
  const groupBy = vi.fn()
  const findMany = vi.fn()
  const studentFindMany = vi.fn()
  const prisma = {
    parentClassroomFeedbackEvaluation: { count, groupBy, findMany },
    student: { findMany: studentFindMany },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdminUser.mockResolvedValue({ id: 'admin-1', division: 'JUNIOR', prisma })
    count.mockResolvedValue(1)
    groupBy.mockResolvedValue([{ reviewStatus: 'PENDING', _count: { _all: 1 } }])
    findMany.mockResolvedValue([{
      id: 'evaluation-1', feedbackId: 'feedback-1', satisfied: false,
      reason: '希望课堂讲解能再具体一些', createdAt: new Date('2026-11-05T02:00:00.000Z'),
      reviewStatus: 'PENDING', reviewNote: null, reviewedAt: null, reviewedBy: null,
      parent: { id: 'parent-1', name: '王女士' },
      feedback: {
        id: 'feedback-1', studentIds: ['student-1'], isSingleSession: false,
        sessionDate: null, subjectSnapshot: '数学', createdAt: new Date('2026-11-05T01:00:00.000Z'),
        teacher: { id: 'teacher-1', name: '李老师' },
        classLesson: { lessonDate: new Date('2026-11-05T01:00:00.000Z'), startTime: '16:00', group: { name: '初三冲刺班', course: { name: '数学课', subject: '数学' } } },
      },
    }])
    studentFindMany.mockResolvedValue([{ id: 'student-1', name: '小明' }])
  })

  it('returns a division-scoped parent evaluation queue with student and lesson context', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/parent-feedback-reviews?division=SENIOR&status=PENDING&rating=UNSATISFIED&page=2'))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      total: 1,
      page: 2,
      statusCounts: { PENDING: 1 },
      items: [{
        id: 'evaluation-1',
        satisfied: false,
        parent: { name: '王女士' },
        teacher: { name: '李老师' },
        studentNames: ['小明'],
        className: '初三冲刺班',
        courseName: '数学课',
      }],
    })
    expect(count.mock.calls[0][0].where).toMatchObject({
      reviewStatus: 'PENDING',
      satisfied: false,
      feedback: { is: { teacher: { is: { division: 'JUNIOR' } } } },
    })
    expect(findMany.mock.calls[0][0]).toMatchObject({ skip: 30, take: 30 })
  })

  it('can target a notification-linked evaluation regardless of its current status', async () => {
    await GET(new NextRequest('http://localhost/api/admin/parent-feedback-reviews?evaluationId=evaluation-1'))

    expect(count.mock.calls[0][0].where.id).toBe('evaluation-1')
    expect(count.mock.calls[0][0].where.reviewStatus).toBeUndefined()
    expect(findMany.mock.calls[0][0]).toMatchObject({ skip: 0, take: 1 })
  })

  it('does not expose database schema errors in the management page response', async () => {
    count.mockRejectedValue(new Error('Unknown field reviewStatus in Prisma query'))
    const response = await GET(new NextRequest('http://localhost/api/admin/parent-feedback-reviews'))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: '家长评价暂时无法加载，请稍后重试' })
  })
})
