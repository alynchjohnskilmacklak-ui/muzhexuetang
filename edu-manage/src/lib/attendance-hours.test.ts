import { describe, expect, it } from 'vitest'
import { calculateAttendanceDeductHours } from './attendance-hours'
import { calculateAttendanceRate, clampDeductHours } from './attendance-stats'

describe('attendance hour deduction', () => {
  it('deducts full lesson hours for small class present or leave', () => {
    expect(calculateAttendanceDeductHours({ status: 'PRESENT', courseType: 'GROUP', lessonMinutes: 40 })).toBe(0.7)
    expect(calculateAttendanceDeductHours({ status: 'LEAVE', courseType: 'GROUP', lessonMinutes: 90 })).toBe(1.5)
  })

  it('deducts actual one-on-one minutes when provided', () => {
    expect(calculateAttendanceDeductHours({ status: 'PRESENT', courseType: 'ONE_ON_ONE', lessonMinutes: 60, actualMinutes: 45 })).toBe(0.8)
  })

  it('does not deduct makeup status and clamps negative remain hours', () => {
    expect(calculateAttendanceDeductHours({ status: 'MAKEUP', courseType: 'GROUP', lessonMinutes: 60 })).toBe(0)
    expect(clampDeductHours(2, 0.5)).toBe(0.5)
    expect(clampDeductHours(2, -1)).toBe(0)
  })
})

describe('attendance rate', () => {
  it('calculates present ratio and treats no records as 100 percent', () => {
    expect(calculateAttendanceRate(2, 4)).toBe(50)
    expect(calculateAttendanceRate(0, 0)).toBe(100)
  })
})