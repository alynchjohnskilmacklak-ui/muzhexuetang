import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
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
        weekTotal: 34,
        todayTotal: 5,
        todayCancelled: 0,
        weekCancelled: 0,
        activeRooms: 4,
        weekTeachers: 6,
        runningGroups: 8,
      },
    },
  }),
  useSWRConfig: () => ({ mutate: vi.fn() }),
}))

import SchedulePage from './page'

describe('SchedulePage layout', () => {
  it('renders prominent module navigation tabs and compact overview strip', () => {
    const html = renderToStaticMarkup(<SchedulePage />)

    // Verify prominent in-page unified console header & current indicator
    expect(html).toContain('排课视图模式')
    expect(html).toContain('当前：班级课表')

    // Verify 5 view module tabs are uniformly present
    expect(html).toContain('班级课表')
    expect(html).toContain('教室矩阵')
    expect(html).toContain('教师课表')
    expect(html).toContain('VIP课程')
    expect(html).toContain('周总览')

    // Verify 2 prominent action channels
    expect(html).toContain('进入排课工作台 ›')
    expect(html).toContain('个性化集训排课 ›')

    // Verify compact overview strip preserves all metrics
    expect(html).toContain('本周排课')
    expect(html).toContain('34')
    expect(html).toContain('教室')
    expect(html).toContain('教师')
    expect(html).toContain('班级')
  })
})
