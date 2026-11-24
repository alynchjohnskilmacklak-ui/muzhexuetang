import { describe, expect, it } from 'vitest'
import { formatHours } from '@/lib/format'
import { hoursPerLesson, formatDeducted, formatRemaining } from '@/lib/lesson-units'

describe('minute accurate hour display', () => {
  it('converts lesson minutes without rounding to tenths', () => {
    expect(hoursPerLesson(40)).toBe(0.66666667)
    expect(hoursPerLesson(45)).toBe(0.75)
    expect(hoursPerLesson(60)).toBe(1)
  })

  it('shows two decimal places for hour values while keeping lesson counts intact', () => {
    expect(formatHours(hoursPerLesson(40))).toBe('0.67')
    expect(formatRemaining(2, 'ONE_ON_ONE', 40)).toMatchObject({ value: 2, unit: '课时', text: '2 课时' })
    expect(formatDeducted(hoursPerLesson(40), 'ONE_ON_ONE', 40)).toBe('0.67 课时')
  })
})
