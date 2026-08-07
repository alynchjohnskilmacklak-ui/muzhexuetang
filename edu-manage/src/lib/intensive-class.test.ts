import { describe, expect, it } from 'vitest'
import {
  calculateIntensiveDeductHours,
  createLessonStudentSnapshot,
  intensiveFeedbackRewardAmount,
  intensiveStudentCountError,
  resolveIntensiveActualMinutes,
  shouldGenerateIntensiveLessonPay,
} from '@/lib/intensive-class'
import { calculateAttendanceDeductHours } from '@/lib/attendance-hours'
import { calcLessonPay, DEFAULT_GROUP_RATE_JUNIOR, DEFAULT_GROUP_RATE_SENIOR, DEFAULT_ONE_ON_ONE_RATES } from '@/lib/teacher-salary'

const payOptions = {
  grade: '高三',
  groupRateJunior: DEFAULT_GROUP_RATE_JUNIOR,
  groupRateSenior: DEFAULT_GROUP_RATE_SENIOR,
  oneOnOneRates: DEFAULT_ONE_ON_ONE_RATES,
}

describe('intensive class boundary', () => {
  it('keeps normal group attendance and salary rules unchanged', () => {
    expect(calculateAttendanceDeductHours({ status: 'LEAVE', courseType: 'GROUP', lessonMinutes: 90, actualMinutes: 30 })).toBe(1.5)
    expect(calcLessonPay({ ...payOptions, courseType: 'GROUP', lessonMinutes: 60 })).toBe(DEFAULT_GROUP_RATE_SENIOR)
  })

  it('validates exact one-on-one, one-on-two and one-on-three sizes', () => {
    expect(intensiveStudentCountError('ONE_ON_ONE', 1)).toBeNull()
    expect(intensiveStudentCountError('ONE_ON_TWO', 2)).toBeNull()
    expect(intensiveStudentCountError('ONE_ON_THREE', 3)).toBeNull()
    expect(intensiveStudentCountError('ONE_ON_TWO', 1)).toBeTruthy()
  })

  it('uses one-on-one salary once for an intensive lesson regardless of student count', () => {
    const amount = calcLessonPay({ ...payOptions, courseType: 'ONE_ON_ONE', lessonMinutes: 120 })
    expect(amount).toBe(100)
    expect(shouldGenerateIntensiveLessonPay(['PRESENT', 'PRESENT', 'PRESENT'], 120)).toBe(true)
  })

  it('rewards three independent intensive feedback students with three yuan', () => {
    expect(intensiveFeedbackRewardAmount(3)).toBe(3)
  })

  it('does not deduct an intensive leave student', () => {
    expect(calculateIntensiveDeductHours('LEAVE', 60)).toBe(0)
  })

  it('does not generate salary when every intensive student is on leave', () => {
    expect(shouldGenerateIntensiveLessonPay(['LEAVE', 'LEAVE'], 60)).toBe(false)
  })

  it('uses 60 actual minutes for a 120-minute plan', () => {
    const actual = resolveIntensiveActualMinutes(120, [60, 60])
    expect(actual).toBe(60)
    expect(calculateIntensiveDeductHours('PRESENT', actual)).toBe(1)
    expect(calcLessonPay({ ...payOptions, courseType: 'ONE_ON_ONE', lessonMinutes: actual })).toBe(50)
  })

  it('keeps a lesson student snapshot stable after enrollment changes', () => {
    const snapshot = createLessonStudentSnapshot(['A', 'B'])
    const currentEnrollment = [...snapshot, 'C']
    expect(snapshot).toEqual(['A', 'B'])
    expect(currentEnrollment).toEqual(['A', 'B', 'C'])
  })
})
