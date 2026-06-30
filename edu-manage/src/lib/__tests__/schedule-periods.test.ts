import { describe, expect, it } from 'vitest'
import { findSchedulePeriod, normalizeSchedulePeriods, SCHEDULE_PERIODS } from '../schedule-periods'

describe('schedule periods', () => {
  it('falls back to the default template for missing data', () => {
    expect(normalizeSchedulePeriods(null)).toEqual(SCHEDULE_PERIODS)
  })

  it('normalizes and sorts custom periods by start time', () => {
    const periods = normalizeSchedulePeriods([
      { id: 'late', name: '下午课', type: 'CLASS', start: '14:00', end: '15:00' },
      { id: 'early', name: '上午课', type: 'CLASS', start: '09:00', end: '10:00' },
    ])
    expect(periods.map(period => period.id)).toEqual(['early', 'late'])
  })

  it('matches exact starts and lessons inside a configured period', () => {
    const periods = normalizeSchedulePeriods([
      { id: 'winter-1', name: '寒假第一节', type: 'CLASS', start: '08:30', end: '09:20' },
    ])
    expect(findSchedulePeriod(periods, '08:30')?.id).toBe('winter-1')
    expect(findSchedulePeriod(periods, '08:45')?.id).toBe('winter-1')
    expect(findSchedulePeriod(periods, '09:30')).toBeUndefined()
  })
})
