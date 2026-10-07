import { describe, expect, it } from 'vitest'
import { getLocalDayRange, localDateColumnValue, localDateKey } from './local-day'

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
})
