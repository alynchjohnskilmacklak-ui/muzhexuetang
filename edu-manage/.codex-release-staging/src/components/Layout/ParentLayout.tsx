'use client'

import { useEffect, useState } from 'react'
import { Avatar, Badge, Dropdown, Layout, Menu, Space, Tooltip } from 'antd'
import {
  AccountBookOutlined,
  BankOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  CommentOutlined,
  CrownOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  HomeOutlined,
  IdcardOutlined,
  LogoutOutlined,
  MenuOutlined,
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
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useKickListener } from '@/hooks/useKickListener'
import { useSessionPing } from '@/hooks/useSessionPing'
import { clearSensitiveBrowserStorage } from '@/lib/client-sensitive-storage'
import { ParentUsageGuideDrawerExtra } from '@/components/Parent/ParentUsageGuide'
import { MobileLayout, type MobileNavItem } from './MobileLayout'
import type { MembershipLevel } from '@/constants/membership'

const { Sider, Content, Header } = Layout
const fetcher = (url: string) => fetch(url).then((res) => res.json())

function flattenNavItems(items: MobileNavItem[]): MobileNavItem[] {
  return items.flatMap(item => item.children ? flattenNavItems(item.children) : [item])
}

function resolveActiveKey(pathname: string, items: MobileNavItem[], fallback: string) {
  const exact = items.find(item => item.key === pathname)
  if (exact) return exact.key

  const match = items
    .filter(item => pathname.startsWith(`${item.key}/`))
    .sort((a, b) => b.key.length - a.key.length)[0]

  return match?.key || fallback
}

