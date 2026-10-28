import { describe, expect, it } from 'vitest'
import { formatLocaleDate, formatLocaleDateTime } from './format-date'

describe('locale date formatting', () => {
  const value = '2026-08-25T12:34:56'

  it('preserves the existing zh-CN date output', () => {
    expect(formatLocaleDate(value)).toBe(new Date(value).toLocaleDateString('zh-CN'))
  })

  it('preserves the existing zh-CN date-time output', () => {
    expect(formatLocaleDateTime(value)).toBe(new Date(value).toLocaleString('zh-CN'))
  })

  it('uses a stable fallback for missing values', () => {
    expect(formatLocaleDate(null)).toBe('-')
    expect(formatLocaleDateTime(undefined)).toBe('-')
  })

  it('supports an explicit fallback without changing formatting behavior', () => {
    expect(formatLocaleDate(null, '暂无')).toBe('暂无')
    expect(formatLocaleDateTime(null, '暂无')).toBe('暂无')
  })
})
