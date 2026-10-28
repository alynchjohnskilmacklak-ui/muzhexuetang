import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
vi.mock('server-only', () => ({}))
vi.mock('@/lib/data-correction/cleanup', () => ({ isCleanupCategory: vi.fn(), restoreCleanupBatch: vi.fn() }))
import { softDeleteEntity, restoreTrashRecord } from './trash'

describe('family-safe student trash and batch-specific recovery', () => {
  const makeDb = () => {
    const tx = {
      student: {
        findFirst: vi.fn().mockResolvedValue({ id: 's1', name: '学员', parentId: 'parent1', parentUserId: 'parent1' }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ status: 'ACTIVE', parentId: 'parent1', parentUserId: 'parent1', mainTeacherId: 'teacher1', leftAt: null }),
        findUnique: vi.fn().mockResolvedValue({ deletionBatchId: 'batch1' }),
        count: vi.fn().mockResolvedValue(1), update: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      enrollment: { count: vi.fn().mockResolvedValue(1), updateMany: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
      attendance: { count: vi.fn().mockResolvedValue(1) },
      examPaper: { count: vi.fn().mockResolvedValue(0) },
      classroomFeedback: { count: vi.fn().mockResolvedValue(0) },
      user: { findUnique: vi.fn().mockResolvedValue({ status: 'active' }), update: vi.fn(), updateMany: vi.fn() },
      deletedRecord: { create: vi.fn().mockResolvedValue({ id: 'trash1' }), findUniqueOrThrow: vi.fn(), delete: vi.fn() },
      activityLog: { create: vi.fn() },
    }
    return { tx, db: { ...tx, $transaction: async (fn: (client: typeof tx) => unknown) => fn(tx) } as unknown as PrismaClient }
  }
  beforeEach(() => vi.clearAllMocks())
  it('does not disable a parent who still has another valid child', async () => {
    const { db, tx } = makeDb()
    await softDeleteEntity(db, 'Student', 's1', { id: 'admin' }, '重复档案')
    expect(tx.user.update).not.toHaveBeenCalled()
    expect(tx.deletedRecord.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ payload: expect.objectContaining({ studentStatus: 'ACTIVE', mainTeacherId: 'teacher1', parentStatuses: {} }) }) }))
  })
  it('only pauses the parent once when the last child is deleted', async () => {
    const { db, tx } = makeDb()
    tx.student.count.mockResolvedValue(0)
    await softDeleteEntity(db, 'Student', 's1', { id: 'admin' }, '离开机构')
    expect(tx.user.update).toHaveBeenCalledTimes(1)
    expect(tx.deletedRecord.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ payload: expect.objectContaining({ parentStatuses: { parent1: 'active' } }) }) }))
  })
  it('does not create another deletion batch when a concurrent request already claimed the record', async () => {
    const { db, tx } = makeDb()
    tx.student.updateMany.mockResolvedValue({ count: 0 })
    await expect(softDeleteEntity(db, 'Student', 's1', { id: 'admin' }, '重复点击')).rejects.toThrow(/未重复删除/)
    expect(tx.deletedRecord.create).not.toHaveBeenCalled()
  })
  it('restores only associations belonging to the original deletion batch', async () => {
    const { db, tx } = makeDb()
    tx.deletedRecord.findUniqueOrThrow.mockResolvedValue({ id: 'trash1', entityType: 'Student', entityId: 's1', deletionBatchId: 'batch1', payload: { studentStatus: 'ACTIVE', mainTeacherId: 'teacher1', parentStatuses: { parent1: 'active' } } })
    await restoreTrashRecord(db, 'trash1', 'admin')
    expect(tx.enrollment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { deletionBatchId: 'batch1' } }))
    expect(tx.student.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ deletedAt: null, mainTeacherId: 'teacher1' }) }))
    expect(tx.user.updateMany).toHaveBeenCalledWith({ where: { id: 'parent1', status: 'disabled' }, data: { status: 'active' } })
  })
  it('does not overwrite a newer deletion batch while restoring an older record', async () => {
    const { db, tx } = makeDb()
    tx.student.findUnique.mockResolvedValue({ deletionBatchId: 'new-batch' })
    tx.deletedRecord.findUniqueOrThrow.mockResolvedValue({ id: 'trash1', entityType: 'Student', entityId: 's1', deletionBatchId: 'batch1', payload: {} })
    await expect(restoreTrashRecord(db, 'trash1', 'admin')).rejects.toThrow(/其他删除批次/)
    expect(tx.student.update).not.toHaveBeenCalled()
    expect(tx.deletedRecord.delete).not.toHaveBeenCalled()
  })
})
