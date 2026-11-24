import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import TeacherFeedbackPage from './FeedbackComposer'

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { id: 'test-teacher-1', name: '胡老师', role: 'teacher' } },
    status: 'authenticated',
  }),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/teacher/feedback',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams({ groupId: 'group-1' }),
}))

// Mock swr with sample class and lesson
vi.mock('swr', () => ({
  default: (key: string) => {
    if (key === '/api/teacher/feedback-context' || key === '/api/teacher/feedback/context') {
      return {
        data: {
          currentTerm: { id: 'term-1', name: '2026秋季学期' },
          groups: [
            {
              id: 'group-1',
              name: '初一冲刺班',
              courseName: '初一数学冲刺班',
              subject: '数学',
              studentCount: 3,
              students: [
                { id: 's1', name: '马子墨', gender: 'MALE', todayFeedback: false },
                { id: 's2', name: '孙嘉森', gender: 'MALE', todayFeedback: false },
                { id: 's3', name: '牛博研', gender: 'MALE', todayFeedback: false },
              ],
            },
          ],
          lessons: [
            {
              id: 'lesson-1',
              scopeId: 'group-1',
              lessonDate: '2026-11-17',
              startTime: '10:10',
              endTime: '10:50',
              attendanceSubmitted: true,
              isToday: true,
              rosterStudentIds: ['s1', 's2', 's3'],
              attendanceSummary: { totalCount: 3, presentCount: 3, lateCount: 0, leaveCount: 0, absentCount: 0 },
            },
            {
              id: 'lesson-2',
              scopeId: 'group-1',
              lessonDate: '2026-11-17',
              startTime: '11:00',
              endTime: '11:40',
              attendanceSubmitted: true,
              isToday: true,
              rosterStudentIds: ['s1', 's2', 's3'],
              attendanceSummary: { totalCount: 3, presentCount: 3, lateCount: 0, leaveCount: 0, absentCount: 0 },
            },
          ],
          previousFollowups: [],
        },
        error: undefined,
        mutate: vi.fn(),
      }
    }
    return { data: undefined, error: undefined, mutate: vi.fn() }
  },
}))

// Mock hooks
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => true }))
vi.mock('@/hooks/useSignedUrls', () => ({ useSignedUrls: () => ({}) }))

describe('TeacherFeedbackPage Mobile UX Optimization', () => {
  it('renders mobile layout with compact student picker and drawer container', () => {
    const html = renderToStaticMarkup(<TeacherFeedbackPage />)

    // Verify Title & Header
    expect(html).toContain('课堂成长反馈')
    expect(html).toContain('课程与学生')
    expect(html).toContain('填写课堂反馈')
    expect(html).toContain('课堂学情与反馈记录')
    expect(html).toContain('整理生成学生反馈草稿')

    // Verify Mobile step card and cleaner flow
    expect(html).toContain('teacher-feedback-step-card')
    expect(html).toContain('teacher-feedback-mobile-step-title')

    // Verify Card 2 (formSection) is immediately present without monster inline editor
    expect(html).toContain('反馈微调倾向')
    expect(html).toContain('例如：今天练习了一元一次方程')

    // Verify 2 consecutive small lessons are merged into a single session option with (2节连堂)
    expect(html).toContain('2节连堂')
    expect(html).toContain('10:10-11:40')
    expect(html).toContain('已关联本次课（含 2 节连堂小课，已合并，提交一次即可完成全部反馈）')
  })
})
