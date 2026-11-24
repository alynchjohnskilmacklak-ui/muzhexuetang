import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MobileLayout, type MobileNavItem } from './MobileLayout'

let currentPathname = '/parent/dashboard'

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
  useSession: () => ({ data: { user: { id: 'test-user', name: '测试用户', email: 'test@example.com' } } }),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

const parentBottomTabs: MobileNavItem[] = [
  { key: '/parent/dashboard', label: '首页', icon: 'home' },
  { key: '/parent/class-feedback', label: '课堂反馈', icon: 'feedback' },
  { key: '/parent/study-hall', label: '晚托作业', icon: 'homework' },
  { key: '/parent/notifications', label: '通知', icon: 'bell' },
  { key: '__more', label: '更多', icon: 'menu' },
]

const teacherBottomTabs: MobileNavItem[] = [
  { key: '/teacher/dashboard', label: '首页', icon: 'home' },
  { key: '/teacher/schedule', label: '课表', icon: 'calendar' },
  { key: '/teacher/attendance', label: '考勤', icon: 'check' },
  { key: '/teacher/feedback', label: '反馈', icon: 'form' },
  { key: '__more', label: '更多', icon: 'menu' },
]

const adminBottomTabs: MobileNavItem[] = [
  { key: '/dashboard', label: '总览', icon: 'dashboard' },
  { key: '/daily-class', label: '课堂', icon: 'class' },
  { key: '/students', label: '学员', icon: 'user' },
  { key: '/attendance', label: '考勤', icon: 'check' },
  { key: '__more', label: '更多', icon: 'menu' },
]

describe('mobile layout auto-hides bottom tabs on subpages for all three clients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Client 1: 家长端 (Parent)', () => {
    it('shows bottom tabs on root level tabs (/parent/dashboard, /parent/class-feedback)', () => {
      currentPathname = '/parent/dashboard'
      const htmlDashboard = renderToStaticMarkup(
        createElement(MobileLayout, {
          mode: 'tabs',
          navItems: parentBottomTabs,
          bottomTabs: parentBottomTabs,
          children: createElement('div', null, 'content'),
        }),
      )
      expect(htmlDashboard).toContain('mobile-bottom-nav')
      expect(htmlDashboard).toContain('mobile-menu-trigger')
      expect(htmlDashboard).not.toContain('mobile-back-pill')

      currentPathname = '/parent/class-feedback'
      const htmlFeedback = renderToStaticMarkup(
        createElement(MobileLayout, {
          mode: 'tabs',
          navItems: parentBottomTabs,
          bottomTabs: parentBottomTabs,
          children: createElement('div', null, 'content'),
        }),
      )
      expect(htmlFeedback).toContain('mobile-bottom-nav')
      expect(htmlFeedback).toContain('mobile-menu-trigger')
      expect(htmlFeedback).not.toContain('mobile-back-pill')
    })

    it('auto-hides bottom tabs and shows back button on subpages (/parent/vocab, /parent/schedule, /parent/homework)', () => {
      currentPathname = '/parent/vocab'
      const htmlVocab = renderToStaticMarkup(
        createElement(MobileLayout, {
          mode: 'tabs',
          navItems: parentBottomTabs,
          bottomTabs: parentBottomTabs,
          children: createElement('div', null, 'content'),
        }),
      )
      expect(htmlVocab).not.toContain('mobile-bottom-nav')
      expect(htmlVocab).toContain('mobile-back-pill')
      expect(htmlVocab).toContain('返回')

      currentPathname = '/parent/schedule'
      const htmlSchedule = renderToStaticMarkup(
        createElement(MobileLayout, {
          mode: 'tabs',
          navItems: parentBottomTabs,
          bottomTabs: parentBottomTabs,
          children: createElement('div', null, 'content'),
        }),
      )
      expect(htmlSchedule).not.toContain('mobile-bottom-nav')
      expect(htmlSchedule).toContain('mobile-back-pill')
      expect(htmlSchedule).toContain('返回')

      currentPathname = '/parent/homework'
      const htmlHomework = renderToStaticMarkup(
        createElement(MobileLayout, {
          mode: 'tabs',
          navItems: parentBottomTabs,
          bottomTabs: parentBottomTabs,
          children: createElement('div', null, 'content'),
        }),
      )
      expect(htmlHomework).not.toContain('mobile-bottom-nav')
      expect(htmlHomework).toContain('mobile-back-pill')
      expect(htmlHomework).toContain('返回')
    })
  })

  describe('Client 2: 教师端 (Teacher)', () => {
    it('shows bottom tabs on root level tabs (/teacher/dashboard, /teacher/schedule, /teacher/attendance)', () => {
      currentPathname = '/teacher/dashboard'
      const html = renderToStaticMarkup(
        createElement(MobileLayout, {
          mode: 'tabs',
          navItems: teacherBottomTabs,
          bottomTabs: teacherBottomTabs,
          children: createElement('div', null, 'content'),
        }),
      )
      expect(html).toContain('mobile-bottom-nav')
    })

    it('auto-hides bottom tabs on task-focused subpages (/teacher/single-session-feedback, /teacher/interaction)', () => {
      currentPathname = '/teacher/single-session-feedback'
      const htmlFeedback = renderToStaticMarkup(
        createElement(MobileLayout, {
          mode: 'tabs',
          navItems: teacherBottomTabs,
          bottomTabs: teacherBottomTabs,
          children: createElement('div', null, 'content'),
        }),
      )
      expect(htmlFeedback).not.toContain('mobile-bottom-nav')

      currentPathname = '/teacher/interaction'
      const htmlInteraction = renderToStaticMarkup(
        createElement(MobileLayout, {
          mode: 'tabs',
          navItems: teacherBottomTabs,
          bottomTabs: teacherBottomTabs,
          children: createElement('div', null, 'content'),
        }),
      )
      expect(htmlInteraction).not.toContain('mobile-bottom-nav')
    })
  })

  describe('Client 3: 管理端 (Admin)', () => {
    it('shows bottom tabs on root level tabs (/dashboard, /students, /attendance)', () => {
      currentPathname = '/dashboard'
      const html = renderToStaticMarkup(
        createElement(MobileLayout, {
          mode: 'tabs',
          navItems: adminBottomTabs,
          bottomTabs: adminBottomTabs,
          children: createElement('div', null, 'content'),
        }),
      )
      expect(html).toContain('mobile-bottom-nav')
    })

    it('auto-hides bottom tabs on admin detail subpages (/students/detail, /schedule/workbench)', () => {
      currentPathname = '/students/detail'
      const htmlStudentDetail = renderToStaticMarkup(
        createElement(MobileLayout, {
          mode: 'tabs',
          navItems: adminBottomTabs,
          bottomTabs: adminBottomTabs,
          children: createElement('div', null, 'content'),
        }),
      )
      expect(htmlStudentDetail).not.toContain('mobile-bottom-nav')

      currentPathname = '/schedule/workbench'
      const htmlWorkbench = renderToStaticMarkup(
        createElement(MobileLayout, {
          mode: 'tabs',
          navItems: adminBottomTabs,
          bottomTabs: adminBottomTabs,
          children: createElement('div', null, 'content'),
        }),
      )
      expect(htmlWorkbench).not.toContain('mobile-bottom-nav')
    })
  })
})
