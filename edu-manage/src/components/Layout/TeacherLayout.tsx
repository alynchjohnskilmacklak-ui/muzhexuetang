'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Avatar, Badge, Dropdown, Layout, Menu, Spin, Tooltip } from 'antd'
import useSWR from 'swr'
import {
  CalendarOutlined,
  CheckSquareOutlined,
  CoffeeOutlined,
  DashboardOutlined,
  DollarOutlined,
  EllipsisOutlined,
  ExperimentOutlined,
  FileImageOutlined,
  FolderOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageFilled,
  MessageOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { signOut } from 'next-auth/react'
import { normalizeUploadUrl } from '@/lib/upload-url'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useKickListener } from '@/hooks/useKickListener'
import { useSessionPing } from '@/hooks/useSessionPing'
import { MobileLayout, type MobileNavItem } from './MobileLayout'

const { Sider, Content, Header } = Layout

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface TeacherData {
  teacher: { id: string; name: string; avatar?: string | null }
  badges: { unsubmitted: number; unpublished: number; unread: number; unreadMessages: number }
}

type NavItem = MobileNavItem & { badgeKey?: keyof TeacherData['badges'] | null }

const navItems: NavItem[] = [
  { key: '/teacher/dashboard', icon: <DashboardOutlined />, label: '工作台' },
  { key: '/teacher/messages', icon: <MessageOutlined />, label: '家长留言', badgeKey: 'unreadMessages' },
  { key: '/teacher/leave', icon: <CalendarOutlined />, label: '请假审批' },
  { key: '/teacher/schedule', icon: <CalendarOutlined />, label: '我的课表' },
  { key: '/teacher/attendance', icon: <CheckSquareOutlined />, label: '考勤录入', badgeKey: 'unsubmitted' },
  { key: '/teacher/meals', icon: <CoffeeOutlined />, label: '就餐上报' },
  { key: '/teacher/papers', icon: <FileImageOutlined />, label: '试卷上传' },
  { key: '/teacher/feedback', icon: <MessageOutlined />, label: '成长反馈', badgeKey: 'unpublished' },
  { key: '/teacher/materials', icon: <FolderOutlined />, label: '学习资料' },
  { key: '/teacher/students', icon: <TeamOutlined />, label: '我的学员' },
  { key: '/teacher/phet', icon: <ExperimentOutlined />, label: '仿真教学' },
  { key: '/teacher/salary', icon: <DollarOutlined />, label: '我的薪资' },
  { key: '/teacher/ai', icon: <MessageFilled />, label: 'AI 助手' },
]

function withBadges(items: NavItem[], data: TeacherData | null): MobileNavItem[] {
  return items.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
    badge: item.badgeKey && data ? data.badges[item.badgeKey] || 0 : undefined,
  }))
}

