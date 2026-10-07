import { describe, expect, it, vi } from 'vitest'
import { deductEnrollmentHours } from '@/lib/attendance-balance'

describe('deductEnrollmentHours', () => {
  it('deducts the requested amount atomically', async () => {
    let remainHours = 5
    const tx = {
      enrollment: {
        findUnique: vi.fn(async () => ({ remainHours })),
        updateMany: vi.fn(async ({ data }: { data: { remainHours: { decrement: number } } }) => {
          remainHours -= data.remainHours.decrement
          return { count: 1 }
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
        updateMany: vi.fn(async ({ data }: { data: { remainHours: { decrement: number } } }) => {
          if (first) {
            first = false
            remainHours = 0.5
            return { count: 0 }
          }
          remainHours -= data.remainHours.decrement
          return { count: 1 }
        }),
      },
    }

    await expect(deductEnrollmentHours(tx as never, 'enrollment-1', 1)).resolves.toEqual({
      deducted: 0.5,
      beforeHours: 0.5,
      afterHours: 0,
    })
  })
})
