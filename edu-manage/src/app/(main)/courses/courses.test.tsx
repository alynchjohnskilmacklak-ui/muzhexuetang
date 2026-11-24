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
      data: [
        {
          id: 'test-group-1',
          name: '测试班级A',
          status: 'ACTIVE',
          course: { id: 'c1', name: '初中数学冲刺', grade: '初一', subject: '数学' },
          room: { id: 'r1', name: '敏行楼101' },
          term: { id: 'term-1', name: '周末班批次', status: 'ACTIVE' },
          enrollments: [],
          teacherAssignments: [],
        },
      ],
      academicTerms: [
        { id: 'term-1', name: '周末班批次', status: 'ACTIVE' },
      ],
    },
    mutate: vi.fn(),
  }),
  useSWRConfig: () => ({ mutate: vi.fn() }),
}))

import CoursesPage from './page'

describe('CoursesPage mobile KPI grid', () => {
  it('renders 4 KPI metrics correctly in courses page', () => {
    const html = renderToStaticMarkup(<CoursesPage />)

    // Verify presence of all 4 KPI cards
    expect(html).toContain('进行中班级')
    expect(html).toContain('待开班班级')
    expect(html).toContain('本月课耗')
    expect(html).toContain('续报预警')

    // Verify presence of tab pills
    expect(html).toContain('精品班课')
    expect(html).toContain('突击全能班')
  })
})