export function TeacherLayout({ children, initialData }: { children: React.ReactNode; initialData?: TeacherData }) {
  const pathname = usePathname()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(false)
  const [data, setData] = useState<TeacherData | null>(initialData || null)
  useKickListener()
  useSessionPing()

  useEffect(() => {
    const saved = localStorage.getItem('teacher_sider_collapsed')
    if (saved !== null) setCollapsed(saved === 'true')
  }, [])

  useEffect(() => {
    localStorage.setItem('teacher_sider_collapsed', String(collapsed))
  }, [collapsed])

  const { data: dashData } = useSWR('/api/teacher/dashboard', fetcher, {
    refreshInterval: 300_000,
    revalidateOnFocus: true,
    dedupingInterval: 30_000,
  })

  useEffect(() => {
    if (dashData?.teacher) {
      setData({
        teacher: dashData.teacher,
        badges: dashData.badges || { unsubmitted: 0, unpublished: 0, unread: 0, unreadMessages: 0 },
      })
    }
  }, [dashData])

  const selectedKey = navItems.find(item => pathname.startsWith(item.key))?.key || '/teacher/dashboard'
  const mobileNavItems = withBadges(navItems, data)
  const teacherBottomTabs: MobileNavItem[] = withBadges([
    { key: '/teacher/dashboard', icon: <DashboardOutlined />, label: '工作台' },
    { key: '/teacher/schedule', icon: <CalendarOutlined />, label: '课表' },
    { key: '/teacher/attendance', icon: <CheckSquareOutlined />, label: '考勤', badgeKey: 'unsubmitted' },
    { key: '/teacher/feedback', icon: <MessageOutlined />, label: '反馈', badgeKey: 'unpublished' },
  ], data)
  teacherBottomTabs.push({ key: '__more', icon: <EllipsisOutlined />, label: '更多' })
  const teacherMoreItems = mobileNavItems.filter(item => !['/teacher/dashboard', '/teacher/schedule', '/teacher/attendance', '/teacher/feedback'].includes(item.key))
  const todoTotal = (data?.badges?.unsubmitted || 0) + (data?.badges?.unpublished || 0)

  const menuItems = navItems.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.badgeKey && data ? (
      <Badge count={data.badges[item.badgeKey] || 0} size="small" offset={[8, 0]}>
        {item.label}
      </Badge>
    ) : item.label,
  }))

  if (isMobile === null) return null

  if (isMobile) {
    return (
      <MobileLayout
        mode="tabs"
        navItems={mobileNavItems}
        bottomTabs={teacherBottomTabs}
        moreItems={teacherMoreItems}
        title="牧哲学堂 教师"
        drawerHeaderExtra={todoTotal > 0 ? (
          <div style={{ fontSize: 12, color: '#E8784A', background: 'rgba(232,120,74,.08)',
            borderRadius: 8, padding: '8px 12px', border: '1px solid rgba(232,120,74,.15)' }}>
            ⚠️ 待办：{data?.badges?.unsubmitted ? `${data.badges.unsubmitted}节考勤未提交` : ''}
            {data?.badges?.unsubmitted && data?.badges?.unpublished ? '，' : ''}
            {data?.badges?.unpublished ? `${data.badges.unpublished}条反馈未发布` : ''}
          </div>
        ) : undefined}
      >
        {children}
      </MobileLayout>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={220}
        collapsedWidth={72}
        style={{
          background: '#FFFBF7',
          borderRight: '1px solid #F0DDD2',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 98,
          overflow: 'auto',
        }}
      >
        <div style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: collapsed ? '0 12px' : '0 12px 0 20px',
          borderBottom: '1px solid #F0DDD2',
        }}>
          <Link href="/teacher/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Image src="/images/logo.jpg" alt="" width={28} height={28} style={{ borderRadius: 6, objectFit: 'contain' }} unoptimized />
            {!collapsed && <span style={{ fontSize: 14, fontWeight: 700, color: '#E87545', whiteSpace: 'nowrap' }}>牧哲学堂 · 教师端</span>}
          </Link>
          <Tooltip title={collapsed ? '展开导航' : '收起导航'}>
            <button onClick={() => setCollapsed(!collapsed)} style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid rgba(232,120,74,.2)',
              cursor: 'pointer',
              background: 'rgba(232,120,74,.08)',
              color: '#E8784A',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </Tooltip>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ borderInlineEnd: 'none', background: 'transparent', marginTop: 8, fontSize: 14 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 72 : 220, transition: 'margin-left 0.2s', background: '#faf8f5' }}>
        <Header style={{
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          borderBottom: '1px solid #EEE7E1',
          height: 56,
          position: 'sticky',
          top: 0,
          zIndex: 97,
          background: '#fff',
          gap: 16,
        }}>
          {data ? (
            <Dropdown menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => signOut({ callbackUrl: '/login' }) }] }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Avatar size={28} icon={<UserOutlined />} src={normalizeUploadUrl(data.teacher.avatar) || undefined} />
                <span style={{ fontSize: 13, color: '#1a1201', whiteSpace: 'nowrap' }}>{data.teacher.name}</span>
              </div>
            </Dropdown>
          ) : <Spin size="small" />}
        </Header>
        <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto', width: '100%' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
