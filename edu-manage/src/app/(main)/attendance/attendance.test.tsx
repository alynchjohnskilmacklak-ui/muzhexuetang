import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}))

vi.mock('@/contexts/DivisionContext', () => ({
  useDivision: () => ({ division: 'JUNIOR' }),
}))

vi.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: () => true,
}))

vi.mock('swr', () => ({
  default: () => ({
    data: {
      data: {
        lessons: [],
        teachers: [],
        terms: [{ id: 'term-1', name: '当前批次', status: 'ACTIVE' }],
      },
    },
    mutate: vi.fn(),
  }),
  useSWRConfig: () => ({ mutate: vi.fn() }),
}))

import AttendancePage from './page'

describe('AttendancePage mobile KPI grid', () => {
  it('renders 4 KPI metrics correctly in attendance page', () => {
    const html = renderToStaticMarkup(<AttendancePage />)

    // Verify 4 KPI cards
    expect(html).toContain('今日排课总数')
    expect(html).toContain('待考勤课次')
    expect(html).toContain('出勤率 / 实到人次')
    expect(html).toContain('请假/缺勤学员')
  })
})
