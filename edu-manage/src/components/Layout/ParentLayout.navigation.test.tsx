import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next-auth/react', () => ({
  signOut: vi.fn(),
  useSession: () => ({ data: { user: { id: 'parent-test', division: 'JUNIOR' } } }),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/parent/dashboard',
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('swr', () => ({
  default: () => ({ data: undefined, error: undefined, mutate: vi.fn() }),
}))

vi.mock('@/hooks/useIsMobile', () => ({ useIsMobile: () => true }))
vi.mock('@/hooks/useKickListener', () => ({ useKickListener: vi.fn() }))
vi.mock('@/hooks/useSessionPing', () => ({ useSessionPing: vi.fn() }))

vi.mock('./MobileLayout', () => ({
  MobileLayout: ({ navItems, children }: { navItems: Array<{ key: string; label: string; children?: Array<{ key: string; label: string }> }>; children: ReactNode }) => {
    const visibleItems = navItems.flatMap((item) => [item, ...(item.children || [])])

    return createElement('nav', null,
      ...visibleItems.map((item) => createElement('span', { key: item.key, 'data-nav-key': item.key }, item.label)),
      children,
    )
  },
  LayoutHydrationFallback: () => null,
}))

import { ParentLayout } from './ParentLayout'

describe('parent navigation', () => {
  beforeEach(() => vi.clearAllMocks())

  it('keeps the archive entry and omits the duplicate hours entry', () => {
    const html = renderToStaticMarkup(
      <ParentLayout initialMembershipLevel="NORMAL">
        <main>content</main>
      </ParentLayout>,
    )

    expect(html).toContain('成长档案')
    expect(html).not.toContain('课时与考勤')
    expect(html).not.toContain('业务总览')
    expect(html).toContain('孩子学习')
    expect(html).toContain('升学服务')
    expect(html).toContain('我的')
    const preservedRoutes = [
      '/parent/dashboard', '/parent/schedule', '/parent/vip', '/parent/class-feedback', '/parent/homework',
      '/parent/study-hall', '/parent/archive', '/parent/teachers', '/parent/notifications', '/parent/messages',
      '/parent/leave', '/parent/meals', '/parent/fees', '/parent/volunteer/schools', '/parent/volunteer',
      '/parent/volunteer/rank-query', '/parent/materials', '/parent/practice', '/parent/vocab', '/parent/phet',
      '/parent/ai', '/parent/benefits', '/parent/bind', '/parent/profile',
    ]

    for (const route of preservedRoutes) {
      expect(html).toContain(`data-nav-key="${route}"`)
    }
    expect(html).not.toContain('data-nav-key="/parent/services"')
  })
})
