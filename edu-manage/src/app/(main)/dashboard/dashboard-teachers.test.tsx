import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import DashboardPage from './page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}))

vi.mock('@/contexts/DivisionContext', () => ({
  useDivision: () => ({ division: 'JUNIOR' }),
}))

vi.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: () => true, // 模拟手机端
}))

vi.mock('swr', () => ({
  default: (url: string) => {
    if (url === '/api/admin/academic-terms') {
      return {
        data: {
          selectedTermId: 'term-1',
          terms: [{ id: 'term-1', name: '秋季学期', status: 'ACTIVE' }],
        },
        error: undefined,
        isLoading: false,
        mutate: vi.fn(),
      }
    }
    return {
      data: {
        metrics: {
          activeStudents: 23,
          studentGrowth: 2,
          monthlyScheduledHours: 24,
          monthlyDeductedHours: 12,
          hoursProgress: 50,
          todayLessons: 0,
          todayLessonsCompleted: 0,
          todayLessonsPendingAttendance: 0,
          pendingTasks: 0,
          pendingTasksUrgent: 0,
          activeGroups: 3,
          waitingGroups: 0,
          renewalWarnings: 1,
          pendingMakeups: 0,
          pendingIntensiveAppointments: 0,
          pendingIntensiveReviews: 0,
          unpublishedPapers: 0,
          unreadParentComments: 0,
          unreadPerformanceComments: 0,
          unreadComments: 0,
          pendingTeacherReplies: 0,
          pendingParentReads: 0,
          masteredRate: 85,
          performancePostsToday: 0,
        },
        growthData: { months: [], newStudents: [], totalStudents: [], classHours: [] },
        schedules: [],
        teacherCompliance: [],
        operatingHighlights: [],
        workloads: [],
        logs: [],
        intensiveAppointments: [],
        teachersSummary: [
          {
            teacherId: 't-1',
            name: '胡思同',
            gender: 'FEMALE',
            avatar: null,
            tierLevel: 'ELITE',
            subjects: '英语,数学,物理',
            activeStudents: 15, // 有学员
            monthlyHours: 8.4,
            todayLessons: 0,
            pendingAttendance: 0,
            pendingFeedback: 0,
            pendingReplies: 0,
          },
          {
            teacherId: 't-2',
            name: '朱梦',
            gender: 'FEMALE',
            avatar: null,
            tierLevel: 'EXPERIENCED',
            subjects: '数学,语文,生物',
            activeStudents: 5, // 有学员
            monthlyHours: 0,
            todayLessons: 0,
            pendingAttendance: 0,
            pendingFeedback: 0,
            pendingReplies: 0,
          },
          {
            teacherId: 't-3',
            name: '范芳菲',
            gender: 'FEMALE',
            avatar: null,
            tierLevel: 'EXPERIENCED',
            subjects: '英语,化学,数学',
            activeStudents: 12, // 有学员
            monthlyHours: 0,
            todayLessons: 0,
            pendingAttendance: 0,
            pendingFeedback: 0,
            pendingReplies: 0,
          },
          {
            teacherId: 't-4',
            name: '王金鑫',
            gender: 'MALE',
            avatar: null,
            tierLevel: 'EXPERIENCED',
            subjects: '物理',
            activeStudents: 3, // 第4位有学员名师（应被折叠）
            monthlyHours: 1,
            todayLessons: 0,
            pendingAttendance: 0,
            pendingFeedback: 0,
            pendingReplies: 0,
          },
          {
            teacherId: 't-5',
            name: '陈晓莉',
            gender: 'FEMALE',
            avatar: null,
            tierLevel: 'ELITE',
            subjects: '生物',
            activeStudents: 0, // 无学员，绝不可在带班名册展示！
            monthlyHours: 0,
            todayLessons: 0,
            pendingAttendance: 0,
            pendingFeedback: 0,
            pendingReplies: 0,
          },
        ],
      },
      error: undefined,
      isLoading: false,
      mutate: vi.fn(),
    }
  },
  useSWRConfig: () => ({ mutate: vi.fn() }),
}))

describe('Dashboard Mobile Teacher Roster Filtering and Collapse', () => {
  it('displays total teachers on top metric, only teachers with students in cards, and folds when exceeding 3', () => {
    const html = renderToStaticMarkup(<DashboardPage />)

    // 1. 顶部总览必须显示全校在岗名师总数（5位），而非被折叠的3位
    expect(html).toContain('在岗名师')
    expect(html).toContain('5<span style="font-size:10.5px;font-weight:500;color:#9A8E7A;margin-left:2px">位</span>')

    // 2. 验证带班学员 > 0 的老师正常展示（前3位）
    expect(html).toContain('胡思同')
    expect(html).toContain('朱梦')
    expect(html).toContain('范芳菲')

    // 3. 验证带班 0 学员的陈晓莉被彻底过滤，不显示在卡片中
    expect(html).not.toContain('陈晓莉')

    // 4. 验证超过 3 位的第 4 位名师“王金鑫”默认被折叠，界面出现折叠展开按钮
    expect(html).not.toContain('王金鑫')
    expect(html).toContain('展开其余 1 位带班名师')
  })
})
