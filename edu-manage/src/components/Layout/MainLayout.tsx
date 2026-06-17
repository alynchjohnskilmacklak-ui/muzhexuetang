'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Layout, Spin } from 'antd'
import {
  CalendarOutlined,
  CheckSquareOutlined,
  DashboardOutlined,
  EllipsisOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { MobileLayout } from './MobileLayout'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useKickListener } from '@/hooks/useKickListener'
import { useSessionPing } from '@/hooks/useSessionPing'
import { getAdminMenuFlat } from '@/config/adminMenu'

const { Content } = Layout

const adminBottomTabs = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '总览' },
  { key: '/students', icon: <UserOutlined />, label: '学员' },
  { key: '/schedule', icon: <CalendarOutlined />, label: '排课' },
  { key: '/attendance', icon: <CheckSquareOutlined />, label: '考勤' },
  { key: '__more', icon: <EllipsisOutlined />, label: '更多' },
]

export function MainLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(false)
  const { data: session } = useSession()
  useKickListener()
  useSessionPing()

  const isSenior = (session?.user as { division?: string } | undefined)?.division === 'SENIOR'
  const navItems = useMemo(() => {
    return getAdminMenuFlat(isSenior).map((item) => ({
      ...item,
      icon: item.icon ?? null,
    }))
  }, [isSenior])
  const moreItems = useMemo(() => {
    const tabKeys = new Set(['/dashboard', '/students', '/schedule', '/attendance'])
    return navItems.filter((item) => !tabKeys.has(item.key))
  }, [navItems])

  useEffect(() => {
    const saved = localStorage.getItem('admin_sider_collapsed')
    if (saved !== null) setCollapsed(saved === 'true')
  }, [])

  if (isMobile === null) return null

  if (isMobile) {
    return (
      <MobileLayout
        mode="tabs"
        navItems={navItems}
        bottomTabs={adminBottomTabs}
        moreItems={moreItems}
        title="牧哲学堂 管理"
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
      <Layout style={{ marginLeft: collapsed ? 72 : 220, transition: 'margin-left 0.2s' }}>
        <TopNav />
        <Content style={{ padding: 24, minHeight: 'calc(100vh - 64px)' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
