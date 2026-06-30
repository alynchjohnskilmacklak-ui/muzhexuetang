'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Layout, Spin } from 'antd'
import {
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  CoffeeOutlined,
  CommentOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DollarOutlined,
  ExperimentOutlined,
  FileTextOutlined,
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
import { MobileLayout, type MobileNavItem } from './MobileLayout'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useKickListener } from '@/hooks/useKickListener'
import { useSessionPing } from '@/hooks/useSessionPing'

const { Content } = Layout

// Mobile admin menu. Keep in sync with Sidebar.tsx menuItems for desktop.
// When adding or removing admin routes, update both places.
const adminNavItems: MobileNavItem[] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '数据总览' },
  { key: '/students', icon: <UserOutlined />, label: '学员管理' },
  { key: 'teacher-group', icon: <TeamOutlined />, label: '教师管理', children: [
    { key: '/teachers', icon: <TeamOutlined />, label: '教师档案' },
    { key: '/teacher-logs', icon: <ClockCircleOutlined />, label: '行为日志' },
    { key: '/teacher-salary', icon: <DollarOutlined />, label: '薪资管理' },
  ] },
  { key: '/courses', icon: <BookOutlined />, label: '课程管理' },
  { key: 'schedule-group', icon: <CalendarOutlined />, label: '排课系统', children: [
    { key: '/schedule', icon: <CalendarOutlined />, label: '教室矩阵（精品班课）' },
    { key: '/schedule/intensive', icon: <CalendarOutlined />, label: '突击全能班（1对1/2/3）' },
    { key: '/schedule?view=teacher-week', icon: <CalendarOutlined />, label: '教师课表' },
    { key: '/schedule?view=week-heatmap', icon: <CalendarOutlined />, label: '周总览' },
  ] },
  { key: '/attendance', icon: <CheckSquareOutlined />, label: '考勤管理' },
  { key: '/classroom-feedback', icon: <MessageOutlined />, label: '成长反馈' },
  { key: 'finance-group', icon: <DollarOutlined />, label: '财务后勤', children: [
    { key: '/fees', icon: <DollarOutlined />, label: '收费管理' },
    { key: '/meals', icon: <CoffeeOutlined />, label: '就餐管理' },
  ] },
  { key: '/student-archive', icon: <FileTextOutlined />, label: '学习档案' },
  { key: 'comm-group', icon: <CommentOutlined />, label: '沟通中心', children: [
    { key: '/parent-messages', icon: <MessageOutlined />, label: '家长留言' },
    { key: '/notifications', icon: <BellOutlined />, label: '消息通知' },
  ] },
  { key: '/reports', icon: <BarChartOutlined />, label: '数据报表' },
  { key: '/data-admin', icon: <DatabaseOutlined />, label: '数据管理' },
  { key: '/login-records', icon: <SafetyOutlined />, label: '登录记录' },
  { key: 'volunteer-group', icon: <ExperimentOutlined />, label: '中考志愿', children: [
    { key: '/volunteer', icon: <ReadOutlined />, label: '志愿咨询' },
    { key: '/volunteer-sim', icon: <ExperimentOutlined />, label: '中考模拟测算' },
    { key: '/volunteer-sim/schools', icon: <ReadOutlined />, label: '高中学校库' },
    { key: '/volunteer-sim/rank-query', icon: <BarChartOutlined />, label: '一分一档位次' },
  ] },
  { key: 'resource-group', icon: <ReadOutlined />, label: '教学资源', children: [
    { key: '/materials', icon: <ReadOutlined />, label: '学习资料' },
    { key: '/phet', icon: <ExperimentOutlined />, label: '仿真教学' },
    { key: '/ai', icon: <MessageFilled />, label: 'AI 助手' },
  ] },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
]

export function MainLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(false)
  const { data: session } = useSession()
  useKickListener()
  useSessionPing()

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
      <MobileLayout mode="drawer" navItems={visibleNavItems} title="牧哲学堂 管理">
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
