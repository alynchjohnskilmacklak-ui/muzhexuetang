import { describe, expect, it, vi } from 'vitest'
import { FeedbackRewardReversalError, reverseFeedbackRewardTransactions } from './feedback-reward-reversal'

function createHarness(rows: Array<{
  id: string
  teacherId?: string
  termId: string | null
  amount: number
  settledAt: Date | null
  settlementBatchId: string | null
}>) {
  const activeRows = rows.map((row) => ({ ...row, teacherId: row.teacherId || 'teacher-1', deletedAt: null as Date | null }))
  const created: Array<Record<string, unknown>> = []
  const salary = {
    findMany: vi.fn(async ({ where }: { where: { id?: { in: string[] }; feedbackId?: string; deletedAt?: null } }) => (
      activeRows
        .filter((row) => row.deletedAt === null)
        .filter((row) => !where.id || where.id.in.includes(row.id))
        .map(({ id, teacherId, termId, amount, settledAt, settlementBatchId }) => ({ id, teacherId, termId, amount, settledAt, settlementBatchId }))
    )),
    updateMany: vi.fn(async ({ where, data }: { where: { id: { in: string[] } }; data: { deletedAt: Date } }) => {
      let count = 0
      for (const row of activeRows) {
        if (where.id.in.includes(row.id) && row.deletedAt === null && !row.settledAt && !row.settlementBatchId) {
          row.deletedAt = data.deletedAt
          count += 1
        }
      }
      return { count }
    }),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      created.push(data)
      return { id: `reversal-${created.length}`, ...data }
    }),
  }
  return { tx: { teacherSalaryTransaction: salary }, activeRows, created, salary }
}

describe('reverseFeedbackRewardTransactions', () => {
  it('voids unpaid bonuses so salary settlement cannot pay them', async () => {
    const { tx, activeRows, created, salary } = createHarness([
      { id: 'bonus-1', termId: 'term-1', amount: 10, settledAt: null, settlementBatchId: null },
    ])
    const now = new Date('2026-11-08T10:00:00.000Z')

    await expect(reverseFeedbackRewardTransactions(tx as never, 'feedback-1', null, now)).resolves.toEqual({
      voidedCount: 1,
      reversedCount: 0,
    })
    expect(activeRows[0].deletedAt).toEqual(now)
    expect(salary.updateMany).toHaveBeenCalledOnce()
    expect(created).toHaveLength(0)
  })

  it('creates a negative manual adjustment for an already settled bonus', async () => {
    const { tx, created } = createHarness([
      { id: 'bonus-1', termId: 'term-1', amount: 12.5, settledAt: new Date(), settlementBatchId: 'batch-1' },
    ])

    await expect(reverseFeedbackRewardTransactions(tx as never, 'feedback-1', 'term-current')).resolves.toEqual({
      voidedCount: 0,
      reversedCount: 1,
    })
    expect(created).toEqual([expect.objectContaining({
      teacherId: 'teacher-1',
      termId: 'term-current',
      type: 'manual_adjust',
      amount: -12.5,
      description: expect.stringContaining('原批次 term-1'),
    })])
  })

  it('reverses bonuses that were claimed by settlement during revocation', async () => {
    const { tx, activeRows, created } = createHarness([
      { id: 'bonus-1', termId: 'term-1', amount: 8, settledAt: null, settlementBatchId: null },
    ])
    const originalUpdateMany = tx.teacherSalaryTransaction.updateMany
    tx.teacherSalaryTransaction.updateMany = vi.fn(async () => {
      activeRows[0].settledAt = new Date()
      activeRows[0].settlementBatchId = 'batch-1'
      return { count: 0 }
    })

    await reverseFeedbackRewardTransactions(tx as never, 'feedback-1', 'term-current')

    expect(created[0]).toEqual(expect.objectContaining({ amount: -8, termId: 'term-current' }))
    expect(originalUpdateMany).not.toHaveBeenCalled()
  })

  it('refuses a settled bonus reversal when there is no active correction batch', async () => {
    const { tx, created } = createHarness([
      { id: 'bonus-1', termId: null, amount: 8, settledAt: new Date(), settlementBatchId: 'batch-1' },
    ])

    await expect(reverseFeedbackRewardTransactions(tx as never, 'feedback-1', null)).rejects.toBeInstanceOf(FeedbackRewardReversalError)
    expect(created).toHaveLength(0)
  })

  it('books a legacy unbatched paid bonus into the current batch and identifies its source', async () => {
    const { tx, created } = createHarness([
      { id: 'bonus-1', termId: null, amount: 8, settledAt: new Date(), settlementBatchId: 'batch-1' },
    ])

    await reverseFeedbackRewardTransactions(tx as never, 'feedback-1', 'term-current')

    expect(created[0]).toEqual(expect.objectContaining({
      type: 'manual_adjust',
      termId: 'term-current',
      amount: -8,
      description: expect.stringContaining('原批次 未归属'),
    }))
  })
})
