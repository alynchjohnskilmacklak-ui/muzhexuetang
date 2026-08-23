import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { activateAcademicTerm, deleteAcademicTerm } from './academic-term'

describe('academic term activation boundary', () => {
  it('switches workspace without closing the previous term business records', async () => {
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      academicTerm: { updateMany: vi.fn(), update: vi.fn() },
      studentTermMembership: { updateMany: vi.fn() },
      classGroup: { updateMany: vi.fn() },
      studyHallPlan: { updateMany: vi.fn() },
      student: { updateMany: vi.fn() },
    }
    const db = {
      academicTerm: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'new-term',
          status: 'DRAFT',
          memberships: [{ studentId: 'student-1', grade: '初二' }],
        }),
      },
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    } as unknown as PrismaClient

    const result = await activateAcademicTerm(db, { termId: 'new-term', division: 'JUNIOR' })

    expect(result).toMatchObject({
      id: 'new-term',
      status: 'ACTIVE',
      syncedStudents: 1,
      repaired: { classGroups: 1, feedbacks: 3, salaryTransactions: 3 },
    })
    expect(tx.$executeRaw).toHaveBeenCalledTimes(7)
    expect(tx.academicTerm.updateMany).toHaveBeenCalledWith({
      where: { division: 'JUNIOR', status: 'ACTIVE', id: { not: 'new-term' } },
      data: { status: 'DRAFT' },
    })
    expect(tx.studentTermMembership.updateMany).toHaveBeenCalledTimes(1)
    expect(tx.classGroup.updateMany).not.toHaveBeenCalled()
    expect(tx.studyHallPlan.updateMany).not.toHaveBeenCalled()
    expect(tx.student.updateMany).toHaveBeenCalledTimes(1)
    expect(tx.student.updateMany).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: expect.anything() }),
    }))
  })

  it('allows a brand-new empty term to become the current workspace', async () => {
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(0),
      academicTerm: { updateMany: vi.fn(), update: vi.fn() },
      studentTermMembership: { updateMany: vi.fn() },
      classGroup: { updateMany: vi.fn() },
      studyHallPlan: { updateMany: vi.fn() },
      student: { updateMany: vi.fn() },
    }
    const db = {
      academicTerm: {
        findFirst: vi.fn().mockResolvedValue({ id: 'empty-term', status: 'DRAFT', memberships: [] }),
      },
      $transaction: vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx)),
    } as unknown as PrismaClient

    await expect(activateAcademicTerm(db, { termId: 'empty-term', division: 'JUNIOR' }))
      .resolves.toMatchObject({ status: 'ACTIVE', syncedStudents: 0 })
    expect(tx.academicTerm.update).toHaveBeenCalledWith({
      where: { id: 'empty-term' },
      data: { status: 'ACTIVE' },
    })
    expect(tx.student.updateMany).not.toHaveBeenCalled()
  })
})

describe('academic term deletion boundary', () => {
  it('deletes only an unused draft term', async () => {
    const db = {
      academicTerm: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'draft-term',
          status: 'DRAFT',
          _count: { memberships: 0, classGroups: 0, studyPlans: 0 },
        }),
        delete: vi.fn().mockResolvedValue({ id: 'draft-term' }),
      },
    } as unknown as PrismaClient

    await expect(deleteAcademicTerm(db, { termId: 'draft-term', division: 'JUNIOR' }))
      .resolves.toEqual({ id: 'draft-term', deleted: true })
  })

  it('refuses to delete archived history', async () => {
    const db = {
      academicTerm: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'archived-term',
          status: 'ARCHIVED',
          _count: { memberships: 0, classGroups: 0, studyPlans: 0 },
        }),
      },
    } as unknown as PrismaClient

    await expect(deleteAcademicTerm(db, { termId: 'archived-term', division: 'JUNIOR' }))
      .rejects.toThrow('历史归档批次不能删除')
  })
})