export function ParentLayout({ children, initialMembershipLevel }: { children: React.ReactNode; initialMembershipLevel: MembershipLevel }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(false)
  const [backgroundReady, setBackgroundReady] = useState(false)
  const [parentTheme, setParentTheme] = useState<'normal' | 'vip' | 'svip'>(() => initialMembershipLevel.toLowerCase() as 'normal' | 'vip' | 'svip')
  const { data: unreadData, mutate: mutateUnread } = useSWR(
    backgroundReady ? '/api/parent/unread-counts' : null,
    fetcher,
    { refreshInterval: 30_000, revalidateOnFocus: true, revalidateOnReconnect: true },
  )
  useKickListener()
  useSessionPing({ initialDelay: 6_000 })

  useEffect(() => {
    const timer = window.setTimeout(() => setBackgroundReady(true), 1_200)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const onThemeChange = (event: Event) => {
      const level = (event as CustomEvent<MembershipLevel>).detail
      if (level === 'VIP' || level === 'SVIP') setParentTheme(level.toLowerCase() as 'vip' | 'svip')
      else setParentTheme('normal')
    }
    window.addEventListener('parent-theme-change', onThemeChange)
    return () => window.removeEventListener('parent-theme-change', onThemeChange)
  }, [])

  const navTheme = parentTheme === 'svip'
    ? { accent: '#C9A45C', tabBg: '#123C35', tabBorder: '1px solid rgba(201,164,92,.42)', accentBg: 'rgba(201,164,92,.12)', tabActive: '#F6E9C8', tabInactive: 'rgba(246,233,200,.78)' }
    : parentTheme === 'vip'
      ? { accent: '#A9512A', tabBg: 'linear-gradient(180deg,#9A4622 0%,#7E3A1C 100%)', tabBorder: '1px solid rgba(255,236,222,.22)', accentBg: 'rgba(169,81,42,.10)', tabActive: '#FFF6EF', tabInactive: 'rgba(255,244,236,.74)' }
      : { accent: 'var(--color-role-parent)', tabBg: '#ffffff', tabBorder: '1px solid rgba(0,0,0,.06)', accentBg: 'var(--color-role-parent-bg)' }

  const headerTheme = parentTheme === 'svip'
    ? undefined
    : parentTheme === 'vip'
      ? { bg: 'linear-gradient(180deg,#FFF9F4 0%,#FFEFE3 100%)', fg: '#7E3A1C', border: '1px solid rgba(169,81,42,.18)', mainBg: '#FFF7F1', dark: false }
      : undefined

  useEffect(() => {
    const saved = localStorage.getItem('parent_sider_collapsed')
    if (saved !== null) setCollapsed(saved === 'true')
  }, [])

  useEffect(() => {
    localStorage.setItem('parent_sider_collapsed', String(collapsed))
  }, [collapsed])

  const unread = {
    papers: Number(unreadData?.papers || 0),
    posts: Number(unreadData?.posts || 0),
    notifications: Number(unreadData?.notifications || 0),
    studyHallHomework: Number(unreadData?.studyHallHomework || 0),
    feedbacks: Number(unreadData?.feedbacks || 0),
    messages: Number(unreadData?.messages || 0),
  }
  const totalUnread = unread.papers + unread.posts + unread.notifications + unread.feedbacks + unread.messages

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true, onClick: () => {
        clearSensitiveBrowserStorage()
        return signOut({ callbackUrl: `${window.location.origin}/login` })
      } },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'profile') router.push('/parent/profile')
    },
  }

  const navItems: MobileNavItem[] = [
    { key: '/parent/dashboard', icon: <HomeOutlined />, label: '首页' },
    { key: '/parent/services', icon: <AppstoreOutlined />, label: '业务总览' },
    { key: 'growth-group', icon: <HomeOutlined />, label: '孩子学习', children: [
      { key: '/parent/schedule', icon: <CalendarOutlined />, label: '课程表' },
      { key: '/parent/class-feedback', icon: <BookOutlined />, label: '课堂反馈', badge: unread.feedbacks },
      { key: '/parent/study-hall', icon: <ReadOutlined />, label: '晚托作业', badge: unread.studyHallHomework },
      { key: '/parent/archive', icon: <FileTextOutlined />, label: '成长档案', badge: unread.papers + unread.posts },
      { key: '/parent/teachers', icon: <TeamOutlined />, label: '教师信息' },
    ] },
    { key: 'family-group', icon: <CommentOutlined />, label: '家校服务', children: [
      { key: '/parent/notifications', icon: <BellOutlined />, label: '通知', badge: unread.notifications },
      { key: '/parent/messages', icon: <CommentOutlined />, label: '我的留言', badge: unread.messages },
      { key: '/parent/leave', icon: <CalendarOutlined />, label: '请假' },
      { key: '/parent/meals', icon: <CoffeeOutlined />, label: '就餐安排' },
      { key: '/parent/archive?tab=hours', icon: <ClockCircleOutlined />, label: '课时与考勤' },
      { key: '/parent/fees', icon: <AccountBookOutlined />, label: '缴费账单' },
    ] },
    { key: 'volunteer-group', icon: <BankOutlined />, label: '升学服务', children: [
      { key: '/parent/volunteer/schools', icon: <BankOutlined />, label: '高中学校库' },
      { key: '/parent/volunteer', icon: <ReadOutlined />, label: '志愿咨询' },
      { key: '/parent/volunteer/rank-query', icon: <BarChartOutlined />, label: '一分一档位次' },
    ] },
    { key: 'resource-group', icon: <ReadOutlined />, label: '学习工具', children: [
      { key: '/parent/materials', icon: <ReadOutlined />, label: '学习资料' },
      { key: '/parent/phet', icon: <ExperimentOutlined />, label: '仿真教学' },
      { key: '/parent/ai', icon: <MessageFilled />, label: 'AI 助手' },
    ] },
    { key: 'account-group', icon: <IdcardOutlined />, label: '账户与服务', children: [
      { key: '/parent/benefits', icon: <CrownOutlined />, label: '会员权益' },
      { key: '/parent/bind', icon: <WechatOutlined />, label: '绑定微信' },
      { key: '/parent/profile', icon: <IdcardOutlined />, label: '个人中心' },
    ] },
  ]

  const leafItems = flattenNavItems(navItems)
  const bottomTabs: MobileNavItem[] = [
    { key: '/parent/dashboard', icon: <HomeOutlined />, label: '首页' },
    { key: '/parent/class-feedback', icon: <BookOutlined />, label: '课堂反馈', badge: unread.feedbacks },
    { key: '/parent/study-hall', icon: <ReadOutlined />, label: '晚托作业', badge: unread.studyHallHomework },
    { key: '/parent/notifications', icon: <BellOutlined />, label: '通知', badge: unread.notifications },
    { key: '__more', icon: <MenuOutlined />, label: '更多' },
  ]
  const currentKey = resolveActiveKey(pathname, leafItems, '/parent/dashboard')
  const defaultOpenKeys = navItems.filter(item => item.children?.some(child => child.key === currentKey)).map(item => item.key)

  const markAllRead = async () => {
    try {
      const responses = await Promise.all([
        fetch('/api/parent/notifications/read-all', { method: 'PATCH' }),
        fetch('/api/messages/read-all', { method: 'PATCH' }),
      ])
      if (responses.some((response) => !response.ok)) throw new Error('批量已读操作失败')
      await mutateUnread()
      toast.success('已全部标为已读')
    } catch {
      toast.error('未能全部标为已读，请检查网络后重试')
    }
  }

  const menuItems = navItems.map(item => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
    children: item.children?.map(child => ({
      key: child.key,
      icon: child.icon,
      label: (child.badge ?? 0) > 0 ? (
        <Badge dot size="small" offset={[4, 0]}><span>{child.label}</span></Badge>
      ) : child.label,
    })),
  }))

  if (isMobile === null) return <div aria-hidden="true" style={{ minHeight: '100dvh', background: parentTheme === 'svip' ? '#F6F2E9' : parentTheme === 'vip' ? '#FFF7F1' : 'var(--color-canvas)' }} />

  if (isMobile) {
    return (
      <MobileLayout
        mode="tabs"
        navItems={navItems}
        bottomTabs={bottomTabs}
        moreItems={navItems}
        title="牧哲学堂"
        roleLabel="家长端"
        menuLabel="菜单"
        accentColor={navTheme.accent}
        accentBackground={navTheme.accentBg}
        tabBackground={navTheme.tabBg}
        tabBorderTop={navTheme.tabBorder}
        tabActiveColor={(navTheme as any).tabActive}
        tabInactiveColor={(navTheme as any).tabInactive}
        headerTheme={headerTheme}
        pageTheme={parentTheme}
        drawerHeaderExtra={(
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <ParentUsageGuideDrawerExtra parentUserId={session?.user?.id} />
            {totalUnread > 0 && (
              <button type="button" onClick={markAllRead} style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                background: 'rgba(232,120,74,.08)', border: '1px solid rgba(232,120,74,.2)',
                color: '#E8784A', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                <CheckOutlined /> 一键已读（{totalUnread}条未读）
              </button>
            )}
          </Space>
        )}
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
          background: '#faf8f5',
          borderRight: '1px solid rgba(0,0,0,.06)',
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
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? 0 : '0 12px 0 20px',
          borderBottom: '1px solid rgba(0,0,0,.06)',
        }}>
          {!collapsed && (
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-ink)', whiteSpace: 'nowrap' }}>牧哲学堂 <small style={{ color: 'var(--color-role-parent)', fontSize: 11 }}>家长端</small></span>
          )}
          <Tooltip title={collapsed ? '展开导航' : '收起导航'}>
            <button
              type="button"
              aria-label={collapsed ? '展开导航' : '收起导航'}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                border: '1px solid rgba(232,120,74,.2)',
                cursor: 'pointer',
                background: 'rgba(232,120,74,.08)',
                color: '#E8784A',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </Tooltip>
        </div>

        <Menu
          className="role-navigation role-navigation--parent"
          mode="inline"
          selectedKeys={[currentKey]}
          defaultOpenKeys={defaultOpenKeys}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ borderInlineEnd: 'none', background: 'transparent', marginTop: 8, fontSize: 14 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 72 : 220, background: '#faf8f5' }}>
        <Header style={{
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0,0,0,.08)',
          height: 56,
          position: 'sticky',
          top: 0,
          zIndex: 97,
          background: '#fff',
          gap: 16,
        }}>
          <span style={{ color: 'var(--color-ink-muted)', fontSize: 13, fontWeight: 600 }}>家长中心</span>
          <Space size={12}>
          <Badge count={totalUnread} size="small">
            <button
              type="button"
              aria-label={totalUnread > 0 ? `查看通知，${totalUnread} 条未读` : '查看通知'}
              onClick={() => router.push('/parent/notifications')}
              style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', padding: 0, border: 0, borderRadius: 10, background: 'transparent', color: 'var(--color-ink-muted)', cursor: 'pointer' }}
            >
              <BellOutlined style={{ fontSize: 18 }} />
            </button>
          </Badge>
          <Dropdown menu={userMenu} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: 'var(--color-role-parent)' }} />
              <span style={{ fontSize: 14, color: '#1a1201' }}>{session?.user?.name || '家长'}</span>
            </Space>
          </Dropdown>
          </Space>
        </Header>

        <Content style={{ padding: 24, maxWidth: pathname.startsWith('/parent/volunteer') ? 1140 : 800, margin: '0 auto', width: '100%' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
