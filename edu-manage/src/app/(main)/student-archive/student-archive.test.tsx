import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'

// mock SWR
vi.mock('swr', () => ({
  default: () => ({
    data: {
      summary: { noPractice: 23, noFeedback: 22, noSummary: 23 },
      items: [],
    },
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: () => true,
}))

import StudentArchiveDashboardPage from './page'

describe('StudentArchiveDashboardPage', () => {
  it('renders compact 2x2 grid summary and prominent segmented tabs', () => {
    const html = renderToStaticMarkup(<StudentArchiveDashboardPage />)

    // Verify compact summary cards exist
    expect(html).toContain('本期未做题')
    expect(html).toContain('本期无反馈')
    expect(html).toContain('本期无小结')
    expect(html).toContain('资料齐全学员')

    // Verify prominent segmented tabs exist with counts
    expect(html).toContain('全部')
    expect(html).toContain('未做题')
    expect(html).toContain('缺反馈')
    expect(html).toContain('缺小结')
    expect(html).toContain('齐全')
  })
})
