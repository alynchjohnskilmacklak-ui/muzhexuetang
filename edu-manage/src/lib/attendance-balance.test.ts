import { describe, expect, it, vi } from 'vitest'
import { deductEnrollmentHours } from '@/lib/attendance-balance'

type UpdateArgs = {
  where: { id: string; remainHours: number | { gte: number } }
  data: { usedHours: { increment: number }; remainHours: number | { decrement: number } }
}

function applyUpdate(current: number, { where, data }: UpdateArgs) {
  if (typeof where.remainHours === 'number' && current !== where.remainHours) return { count: 0, remainHours: current }
  if (typeof where.remainHours !== 'number' && current < where.remainHours.gte) return { count: 0, remainHours: current }
  const remainHours = typeof data.remainHours === 'number'
    ? data.remainHours
    : current - data.remainHours.decrement
  return { count: 1, remainHours }
}

describe('deductEnrollmentHours', () => {
  it('deducts the requested amount atomically', async () => {
    let remainHours = 5
    const tx = {
      enrollment: {
        findUnique: vi.fn(async () => ({ remainHours })),
        updateMany: vi.fn(async (args: UpdateArgs) => {
          const result = applyUpdate(remainHours, args)
          remainHours = result.remainHours
          return { count: result.count }
        }),
      },
    }

    await expect(deductEnrollmentHours(tx as never, 'enrollment-1', 1.5)).resolves.toEqual({
      deducted: 1.5,
      beforeHours: 5,
      afterHours: 3.5,
    })
  })

  it('retries with the new partial balance after a concurrent update', async () => {
    let remainHours = 2
    let first = true
    const tx = {
      enrollment: {
        findUnique: vi.fn(async () => ({ remainHours })),
        updateMany: vi.fn(async (args: UpdateArgs) => {
          if (first) {
            first = false
            remainHours = 0.5
            return { count: 0 }
          }
          const result = applyUpdate(remainHours, args)
          remainHours = result.remainHours
          return { count: result.count }
        }),
      },
    }

    await expect(deductEnrollmentHours(tx as never, 'enrollment-1', 1)).resolves.toEqual({
      deducted: 0.5,
      beforeHours: 0.5,
      afterHours: 0,
    })
  })

  it('settles a rounded final balance despite a tiny Float underflow without going negative', async () => {
    const storedBalance = 0.19999999999999996
    let remainHours = storedBalance
    const updateMany = vi.fn(async (args: UpdateArgs) => {
      const result = applyUpdate(remainHours, args)
      remainHours = result.remainHours
      return { count: result.count }
    })
    const tx = {
      enrollment: {
        findUnique: vi.fn(async () => ({ remainHours })),
        updateMany,
      },
    }

    await expect(deductEnrollmentHours(tx as never, 'enrollment-1', 0.2)).resolves.toEqual({
      deducted: 0.2,
      beforeHours: 0.2,
      afterHours: 0,
    })
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'enrollment-1', remainHours: storedBalance },
      data: { usedHours: { increment: 0.2 }, remainHours: 0 },
    })
    expect(remainHours).toBe(0)
  })
})
