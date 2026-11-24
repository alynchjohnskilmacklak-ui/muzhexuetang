import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ requireAdminUser: vi.fn() }))
vi.mock('@/lib/auth/guards', () => ({ requireAdminUser: mocks.requireAdminUser }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { PATCH } from './route'

describe('PATCH /api/admin/parent-feedback-reviews/[id]', () => {
  const findFirst = vi.fn()
  const update = vi.fn()
  const prisma = { parentClassroomFeedbackEvaluation: { findFirst, update } }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdminUser.mockResolvedValue({ id: 'admin-1', division: 'JUNIOR', prisma })
    findFirst.mockResolvedValue({ id: 'evaluation-1' })
    update.mockResolvedValue({
      id: 'evaluation-1', reviewStatus: 'RESOLVED', reviewNote: '已与家长沟通并完成教学调整',
      reviewedAt: new Date('2026-11-05T03:00:00.000Z'), reviewedBy: { id: 'admin-1', name: '管理员' },
    })
  })

  const request = (body: unknown) => new NextRequest('http://localhost/api/admin/parent-feedback-reviews/evaluation-1', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })

  it('requires a written outcome before resolving a review', async () => {
    const response = await PATCH(request({ reviewStatus: 'RESOLVED', reviewNote: '好' }), { params: Promise.resolve({ id: 'evaluation-1' }) })

    expect(response.status).toBe(400)
    expect(update).not.toHaveBeenCalled()
  })

  it('records the management status, note, reviewer, and timestamp', async () => {
    const response = await PATCH(request({ reviewStatus: 'RESOLVED', reviewNote: ' 已与家长沟通并完成教学调整 ' }), { params: Promise.resolve({ id: 'evaluation-1' }) })

    expect(response.status).toBe(200)
    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'evaluation-1' },
      data: expect.objectContaining({
        reviewStatus: 'RESOLVED',
        reviewNote: '已与家长沟通并完成教学调整',
        reviewedById: 'admin-1',
        reviewedAt: expect.any(Date),
      }),
    }))
    expect(await response.json()).toMatchObject({ item: { reviewStatus: 'RESOLVED', reviewedBy: { name: '管理员' } } })
  })

  it('does not update an evaluation from another division', async () => {
    findFirst.mockResolvedValue(null)
    const response = await PATCH(request({ reviewStatus: 'IN_PROGRESS' }), { params: Promise.resolve({ id: 'evaluation-1' }) })

    expect(response.status).toBe(404)
    expect(update).not.toHaveBeenCalled()
  })
})
