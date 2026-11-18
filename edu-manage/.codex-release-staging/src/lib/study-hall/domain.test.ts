import { describe, expect, it } from 'vitest'
import {
  attendanceKey,
  calculateMonthlyEntitlement,
  calculatePurchasedDayBalance,
  calculateRemainingDays,
  isScheduledDate,
} from './domain'

describe('study hall domain', () => {
  it('calculates a late joiner quota from the join date and skips weekends', () => {
    expect(calculateMonthlyEntitlement({
      monthKey: '2026-08',
      joinedAt: new Date('2026-08-17T00:00:00.000Z'),
      termStart: new Date('2026-08-01T00:00:00.000Z'),
      termEnd: new Date('2026-12-31T00:00:00.000Z'),
      weekdays: [1, 2, 3, 4, 5],
    })).toBe(11)
  })

  it('deduplicates attendance when calculating remaining days', () => {
    expect(calculateRemainingDays(5, 0, ['2026-08-17', '2026-08-17', '2026-08-18'])).toEqual({
      entitledDays: 5,
      adjustment: 0,
      usedDays: 2,
      remainingDays: 3,
    })
  })

  it('uses a non-null key for both late care and weekend sessions', () => {
    expect(attendanceKey()).toBe('DAY')
    expect(attendanceKey('session-a')).toBe('SESSION:session-a')
    expect(isScheduledDate('2026-08-16', [6, 7])).toBe(true)
    expect(isScheduledDate('2026-08-16', [1, 2, 3, 4, 5])).toBe(false)
  })

  it('counts one purchased day per calendar date even with multiple weekend sessions', () => {
    expect(calculatePurchasedDayBalance(10, 0, ['2026-08-16', '2026-08-16', '2026-08-17'])).toEqual({
      purchasedDays: 10,
      adjustedDays: 0,
      totalDays: 10,
      usedDays: 2,
      remainingDays: 8,
      quotaState: 'ACTIVE',
    })
  })

  it('keeps legacy memberships usable until an administrator sets purchased days', () => {
    expect(calculatePurchasedDayBalance(null, 0, ['2026-08-16'])).toMatchObject({
      totalDays: null,
      usedDays: 1,
      remainingDays: null,
      quotaState: 'UNSET',
    })
  })
})
