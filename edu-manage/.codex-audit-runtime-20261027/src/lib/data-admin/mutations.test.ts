import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'

const mocks = vi.hoisted(() => ({ remove: vi.fn(), restore: vi.fn(), find: vi.fn() }))
vi.mock('@/lib/data-correction/trash', () => ({ softDeleteEntity: mocks.remove, restoreTrashRecord: mocks.restore }))
import { mutateDataAdminRecord } from './mutations'
const db = { deletedRecord: { findFirst: mocks.find } } as unknown as PrismaClient

describe('shared single and batch record mutation', () => {
  beforeEach(() => vi.clearAllMocks())
  it('always delegates deletion to the impact-aware trash service', async () => {
    await mutateDataAdminRecord(db, 'students', 'student1', 'softDelete', { id: 'admin' }, '重复档案')
    expect(mocks.remove).toHaveBeenCalledWith(db, 'Student', 'student1', { id: 'admin' }, '重复档案')
  })
  it('restores the latest genuine trash batch, not just status', async () => {
    mocks.find.mockResolvedValue({ id: 'trash1' })
    await mutateDataAdminRecord(db, 'class-lessons', 'lesson1', 'restore', { id: 'admin' }, '')
    expect(mocks.find).toHaveBeenCalledWith(expect.objectContaining({ where: { entityType: 'ClassLesson', entityId: 'lesson1', deletionBatchId: { not: null } }, orderBy: { createdAt: 'desc' } }))
    expect(mocks.restore).toHaveBeenCalledWith(db, 'trash1', 'admin')
  })
  it('does not reactivate ordinary archived records', async () => {
    mocks.find.mockResolvedValue(null)
    await expect(mutateDataAdminRecord(db, 'class-groups', 'group1', 'restore', { id: 'admin' }, '')).rejects.toThrow(/没有可恢复/)
    expect(mocks.restore).not.toHaveBeenCalled()
  })
  it('rejects unsupported bottom-layer deletion', async () => {
    await expect(mutateDataAdminRecord(db, 'teachers', 'teacher1', 'softDelete', { id: 'admin' }, '')).rejects.toThrow(/业务页面/)
    expect(mocks.remove).not.toHaveBeenCalled()
  })
})
