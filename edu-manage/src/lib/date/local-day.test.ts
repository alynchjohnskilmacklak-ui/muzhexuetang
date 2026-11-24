import { describe, expect, it } from 'vitest'
import { dateRangeDays, getLocalDayRange, getLocalWeekRange, isValidDateKey, localDateColumnValue, localDateKey } from './local-day'

describe('课次日期存储与查询', () => {
  it('临时加课的存储值与已有固定课表一样使用 UTC 零点', () => {
    const date = localDateColumnValue('2026-10-03')
    expect(date.toISOString()).toBe('2026-10-03T00:00:00.000Z')
    expect(localDateKey(date)).toBe('2026-10-03')
  })

  it('当天查询区间包含 UTC 零点存储的课次', () => {
    const { start, end } = getLocalDayRange('2026-10-03')
    const date = localDateColumnValue('2026-10-03')
    expect(date.getTime()).toBeGreaterThanOrEqual(start.getTime())
    expect(date.getTime()).toBeLessThan(end.getTime())
  })

  it('按纯日期递增并正确跨月和闰年', () => {
    expect(dateRangeDays('2026-10-30', 3)).toEqual(['2026-10-30', '2026-10-31', '2026-11-01'])
    expect(dateRangeDays('2028-02-28', 3)).toEqual(['2028-02-28', '2028-02-29', '2028-03-01'])
  })

  it('拒绝日历中不存在的日期', () => {
    expect(isValidDateKey('2026-04-31')).toBe(false)
    expect(isValidDateKey('2026-02-29')).toBe(false)
    expect(isValidDateKey('2028-02-29')).toBe(true)
    expect(() => dateRangeDays('2026-04-31', 2)).toThrow('Invalid startDate')
  })

  it('在 UTC 午夜附近仍按上海日期生成当天和周区间', () => {
    const now = new Date('2026-10-30T17:00:00.000Z')
    const { start, end } = getLocalDayRange(localDateKey(now))
    expect(start.toISOString()).toBe('2026-10-30T16:00:00.000Z')
    expect(end.toISOString()).toBe('2026-10-31T16:00:00.000Z')

    const week = getLocalWeekRange(now)
    expect(week.start.toISOString()).toBe('2026-10-25T16:00:00.000Z')
    expect(week.end.toISOString()).toBe('2026-11-01T16:00:00.000Z')
  })
})
