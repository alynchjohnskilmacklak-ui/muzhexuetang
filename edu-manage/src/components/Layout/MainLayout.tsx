'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Layout, Spin } from 'antd'
import {
  AuditOutlined,
  CheckSquareOutlined,
  CommentOutlined,
  DashboardOutlined,
  MenuOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { MobileLayout, type MobileNavItem } from './MobileLayout'
import { LayoutHydrationFallback } from './LayoutHydrationFallback'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSessionPing } from '@/hooks/useSessionPing'
import { adminNavItems } from './admin-nav'

const { Content } = Layout

const adminBottomTabs: MobileNavItem[] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '大盘' },
  { key: '/daily-class', icon: <AuditOutlined />, label: '课堂排课' },
  { key: '/students', icon: <UserOutlined />, label: '学员全景' },
  { key: '/communication-center', icon: <CommentOutlined />, label: '家校沟通' },
  { key: '__more', icon: <MenuOutlined />, label: '更多中心' },
]

export function MainLayout({ children }: { children: React.ReactNode }) {
  // Admin pages contain dense tables. Use the drawer shell through tablet widths
  // so a fixed sidebar does not consume the space needed to read the page.
  const isMobile = useIsMobile(1025)
  const isNarrow = useIsMobile(1200)
  const [collapsed, setCollapsed] = useState(false)
  const [tabletNavExpanded, setTabletNavExpanded] = useState(false)
  const { data: session } = useSession()
  useSessionPing({ initialDelay: 6000 })

  const isSenior = (session?.user as { division?: string } | undefined)?.division === 'SENIOR'

  const visibleNavItems = useMemo(() => {
    if (!isSenior) return adminNavItems
    return adminNavItems.filter((item) => item.key !== 'volunteer-group')
  }, [isSenior])

  useEffect(() => {
    const saved = localStorage.getItem('admin_sider_collapsed')
    if (saved !== null) setCollapsed(saved === 'true')
  }, [])

  if (isMobile === null || isNarrow === null) return <LayoutHydrationFallback />

  // 1025–1199px 默认收窄导航；需要时仍可点开查看完整菜单文字。
  const effectiveCollapsed = isNarrow ? !tabletNavExpanded : collapsed
  const handleSiderCollapse = (nextCollapsed: boolean) => {
    if (isNarrow) setTabletNavExpanded(!nextCollapsed)
    else setCollapsed(nextCollapsed)
  }

  if (isMobile) {
    return (
      <MobileLayout
        mode="tabs"
        navItems={visibleNavItems}
        bottomTabs={adminBottomTabs}
        moreItems={visibleNavItems}
        title="牧哲学堂"
        roleLabel="管理端"
        menuLabel="菜单"
        accentColor="var(--color-role-admin)"
        accentBackground="var(--color-role-admin-bg)"
      >
        <div className="admin-main-content">{children}</div>
      </MobileLayout>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Suspense fallback={<div style={{ width: 72, height: '100vh', position: 'fixed', left: 0, top: 0, background: '#fff', borderRight: '1px solid rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>}>
        <Sidebar collapsed={effectiveCollapsed} onCollapse={handleSiderCollapse} />
      </Suspense>
      <Layout style={{ marginLeft: effectiveCollapsed ? 72 : 220, minWidth: 0, flex: '1 1 auto', transition: 'margin-left 0.2s', background: 'var(--color-canvas)' }}>
        <TopNav />
        <Content className="admin-main-content" style={{ padding: isNarrow ? 16 : 24, minHeight: 'calc(100vh - 56px)', minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
