import { describe, expect, it } from 'vitest'
import { findSchedulePeriod, isFirstTeachingPeriod, normalizeSchedulePeriods, SCHEDULE_PERIODS } from '../schedule-periods'

describe('schedule periods', () => {
  it('falls back to the default template for missing data', () => {
    expect(normalizeSchedulePeriods(null)).toEqual(SCHEDULE_PERIODS)
  })

  it('normalizes and sorts custom periods by start time', () => {
    const periods = normalizeSchedulePeriods([
      { id: 'late', name: '下午课', type: 'CLASS', start: '14:00', end: '15:00' },
      { id: 'early', name: '上午课', type: 'CLASS', start: '09:00', end: '10:00' },
    ])
    expect(periods.map(period => period.id)).toEqual(['early', 'late', 'ev1', 'evbk', 'ev2'])
  })

  it('matches exact starts and lessons inside a configured period', () => {
    const periods = normalizeSchedulePeriods([
      { id: 'winter-1', name: '寒假第一节', type: 'CLASS', start: '08:30', end: '09:20' },
    ])
    expect(findSchedulePeriod(periods, '08:30')?.id).toBe('winter-1')
    expect(findSchedulePeriod(periods, '08:45')?.id).toBe('winter-1')
    expect(findSchedulePeriod(periods, '09:30')).toBeUndefined()
  })

  it('uses the configured first teaching period for meal reporting', () => {
    const periods = normalizeSchedulePeriods([
      { id: 'winter-1', name: '寒假第一节', type: 'CLASS', start: '08:30', end: '09:20' },
      { id: 'winter-2', name: '寒假第二节', type: 'CLASS', start: '09:30', end: '10:20' },
    ])
    expect(isFirstTeachingPeriod(periods, '08:45')).toBe(true)
    expect(isFirstTeachingPeriod(periods, '09:30')).toBe(false)
  })

  it('upgrades only the legacy evening default to 21:00', () => {
    const periods = normalizeSchedulePeriods([
      { id: 'ev2', name: '晚间第二', type: 'CLASS', start: '19:40', end: '20:40' },
      { id: 'custom', name: '自定义晚课', type: 'CLASS', start: '20:40', end: '20:55' },
    ])
    expect(periods.find((period) => period.id === 'ev2')?.end).toBe('21:00')
    expect(periods.find((period) => period.id === 'custom')?.end).toBe('20:55')
  })
})
