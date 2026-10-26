import { describe, expect, it } from 'vitest'
import { reportPageEnd } from './report-pagination'
import { isNavigationActive } from './navigation-active'

describe('report pagination', () => {
  it('breaks before a line crossing the page boundary', () => {
    expect(reportPageEnd(0, 100, 300, [{ top: 90, bottom: 110 }])).toBe(90)
  })
  it('keeps a classroom photograph intact', () => {
    expect(reportPageEnd(0, 200, 500, [{ top: 120, bottom: 280 }])).toBe(120)
  })
  it('advances even for an oversized block', () => {
    expect(reportPageEnd(0, 100, 500, [{ top: 0, bottom: 400 }])).toBe(100)
  })
  it('does not append a blank last page', () => {
    expect(reportPageEnd(200, 100, 250, [])).toBe(250)
  })
})

describe('query-bound navigation', () => {
  it('recognizes hours while preserving unrelated child parameters', () => {
    expect(isNavigationActive('/parent/archive', 'tab=hours&childId=child', '/parent/archive?tab=hours')).toBe(true)
    expect(isNavigationActive('/parent/archive', 'tab=timeline', '/parent/archive?tab=hours')).toBe(false)
  })
  it('does not confuse similarly named routes', () => {
    expect(isNavigationActive('/parent/archive-old', '', '/parent/archive')).toBe(false)
    expect(isNavigationActive('/parent/archive/item', '', '/parent/archive')).toBe(true)
  })
})
