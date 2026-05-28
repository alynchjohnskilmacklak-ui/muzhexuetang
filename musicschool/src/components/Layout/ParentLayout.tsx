'use client'

import { useEffect, useState } from 'react'
import { Avatar, Badge, Dropdown, Layout, Menu, Space, Tooltip } from 'antd'
import {
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  HeartOutlined,
  HomeOutlined,
  IdcardOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageFilled,
  ReadOutlined,
  TeamOutlined,
  UserOutlined,
  WechatOutlined,
} from '@ant-design/icons'
import { signOut, useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobileLayout } from './MobileLayout'

const { Sider, Content, Header } = Layout
const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function ParentLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('parent_sider_collapsed') === 'true'
    }
    return false
  })
  const { data: unreadData } = useSWR('/api/parent/unread-counts', fetcher, { refreshInterval: 30_000 })
  useEffect(() => {
    localStorage.setItem('parent_sider_collapsed', String(collapsed))
  }, [collapsed])

  const unread = {
    papers: Number(unreadData?.papers || 0),
    posts: Number(unreadData?.posts || 0),
    notifications: Number(unreadData?.notifications || 0),
  }
  const totalUnread = unread.papers + unread.posts + unread.notifications

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true, onClick: () => signOut({ callbackUrl: '/login' }) },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'profile') router.push('/parent/profile')
    },
  }

  type NavItem = { key: string; icon: React.ReactNode; label: string; badge?: number }
  const navItems: NavItem[] = [
    { key: '/parent/dashboard', icon: <HomeOutlined />, label: '首页' },
    { key: '/parent/schedule', icon: <CalendarOutlined />, label: '今日课次' },
    { key: '/parent/class-feedback', icon: <BookOutlined />, label: '课堂反馈' },
    { key: '/parent/archive', icon: <FileTextOutlined />, label: '学习档案', badge: unread.papers },
    { key: '/parent/hour-records', icon: <ClockCircleOutlined />, label: '课时明细' },
    { key: '/parent/growth', icon: <HeartOutlined />, label: '成长动态', badge: unread.posts },
    { key: '/parent/meals', icon: <CoffeeOutlined />, label: '就餐安排' },
    { key: '/parent/notifications', icon: <BellOutlined />, label: '通知' },
    { key: '/parent/leave', icon: <CalendarOutlined />, label: '请假' },
    { key: '/parent/teachers', icon: <TeamOutlined />, label: '教师信息' },
    { key: '/parent/materials', icon: <ReadOutlined />, label: '学习资料' },
    { key: '/parent/phet', icon: <ExperimentOutlined />, label: '仿真教学' },
    { key: '/parent/ai', icon: <MessageFilled />, label: 'AI 助手' },
    { key: '/parent/volunteer', icon: <ReadOutlined />, label: '志愿填报' },
    { key: '/parent/volunteer/schools', icon: <TeamOutlined />, label: '学校信息' },
    { key: '/parent/bind', icon: <WechatOutlined />, label: '绑定微信' },
    { key: '/parent/profile', icon: <IdcardOutlined />, label: '个人中心' },
  ]

  const currentKey = navItems.find(item => pathname.startsWith(item.key))?.key || '/parent/dashboard'

  const menuItems = navItems.map(item => ({
    key: item.key,
    icon: item.icon,
    label: (item.badge ?? 0) > 0 ? (
      <Badge dot size="small" offset={[4, 0]}>
        <span>{item.label}</span>
      </Badge>
    ) : item.label,
  }))

  const parentMobileNavItems = [
    { key: '/parent/dashboard', icon: <HomeOutlined />, label: '首页' },
    { key: '/parent/schedule', icon: <CalendarOutlined />, label: '今日课次' },
    { key: '/parent/class-feedback', icon: <BookOutlined />, label: '课堂反馈' },
    { key: '/parent/archive', icon: <FileTextOutlined />, label: '学习档案', badge: unread.papers },
    { key: '/parent/hour-records', icon: <ClockCircleOutlined />, label: '课时明细' },
    { key: '/parent/growth', icon: <HeartOutlined />, label: '成长动态', badge: unread.posts },
    { key: '/parent/meals', icon: <CoffeeOutlined />, label: '就餐安排' },
    { key: '/parent/notifications', icon: <BellOutlined />, label: '通知消息', badge: unread.notifications },
    { key: '/parent/leave', icon: <CalendarOutlined />, label: '请假申请' },
    { key: '/parent/teachers', icon: <TeamOutlined />, label: '教师信息' },
    { key: '/parent/materials', icon: <ReadOutlined />, label: '学习资料' },
    { key: '/parent/phet', icon: <ExperimentOutlined />, label: '仿真教学' },
    { key: '/parent/ai', icon: <MessageFilled />, label: 'AI 助手' },
    { key: '/parent/volunteer', icon: <ReadOutlined />, label: '志愿填报' },
    { key: '/parent/volunteer/schools', icon: <TeamOutlined />, label: '学校信息' },
    { key: '/parent/bind', icon: <WechatOutlined />, label: '绑定微信' },
    { key: '/parent/profile', icon: <IdcardOutlined />, label: '个人中心' },
  ]

  if (isMobile) {
    return (
      <MobileLayout navItems={parentMobileNavItems}>
        <div style={{ padding: 12 }}>{children}</div>
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
        {/* Logo + Collapse button at top */}
        <div style={{
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: collapsed ? '0 12px' : '0 12px 0 20px', borderBottom: '1px solid #F0DDD2',
        }}>
          {collapsed ? (
            <span style={{ fontSize: 22, fontWeight: 700, color: '#E8784A' }}>牧</span>
          ) : (
            <span style={{ fontSize: 17, fontWeight: 700, color: '#E8784A', whiteSpace: 'nowrap' }}>
              牧哲学堂
            </span>
          )}
          <Tooltip title={collapsed ? '展开导航' : '收起导航'}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(232,120,74,.2)',
                cursor: 'pointer', background: 'rgba(232,120,74,.08)', color: '#E8784A',
                fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </Tooltip>
        </div>

        {/* Menu */}
        <Menu
          mode="inline"
          selectedKeys={[currentKey]}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{
            borderInlineEnd: 'none',
            background: 'transparent',
            marginTop: 8,
            fontSize: 14,
          }}
        />
      </Sider>

      {/* Main content area */}
      <Layout style={{ marginLeft: collapsed ? 72 : 220, transition: 'margin-left 0.2s', background: '#faf8f5' }}>
        <Header style={{
          padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          borderBottom: '1px solid rgba(0,0,0,.08)', height: 56, position: 'sticky', top: 0,
          zIndex: 97, background: '#fff', gap: 16,
        }}>
          <Badge count={totalUnread} size="small">
            <BellOutlined
              style={{ fontSize: 18, color: '#5a4e3a', cursor: 'pointer' }}
              onClick={() => router.push('/parent/notifications')}
            />
          </Badge>
          <Dropdown menu={userMenu} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: '#E8784A' }} />
              <span style={{ fontSize: 14, color: '#1a1201' }}>{session?.user?.name || '家长'}</span>
            </Space>
          </Dropdown>
        </Header>

        <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
