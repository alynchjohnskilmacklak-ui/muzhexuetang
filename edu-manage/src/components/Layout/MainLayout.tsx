'use client'

import { Suspense, useEffect, useState } from 'react'
import { Layout, Spin } from 'antd'
import {
  BarChartOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  CoffeeOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DollarOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  HomeOutlined,
  MessageFilled,
  MessageOutlined,
  ReadOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Sidebar } from './Sidebar'
import { TopNav } from './TopNav'
import { MobileLayout } from './MobileLayout'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useKickListener } from '@/hooks/useKickListener'
import { useSessionPing } from '@/hooks/useSessionPing'

const { Content } = Layout

const adminNavItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '数据总览' },
  { key: '/students', icon: <UserOutlined />, label: '学员管理' },
  { key: '/teachers', icon: <TeamOutlined />, label: '教师管理' },
  { key: '/courses', icon: <BookOutlined />, label: '课程管理' },
  { key: '/schedule', icon: <CalendarOutlined />, label: '排课系统' },
  { key: '/attendance', icon: <CheckSquareOutlined />, label: '考勤管理' },
  { key: '/meals', icon: <CoffeeOutlined />, label: '就餐管理' },
  { key: '/fees', icon: <DollarOutlined />, label: '收费管理' },
  { key: '/grades', icon: <FileTextOutlined />, label: '学习档案' },
  { key: '/notifications', icon: <MessageOutlined />, label: '消息通知' },
  { key: '/reports', icon: <BarChartOutlined />, label: '数据报表' },
  { key: '/data-admin', icon: <DatabaseOutlined />, label: '数据管理' },
  { key: '/login-records', icon: <SafetyOutlined />, label: '登录记录' },
  { key: '/volunteer', icon: <ReadOutlined />, label: '志愿填报' },
  { key: '/volunteer-sim', icon: <ExperimentOutlined />, label: '志愿模拟' },
  { key: '/volunteer-sim/schools', icon: <HomeOutlined />, label: '学校信息' },
  { key: '/materials', icon: <ReadOutlined />, label: '学习资料' },
  { key: '/phet', icon: <ExperimentOutlined />, label: '仿真教学' },
  { key: '/ai', icon: <MessageFilled />, label: 'AI 助手' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
]

export function MainLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(false)
  useKickListener()
  useSessionPing()

  useEffect(() => {
    const saved = localStorage.getItem('admin_sider_collapsed')
    if (saved !== null) setCollapsed(saved === 'true')
  }, [])

  if (isMobile === null) return null

  if (isMobile) {
    return (
      <MobileLayout mode="drawer" navItems={adminNavItems} title="牧哲学堂 管理">
        {children}
      </MobileLayout>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Suspense fallback={<div style={{ width: 72, height: '100vh', position: 'fixed', left: 0, top: 0, background: '#fff', borderRight: '1px solid #EEE7E1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin /></div>}>
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
