import { describe, expect, it } from 'vitest'
import {
  getMealPeriodDates,
  getSummerTeachingDayCount,
  isSummerTeachingDate,
} from './meal-attendance-period'

describe('summer meal attendance period', () => {
  it('matches the published 24-day summer timetable', () => {
    expect(getSummerTeachingDayCount()).toBe(24)
    expect(isSummerTeachingDate('2026-07-11')).toBe(true)
    expect(isSummerTeachingDate('2026-07-12')).toBe(false)
    expect(isSummerTeachingDate('2026-08-01')).toBe(false)
    expect(isSummerTeachingDate('2026-08-08')).toBe(true)
  })

  it('returns the complete July 9 to August 8 calendar', () => {
    const dates = getMealPeriodDates('2026-07-09', '2026-08-08')
    expect(dates).toHaveLength(31)
    expect(dates.filter((item) => item.isTeachingDay)).toHaveLength(24)
  })
})
