import { describe, expect, it } from 'vitest'
import { calculateAttendanceDeductHours, shouldCreateMakeupRequest } from './attendance-hours'
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

  it('区分计费模式：暑假班按月 ABSENT 也扣；周末课按课时 ABSENT 不扣', () => {
    // 暑假班（MONTHLY，默认）：来不来都算课时
    expect(calculateAttendanceDeductHours({ status: 'ABSENT', courseType: 'GROUP', lessonMinutes: 90 })).toBe(1.5)
    expect(calculateAttendanceDeductHours({ status: 'ABSENT', courseType: 'GROUP', lessonMinutes: 90, billingMode: 'MONTHLY' })).toBe(1.5)
    // 周末课（PER_HOUR）：没来不扣课时
    expect(calculateAttendanceDeductHours({ status: 'ABSENT', courseType: 'GROUP', lessonMinutes: 90, billingMode: 'PER_HOUR' })).toBe(0)
    // 周末课出勤/请假仍正常扣
    expect(calculateAttendanceDeductHours({ status: 'PRESENT', courseType: 'GROUP', lessonMinutes: 90, billingMode: 'PER_HOUR' })).toBe(1.5)
    expect(calculateAttendanceDeductHours({ status: 'LEAVE', courseType: 'GROUP', lessonMinutes: 90, billingMode: 'PER_HOUR' })).toBe(1.5)
  })
})

describe('attendance rate', () => {
  it('calculates present ratio and treats no records as 100 percent', () => {
    expect(calculateAttendanceRate(2, 4)).toBe(50)
    expect(calculateAttendanceRate(0, 0)).toBe(100)
  })
})

describe('makeup request eligibility', () => {
  it('does not turn ordinary small-class leave into an admin makeup task', () => {
    expect(shouldCreateMakeupRequest({ status: 'LEAVE', courseType: 'GROUP' })).toBe(false)
    expect(shouldCreateMakeupRequest({ status: 'ABSENT', courseType: 'GROUP' })).toBe(false)
  })

  it('keeps individualized-course makeup workflows', () => {
    expect(shouldCreateMakeupRequest({ status: 'LEAVE', courseType: 'ONE_ON_ONE' })).toBe(true)
    expect(shouldCreateMakeupRequest({ status: 'ABSENT', intensiveMode: 'INTENSIVE' })).toBe(true)
    expect(shouldCreateMakeupRequest({ status: 'PRESENT', courseType: 'ONE_ON_ONE' })).toBe(false)
  })
})
