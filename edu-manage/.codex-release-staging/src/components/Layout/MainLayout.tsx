'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Layout, Spin } from 'antd'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { MobileLayout } from './MobileLayout'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useKickListener } from '@/hooks/useKickListener'
import { useSessionPing } from '@/hooks/useSessionPing'
import { adminNavItems } from './admin-nav'

const { Content } = Layout

export function MainLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(false)
  const { data: session } = useSession()
  useKickListener()
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

  if (isMobile === null) return null

  if (isMobile) {
    return (
      <MobileLayout
        mode="drawer"
        navItems={visibleNavItems}
        title="牧哲学堂"
        roleLabel="管理端"
        menuLabel="菜单"
        accentColor="var(--color-role-admin)"
        accentBackground="var(--color-role-admin-bg)"
      >
        {children}
      </MobileLayout>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Suspense fallback={<div style={{ width: 72, height: '100vh', position: 'fixed', left: 0, top: 0, background: '#fff', borderRight: '1px solid rgba(0,0,0,.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>}>
        <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      </Suspense>
      <Layout style={{ marginLeft: collapsed ? 72 : 220, transition: 'margin-left 0.2s', background: 'var(--color-canvas)' }}>
        <TopNav />
        <Content style={{ padding: 24, minHeight: 'calc(100vh - 56px)' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
