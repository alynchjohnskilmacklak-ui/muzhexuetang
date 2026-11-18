import { describe, expect, it } from 'vitest'
import {
  hasLowPrepaidHours,
  hasOutstandingPrepaidBalance,
  isAccrualEnrollment,
} from '@/lib/student-billing-status'

describe('student billing status', () => {
  it('does not treat a zero-hour personalized course as debt', () => {
    const enrollments = [{
      remainHours: 0,
      totalHours: 0,
      group: { intensiveMode: 'INTENSIVE' },
    }]

    expect(isAccrualEnrollment(enrollments[0])).toBe(true)
    expect(hasLowPrepaidHours(enrollments)).toBe(false)
    expect(hasOutstandingPrepaidBalance(enrollments)).toBe(false)
  })

  it('keeps normal prepaid low-hour and debt warnings', () => {
    expect(hasLowPrepaidHours([{
      remainHours: 2,
      totalHours: 20,
      group: { intensiveMode: 'NORMAL' },
    }])).toBe(true)

    expect(hasOutstandingPrepaidBalance([{
      remainHours: 0,
      totalHours: 20,
      group: { intensiveMode: 'NORMAL' },
    }])).toBe(true)
  })

  it('ignores accrual courses when normal prepaid hours remain', () => {
    const enrollments = [
      { remainHours: 0, totalHours: 0, group: { intensiveMode: 'INTENSIVE' } },
      { remainHours: 8, totalHours: 20, group: { intensiveMode: 'NORMAL' } },
    ]

    expect(hasLowPrepaidHours(enrollments)).toBe(false)
    expect(hasOutstandingPrepaidBalance(enrollments)).toBe(false)
  })
})
