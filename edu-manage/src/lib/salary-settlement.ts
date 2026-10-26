import { Prisma, type PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'
import { runSerializableWithRetry } from './serializable-retry'
import { getLocalDayRange, localDateKey } from './date/local-day'

export function salaryPeriodStart(period: string, now = new Date()) {
  if (period === 'week') return new Date(now.getTime() - 7 * 86400000)
  if (period === 'all') return new Date(0)
  return getLocalDayRange(localDateKey(now).slice(0, 7) + '-01').start
}

export type SalarySettlementState = {
  teacherId?: string; type: string; createdAt: Date; deletedAt?: Date | null
  settledAt?: Date | null; settlementBatchId?: string | null
}

/** Explicit receipt state is authoritative. Only old, unbatched receipts use a date cutoff. */
export function pendingSalaryTransactions<T extends SalarySettlementState>(rows: T[]): T[] {
  const legacyCutoffs = new Map<string, number>()
  for (const row of rows) {
    if (row.type === 'SALARY_SETTLEMENT' && !row.deletedAt && !row.settlementBatchId) {
      const key = row.teacherId || ''
      legacyCutoffs.set(key, Math.max(legacyCutoffs.get(key) || 0, row.createdAt.getTime()))
    }
  }
  return rows.filter(row => row.type !== 'SALARY_SETTLEMENT' && !row.deletedAt && !row.settledAt
    && !row.settlementBatchId && row.createdAt.getTime() > (legacyCutoffs.get(row.teacherId || '') ?? -Infinity))
}

export class SalarySettlementError extends Error {
  constructor(message: string, readonly status = 409) { super(message) }
}

export async function settleSalaryLedger(prisma: PrismaClient, options: {
  teacherId: string; teacherName: string; termId: string; since: Date; through: Date
  actorId: string; periodLabel: string; expectedTotal?: number
}) {
  return runSerializableWithRetry(() => prisma.$transaction(async tx => {
    const rows = await tx.teacherSalaryTransaction.findMany({
      where: { teacherId: options.teacherId, termId: options.termId, deletedAt: null, createdAt: { gte: options.since, lte: options.through } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    })
    const pending = pendingSalaryTransactions(rows)
    if (!pending.length) throw new SalarySettlementError('该范围没有待结算流水，可能已结算；请刷新核对')
    const total = Number(pending.reduce((sum, row) => sum + row.amount, 0).toFixed(2))
    if (!Number.isFinite(total)) throw new SalarySettlementError('流水金额异常，请先核对后结算')
    if (options.expectedTotal !== undefined && Math.abs(total - options.expectedTotal) > 0.005) {
      throw new SalarySettlementError('待结算金额已变化，请刷新核对后重新确认')
    }
    const batchId = randomUUID()
    const now = new Date()
    const ids = pending.map(row => row.id)
    const claimed = await tx.teacherSalaryTransaction.updateMany({
      where: { id: { in: ids }, teacherId: options.teacherId, termId: options.termId, deletedAt: null, settledAt: null, settlementBatchId: null },
      data: { settledAt: now, settlementBatchId: batchId },
    })
    if (claimed.count !== ids.length) throw new SalarySettlementError('流水已被其他结算操作处理，请刷新后核对')
    await tx.teacherSalaryTransaction.create({ data: {
      teacherId: options.teacherId, termId: options.termId, type: 'SALARY_SETTLEMENT', amount: total,
      description: `${options.periodLabel}工资结算 · 共 ${ids.length} 笔应发流水`,
      settledAt: now, settlementBatchId: batchId, createdAt: now,
    } })
    await tx.activityLog.create({ data: {
      userId: options.actorId, action: 'SALARY_SETTLE', entityType: 'TeacherSalaryTransaction', entityId: batchId,
      detail: `${options.teacherName} ${options.periodLabel}工资已结算 ¥${total.toFixed(2)}`,
      metadata: { teacherId: options.teacherId, termId: options.termId, total, transactionCount: ids.length, transactionIds: ids, since: options.since.toISOString(), through: options.through.toISOString() },
    } })
    return { total, count: ids.length, batchId, settledAt: now.toISOString() }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }))
}
