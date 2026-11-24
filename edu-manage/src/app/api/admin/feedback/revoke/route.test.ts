import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
}))

vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

function createPrisma(options: { bonuses: Array<Record<string, unknown>>; claimedCount?: number; activeTermId?: string | null }) {
  let readCount = 0
  const activeBonuses = [...options.bonuses]
  const salary = {
    findMany: vi.fn(async () => {
      readCount += 1
      if (readCount === 1) return options.bonuses
      return activeBonuses.filter((row) => row.deletedAt === null || row.deletedAt === undefined)
    }),
    updateMany: vi.fn(async () => {
      if (options.claimedCount === 0) return { count: 0 }
      for (const row of activeBonuses) row.deletedAt = new Date('2026-11-08T00:00:00Z')
      return { count: activeBonuses.length }
    }),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'reversal-1', ...data })),
  }
  const tx = {
    classroomFeedback: { updateMany: vi.fn(async () => ({ count: options.claimedCount ?? 1 })) },
    feedbackRewardRecord: { updateMany: vi.fn(async () => ({ count: 0 })) },
    teacherSalaryTransaction: salary,
    academicTerm: { findFirst: vi.fn(async () => options.activeTermId === null ? null : { id: options.activeTermId || 'term-current' }) },
    activityLog: { create: vi.fn(async () => ({ id: 'activity-1' })) },
  }
  return {
    prisma: {
      classroomFeedback: {
        findFirst: vi.fn(async () => ({
          id: 'feedback-1',
          teacher: { name: '教师甲', division: 'JUNIOR' },
          classLesson: { group: { name: '数学班' } },
        })),
      },
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    },
    tx,
    salary,
  }
}

async function postRevoke() {
  return POST(new NextRequest('http://localhost/api/admin/feedback/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedbackId: 'feedback-1', reason: '撤销测试' }),
  }))
}

describe('admin feedback revoke route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin' })
  })

  it('voids an unpaid feedback bonus in the same transaction as revocation', async () => {
    const bonus = {
      id: 'bonus-1', teacherId: 'teacher-1', termId: 'term-1', amount: 10,
      settledAt: null, settlementBatchId: null, deletedAt: null,
    }
    const { prisma, tx, salary } = createPrisma({ bonuses: [bonus] })
    mocks.getRequestPrisma.mockResolvedValue(prisma)

    const response = await postRevoke()

    expect(response.status).toBe(200)
    expect(tx.classroomFeedback.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'feedback-1', deletedAt: null },
    }))
    expect(salary.updateMany).toHaveBeenCalledOnce()
    expect(salary.create).not.toHaveBeenCalled()
  })

  it('books a negative adjustment for a bonus that was already paid', async () => {
    const bonus = {
      id: 'bonus-1', teacherId: 'teacher-1', termId: 'term-1', amount: 10,
      settledAt: new Date('2026-11-01T00:00:00Z'), settlementBatchId: 'batch-1', deletedAt: null,
    }
    const { prisma, salary } = createPrisma({ bonuses: [bonus] })
    mocks.getRequestPrisma.mockResolvedValue(prisma)

    const response = await postRevoke()

    expect(response.status).toBe(200)
    expect(salary.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'manual_adjust', amount: -10, termId: 'term-current' }),
    }))
  })

  it('keeps the feedback intact if a settled bonus has no active batch for its correction', async () => {
    const bonus = {
      id: 'bonus-1', teacherId: 'teacher-1', termId: 'term-old', amount: 10,
      settledAt: new Date('2026-10-01T00:00:00Z'), settlementBatchId: 'batch-old', deletedAt: null,
    }
    const { prisma, salary } = createPrisma({ bonuses: [bonus], activeTermId: null })
    mocks.getRequestPrisma.mockResolvedValue(prisma)

    const response = await postRevoke()
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.code).toBe('FEEDBACK_REWARD_TERM_MISSING')
    expect(salary.create).not.toHaveBeenCalled()
  })

  it('does not reverse a bonus when another request already revoked the feedback', async () => {
    const { prisma, tx, salary } = createPrisma({ bonuses: [], claimedCount: 0 })
    mocks.getRequestPrisma.mockResolvedValue(prisma)

    const response = await postRevoke()
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.code).toBe('FEEDBACK_REVOKE_CONFLICT')
    expect(tx.feedbackRewardRecord.updateMany).not.toHaveBeenCalled()
    expect(salary.findMany).not.toHaveBeenCalled()
  })
})
