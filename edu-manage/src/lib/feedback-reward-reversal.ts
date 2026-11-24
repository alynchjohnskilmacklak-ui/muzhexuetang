import type { Prisma } from '@prisma/client'

export class FeedbackRewardReversalError extends Error {
  constructor(
    public readonly code: 'FEEDBACK_REWARD_TERM_MISSING' | 'FEEDBACK_REVOKE_CONFLICT',
    message: string,
  ) {
    super(message)
    this.name = 'FeedbackRewardReversalError'
  }
}

type FeedbackRewardTransactionClient = Pick<Prisma.TransactionClient, 'teacherSalaryTransaction'>

/**
 * Remove unpaid feedback bonuses from future settlement, and book an auditable
 * negative adjustment for bonuses that have already been settled.
 */
export async function reverseFeedbackRewardTransactions(
  tx: FeedbackRewardTransactionClient,
  feedbackId: string,
  reversalTermId: string | null,
  revokedAt = new Date(),
) {
  const rows = await tx.teacherSalaryTransaction.findMany({
    where: { feedbackId, type: 'FEEDBACK_BONUS', deletedAt: null },
    select: {
      id: true,
      teacherId: true,
      termId: true,
      amount: true,
      settledAt: true,
      settlementBatchId: true,
    },
  })
  if (!rows.length) return { voidedCount: 0, reversedCount: 0 }

  const pendingIds = rows
    .filter((row) => !row.settledAt && !row.settlementBatchId)
    .map((row) => row.id)

  if (pendingIds.length) {
    await tx.teacherSalaryTransaction.updateMany({
      where: {
        id: { in: pendingIds },
        deletedAt: null,
        settledAt: null,
        settlementBatchId: null,
      },
      data: { deletedAt: revokedAt },
    })
  }

  // Re-read after the conditional update. If a settlement claimed a row first,
  // it remains visible here and must be reversed instead of silently paid.
  const remaining = await tx.teacherSalaryTransaction.findMany({
    where: { id: { in: rows.map((row) => row.id) }, deletedAt: null },
    select: {
      id: true,
      teacherId: true,
      termId: true,
      amount: true,
      settledAt: true,
      settlementBatchId: true,
    },
  })

  const stillPending = remaining.filter((row) => !row.settledAt && !row.settlementBatchId)
  if (stillPending.length) {
    throw new FeedbackRewardReversalError(
      'FEEDBACK_REVOKE_CONFLICT',
      '反馈奖励正在结算，请刷新工资流水后再撤销',
    )
  }

  for (const row of remaining) {
    if (!reversalTermId) {
      throw new FeedbackRewardReversalError(
        'FEEDBACK_REWARD_TERM_MISSING',
        '该反馈奖励已结算，但当前学部没有可入账批次，无法安全冲销',
      )
    }
    const amount = Number(row.amount)
    if (!Number.isFinite(amount) || amount === 0) continue

    await tx.teacherSalaryTransaction.create({
      data: {
        teacherId: row.teacherId,
        termId: reversalTermId,
        type: 'manual_adjust',
        amount: -amount,
        description: `反馈奖励冲销（原批次 ${row.termId || '未归属'}）· 反馈 ${feedbackId} · 原流水 ${row.id}`,
        createdAt: revokedAt,
      },
    })
  }

  return {
    voidedCount: pendingIds.length - remaining.filter((row) => pendingIds.includes(row.id)).length,
    reversedCount: remaining.length,
  }
}
