import { describe, expect, it, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderToString } from 'react-dom/server'

const mockData = {
  summary: {
    totalPicks: 50,
    totalStudentsCovered: 15,
    activeTeachersCount: 2,
    totalTeachersCount: 5,
    teachersWithClassesCount: 1,
    idleTeachersCount: 4,
    totalLessons: 8,
    avgPicksPerLesson: 6.3,
    overallCorrectRate: 88,
    needsWorkCount: 4,
    randomRatio: 75,
  },
  teachers: [
    {
      teacher: {
        id: 'teacher-1',
        name: '胡思同',
        avatar: null,
        gender: 'FEMALE',
        tierLevel: 'ELITE',
        subjects: '数学',
        phone: '13800000001',
      },
      hasClasses: true,
      activeGroupsCount: 2,
      activeLessonsCount: 5,
      stats: {
        totalPicks: 30,
        uniqueStudentsCount: 10,
        totalLessons: 5,
        avgPicksPerLesson: 6.0,
        correctCount: 24,
        partialCount: 4,
        needsWorkCount: 2,
        noAnswerCount: 0,
        randomRatio: 80,
        correctRate: 90,
        lastInteractionAt: '2026-11-18T10:00:00Z',
      },
      topStudentsPreview: [
        { studentId: 's-1', studentName: '马子墨', grade: '初一', pickCount: 5 },
        { studentId: 's-2', studentName: '王祁涵', grade: '初三', pickCount: 4 },
      ],
      studentRanking: [
        {
          studentId: 's-1',
          studentName: '马子墨',
          grade: '初一',
          gender: 'BOY',
          pickCount: 5,
          correctCount: 4,
          partialCount: 1,
          needsWorkCount: 0,
          noAnswerCount: 0,
          lastPickedAt: '2026-11-18T10:00:00Z',
          lastResult: 'CORRECT',
          lastComment: '思路清晰',
        },
      ],
      recentPicks: [
        {
          id: 'p-1',
          lessonId: 'l-1',
          groupName: '初一数学周末班',
          courseName: '初一数学',
          subject: '数学',
          lessonDate: '2026-11-18',
          timeRange: '09:00–10:00',
          studentId: 's-1',
          studentName: '马子墨',
          grade: '初一',
          round: 1,
          source: 'RANDOM',
          questionLabel: '第3题',
          result: 'CORRECT',
          comment: '思路清晰',
          createdAt: '2026-11-18T09:30:00Z',
        },
      ],
    },
    {
      teacher: {
        id: 'teacher-2',
        name: '空闲教师',
        avatar: null,
        gender: 'MALE',
        tierLevel: 'SENIOR',
        subjects: '物理',
        phone: '13800000002',
      },
      hasClasses: false,
      activeGroupsCount: 0,
      activeLessonsCount: 0,
      stats: {
        totalPicks: 0,
        uniqueStudentsCount: 0,
        totalLessons: 0,
        avgPicksPerLesson: 0,
        correctCount: 0,
        partialCount: 0,
        needsWorkCount: 0,
        noAnswerCount: 0,
        randomRatio: 0,
        correctRate: 0,
        lastInteractionAt: null,
      },
      topStudentsPreview: [],
      studentRanking: [],
      recentPicks: [],
    },
  ],
  timeRange: { range: '30d', startDate: null, endDate: null },
}

vi.mock('swr', () => ({
  default: () => ({
    data: mockData,
    error: null,
    isLoading: false,
    mutate: vi.fn(),
  }),
}))

vi.mock('@/contexts/DivisionContext', () => ({
  useDivision: () => ({ division: 'JUNIOR' }),
}))

vi.mock('@/components/Layout/PageLayout', () => ({
  PageLayout: ({ title, subtitle, children }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}))

import TeacherInteractionsPage from './page'

describe('TeacherInteractionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders summary metrics, class toggle tabs and defaults to teachers with classes', () => {
    const html = renderToString(<TeacherInteractionsPage />)

    expect(html).toContain('教师课堂提问与互动统计')
    expect(html).toContain('课堂提问总量')
    expect(html).toContain('50')
    expect(html).toContain('互动覆盖学员')
    expect(html).toContain('15')

    // 切换按钮
    expect(html).toContain('有课教师')
    expect(html).toContain('暂无排课')
    expect(html).toContain('全部名师')

    // 默认展示有课教师胡思同，不展示暂无排课的空闲教师
    expect(html).toContain('胡思同')
    expect(html).toContain('在教 2 班')
    expect(html).toContain('马子墨')
    expect(html).not.toContain('空闲教师')
  })
})
