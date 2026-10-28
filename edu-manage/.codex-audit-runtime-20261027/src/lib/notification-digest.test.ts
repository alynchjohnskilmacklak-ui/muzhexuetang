import { describe, expect, it } from 'vitest'
import { buildDigestContent, localWeekRange } from './notification-digest'

describe('localWeekRange', () => {
  it('returns the previous Monday-to-Monday range for a Tuesday', () => {
    // 2026-10-20（周二）→ 上周一 2026-10-12 → 本周一 2026-10-19
    const { weekKey, start, end } = localWeekRange(new Date(2026, 9, 20, 15, 30))
    expect(weekKey).toBe('2026-10-12')
    expect(start.getFullYear()).toBe(2026)
    expect(start.getMonth()).toBe(9)
    expect(start.getDate()).toBe(12)
    expect(start.getHours()).toBe(0)
    expect(end.getDate()).toBe(19)
  })

  it('handles a Monday itself (moves to the week before)', () => {
    // 2026-10-19（周一）→ 上周一 2026-10-12
    const { weekKey } = localWeekRange(new Date(2026, 9, 19, 8, 0))
    expect(weekKey).toBe('2026-10-12')
  })

  it('handles month boundaries', () => {
    // 2026-11-03（周二）→ 上周一 2026-10-26 → 本周一 2026-11-02
    const { weekKey, start, end } = localWeekRange(new Date(2026, 10, 3, 12, 0))
    expect(weekKey).toBe('2026-10-26')
    expect(start.getDate()).toBe(26)
    expect(end.getMonth()).toBe(10)
    expect(end.getDate()).toBe(2)
  })

  it('handles year boundaries', () => {
    // 2027-01-05（周二）→ 上周一 2026-12-28 → 本周一 2027-01-04
    const { weekKey, start, end } = localWeekRange(new Date(2027, 0, 5, 12, 0))
    expect(weekKey).toBe('2026-12-28')
    expect(start.getFullYear()).toBe(2026)
    expect(start.getDate()).toBe(28)
    expect(end.getFullYear()).toBe(2027)
    expect(end.getDate()).toBe(4)
  })
})

describe('buildDigestContent', () => {
  it('builds a sorted summary of notification types', () => {
    const start = new Date(2026, 9, 12)
    const end = new Date(2026, 9, 19)
    const content = buildDigestContent(start, end, [
      { relatedType: 'ATTENDANCE', count: 2 },
      { relatedType: 'CLASSROOM_FEEDBACK', count: 5 },
      { relatedType: 'EXAM_PAPER', count: 1 },
    ])
    expect(content).toContain('共收到 8 条动态')
    expect(content).toContain('课堂反馈5、考勤2、试卷1')
  })

  it('falls back to 其他 for unknown types and drops zero counts', () => {
    const start = new Date(2026, 9, 12)
    const end = new Date(2026, 9, 19)
    const content = buildDigestContent(start, end, [
      { relatedType: 'WEIRD_TYPE', count: 1 },
      { relatedType: 'CLASSROOM_FEEDBACK', count: 0 },
    ])
    expect(content).toContain('其他1')
    expect(content).not.toContain('课堂反馈0')
  })

  it('returns null when there is nothing to summarize', () => {
    const start = new Date(2026, 9, 12)
    const end = new Date(2026, 9, 19)
    expect(buildDigestContent(start, end, [])).toBeNull()
    expect(buildDigestContent(start, end, [{ relatedType: 'CLASSROOM_FEEDBACK', count: 0 }])).toBeNull()
  })
})
