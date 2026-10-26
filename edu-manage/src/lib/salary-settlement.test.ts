import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { pendingSalaryTransactions, salaryPeriodStart, settleSalaryLedger } from './salary-settlement'

describe('salary pending state', () => {
  it('uses Shanghai month boundaries even when the server runs in UTC', () => {
    expect(salaryPeriodStart('month', new Date('2026-10-31T17:00:00Z')).toISOString()).toBe('2026-10-31T16:00:00.000Z')
  })
  it('uses explicit settlement state independent of array order', () => {
    const rows = [
      { id: 'paid', type: 'LESSON_PAY', createdAt: new Date('2026-10-02'), settledAt: new Date('2026-10-12') },
      { id: 'receipt', type: 'SALARY_SETTLEMENT', createdAt: new Date('2026-10-12'), settlementBatchId: 'batch1' },
      { id: 'backdated', type: 'LESSON_PAY', createdAt: new Date('2026-10-01'), settledAt: null },
    ]
    expect(pendingSalaryTransactions(rows).map(row => row.id)).toEqual(['backdated'])
    expect(pendingSalaryTransactions([...rows].reverse()).map(row => row.id)).toEqual(['backdated'])
  })
  it('uses only the newest legacy receipt for each teacher', () => {
    const rows = [
      { id: 'old', teacherId: 't1', type: 'SALARY_SETTLEMENT', createdAt: new Date('2026-10-02') },
      { id: 'earn', teacherId: 't1', type: 'LESSON_PAY', createdAt: new Date('2026-10-03') },
      { id: 'new', teacherId: 't1', type: 'SALARY_SETTLEMENT', createdAt: new Date('2026-10-04') },
      { id: 'other', teacherId: 't2', type: 'LESSON_PAY', createdAt: new Date('2026-10-03') },
    ]
    expect(pendingSalaryTransactions(rows).map(row => row.id)).toEqual(['other'])
  })
})

describe('transactional settlement', () => {
  const options = { teacherId: 't1', teacherName: '测试教师', termId: 'term1', since: new Date('2026-10-01'), through: new Date('2026-10-31'), actorId: 'admin1', periodLabel: '本月' }
  const tx = {
    teacherSalaryTransaction: { findMany: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    activityLog: { create: vi.fn() },
  }
  const transaction = vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx))
  const db = { $transaction: transaction } as unknown as PrismaClient
  const entry = (id: string, amount: number) => ({ id, teacherId: 't1', type: 'manual_adjust', amount, createdAt: new Date('2026-10-10'), settledAt: null, settlementBatchId: null })
  beforeEach(() => {
    vi.clearAllMocks()
    tx.teacherSalaryTransaction.findMany.mockResolvedValue([entry('e1', 200)])
    tx.teacherSalaryTransaction.updateMany.mockResolvedValue({ count: 1 })
    tx.teacherSalaryTransaction.create.mockResolvedValue({})
    tx.activityLog.create.mockResolvedValue({})
  })
  it('atomically stores source markers, receipt and auditable source IDs', async () => {
    const result = await settleSalaryLedger(db, { ...options, expectedTotal: 200 })
    expect(result).toMatchObject({ total: 200, count: 1, batchId: expect.any(String) })
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' })
    expect(tx.teacherSalaryTransaction.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'SALARY_SETTLEMENT', amount: 200, settledAt: expect.any(Date), settlementBatchId: result.batchId }) })
    expect(tx.activityLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ metadata: expect.objectContaining({ transactionIds: ['e1'], termId: 'term1' }) }) })
    expect(tx.teacherSalaryTransaction.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ settledAt: null, settlementBatchId: null, termId: 'term1' }) }))
  })
  it('does not create another receipt for already-settled records', async () => {
    tx.teacherSalaryTransaction.findMany.mockResolvedValue([{ ...entry('e1', 200), settledAt: new Date(), settlementBatchId: 'done' }])
    await expect(settleSalaryLedger(db, options)).rejects.toThrow(/没有待结算/)
    expect(tx.teacherSalaryTransaction.create).not.toHaveBeenCalled()
  })
  it('settles zero-net nonempty ledgers rather than leaving them permanently pending', async () => {
    tx.teacherSalaryTransaction.findMany.mockResolvedValue([entry('e1', 200), entry('e2', -200)])
    tx.teacherSalaryTransaction.updateMany.mockResolvedValue({ count: 2 })
    expect(await settleSalaryLedger(db, options)).toMatchObject({ total: 0, count: 2 })
  })
  it('allows recording a confirmed negative balance without inventing a payment', async () => {
    tx.teacherSalaryTransaction.findMany.mockResolvedValue([entry('e1', -206)])
    expect(await settleSalaryLedger(db, { ...options, expectedTotal: -206 })).toMatchObject({ total: -206, count: 1 })
  })
  it('requires reconfirmation if the balance has changed', async () => {
    await expect(settleSalaryLedger(db, { ...options, expectedTotal: 100 })).rejects.toThrow(/金额已变化/)
    expect(tx.teacherSalaryTransaction.updateMany).not.toHaveBeenCalled()
  })
  it('rejects a lost concurrent claim before creating a receipt', async () => {
    tx.teacherSalaryTransaction.updateMany.mockResolvedValue({ count: 0 })
    await expect(settleSalaryLedger(db, options)).rejects.toThrow(/其他结算操作/)
    expect(tx.teacherSalaryTransaction.create).not.toHaveBeenCalled()
  })
  it('refuses non-finite ledger amounts without modifying source records', async () => {
    tx.teacherSalaryTransaction.findMany.mockResolvedValue([entry('e1', Infinity)])
    await expect(settleSalaryLedger(db, options)).rejects.toThrow(/金额异常/)
    expect(tx.teacherSalaryTransaction.updateMany).not.toHaveBeenCalled()
  })
})
