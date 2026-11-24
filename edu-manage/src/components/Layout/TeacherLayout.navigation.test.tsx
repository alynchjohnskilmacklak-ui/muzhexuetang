import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next-auth/react', () => ({ signOut: vi.fn() }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/teacher/dashboard',
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('swr', () => ({ default: () => ({ data: undefined }) }))
vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => true }))
vi.mock('@/hooks/useKickListener', () => ({ useKickListener: vi.fn() }))
vi.mock('@/hooks/useSessionPing', () => ({ useSessionPing: vi.fn() }))

vi.mock('./MobileLayout', () => ({
  MobileLayout: ({ navItems, bottomTabs, children }: {
    navItems: Array<{ key: string; label: string; children?: Array<{ key: string; label: string }> }>
    bottomTabs: Array<{ key: string; label: string }>
    children: ReactNode
  }) => createElement('div', null,
    ...navItems.map((group) => createElement('section', { key: group.key, 'data-group-key': group.key },
      createElement('h2', null, group.label),
      ...(group.children || []).map((item) => createElement('span', {
        key: item.key,
        'data-parent-key': group.key,
        'data-route-key': item.key,
      }, item.label)),
    )),
    ...bottomTabs.map((item) => createElement('span', { key: item.key, 'data-bottom-tab': item.key }, item.label)),
    children,
  ),
  LayoutHydrationFallback: () => null,
}))

import { TeacherLayout } from './TeacherLayout'

describe('teacher navigation', () => {
  it('groups classroom, homework, and student-family work while keeping bottom shortcuts', () => {
    const html = renderToStaticMarkup(
      <TeacherLayout
        initialData={{
          teacher: { id: 'teacher-1', name: '老师' },
          badges: { unsubmitted: 2, unpublished: 1, unread: 0, unreadMessages: 3 },
        }}
      >
        <main>content</main>
      </TeacherLayout>,
    )

    expect(html).toContain('<h2>课堂教学</h2>')
    expect(html).toContain('<h2>作业与班级管理</h2>')
    expect(html).toContain('<h2>学员与家校</h2>')
    const classroomRoutes = [
      '/teacher/schedule', '/teacher/intensive', '/teacher/lesson-previews', '/teacher/attendance',
      '/teacher/interaction', '/teacher/feedback', '/teacher/single-session-feedback',
    ]
    const homeworkRoutes = ['/teacher/homework', '/teacher/study-hall']
    const familyRoutes = ['/teacher/students', '/teacher/messages', '/teacher/leave']
    const resourceRoutes = ['/teacher/papers', '/teacher/materials', '/teacher/phet', '/teacher/ai']
    const personalRoutes = ['/teacher/meals', '/teacher/compensation']

    for (const route of classroomRoutes) {
      expect(html).toContain(`data-parent-key="classroom-group" data-route-key="${route}"`)
    }
    for (const route of homeworkRoutes) {
      expect(html).toContain(`data-parent-key="homework-group" data-route-key="${route}"`)
    }
    for (const route of familyRoutes) {
      expect(html).toContain(`data-parent-key="student-group" data-route-key="${route}"`)
    }
    for (const route of resourceRoutes) {
      expect(html).toContain(`data-parent-key="resource-group" data-route-key="${route}"`)
    }
    for (const route of personalRoutes) {
      expect(html).toContain(`data-parent-key="account-group" data-route-key="${route}"`)
    }
    expect(html).toContain('data-bottom-tab="/teacher/attendance"')
    expect(html).toContain('data-bottom-tab="/teacher/feedback"')
  })
})
