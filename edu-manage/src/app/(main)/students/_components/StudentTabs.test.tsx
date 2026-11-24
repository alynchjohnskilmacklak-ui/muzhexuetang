import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import { StudentTabsNav } from './StudentTabsNav'
import { StudentHoursTab } from './StudentHoursTab'

describe('StudentTabsNav', () => {
  it('renders all 4 tabs with proper labels and icons', () => {
    const html = renderToStaticMarkup(
      <StudentTabsNav
        activeTab="roster"
        onChange={() => {}}
        lowHourCount={3}
        pendingFeeCount={2}
      />
    )

    expect(html).toContain('学员名册')
    expect(html).toContain('课时账本')
    expect(html).toContain('消课流水')
    expect(html).toContain('学费订单')
    expect(html).toContain('3告急')
    expect(html).toContain('2')
  })
})

describe('StudentHoursTab', () => {
  const mockStudents = [
    {
      id: 's1',
      name: '张小凡',
      status: 'ACTIVE',
      grade: '初三',
      school: '第一实验中学',
      totalHours: 30,
      remainHours: 2,
      taughtHours: 28,
      enrollments: [
        {
          id: 'e1',
          totalHours: 30,
          remainHours: 2,
          usedHours: 28,
          group: { name: '初三数学冲刺', course: { name: '初三数学', type: 'ONE_ON_ONE' } },
        },
      ],
      mainTeacher: { id: 't1', name: '王怡烁' },
    },
    {
      id: 's2',
      name: '李小萌',
      status: 'ACTIVE',
      grade: '高一',
      school: '新乐一中',
      totalHours: 40,
      remainHours: 20,
      taughtHours: 20,
      enrollments: [
        {
          id: 'e2',
          totalHours: 40,
          remainHours: 20,
          usedHours: 20,
          group: { name: '高一英语精品班', course: { name: '高一英语', type: 'GROUP' } },
        },
      ],
      mainTeacher: { id: 't2', name: '任文涛' },
    },
  ]

  it('renders student hours ledger and detects urgent low hour threshold', () => {
    const html = renderToStaticMarkup(
      <StudentHoursTab
        students={mockStudents}
        searchQuery=""
        isMobile={false}
      />
    )

    expect(html).toContain('张小凡')
    expect(html).toContain('李小萌')
    expect(html).toContain('初三数学')
    expect(html).toContain('高一英语')
    expect(html).toContain('告急预警')
    expect(html).toContain('充裕充足')
  })
})
