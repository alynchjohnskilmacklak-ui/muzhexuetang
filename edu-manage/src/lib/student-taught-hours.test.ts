import { describe, expect, it } from 'vitest'
import { calculateApprovedIntensiveHours, calculateTaughtHours } from './student-taught-hours'

describe('student taught hours', () => {
  it('combines prepaid used hours with approved intensive teaching hours', () => {
    expect(calculateTaughtHours([
      { usedHours: 4.5, group: { intensiveMode: 'NORMAL' } },
      { usedHours: 0, group: { intensiveMode: 'INTENSIVE' } },
    ], 1.5)).toBe(6)
  })

  it('does not count intensive enrollment usedHours twice', () => {
    expect(calculateTaughtHours([
      { usedHours: 2, group: { intensiveMode: 'INTENSIVE' } },
    ], 1.5)).toBe(1.5)
  })

  it('uses approved actual minutes for present intensive attendances', () => {
    expect(calculateApprovedIntensiveHours([
      { status: 'PRESENT', actualMinutes: 90 },
      { status: 'LEAVE', actualMinutes: 60 },
    ])).toBe(1.5)
  })
})
