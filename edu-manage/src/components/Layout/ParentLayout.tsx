'use client'

import { useEffect, useState } from 'react'
import { Avatar, Badge, Dropdown, Layout, Menu, Space, Tooltip } from 'antd'
import {
  AccountBookOutlined,
  BankOutlined,
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckOutlined,
  CoffeeOutlined,
  CommentOutlined,
  CompassOutlined,
  CrownFilled,
  CrownOutlined,
  EditOutlined,
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
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { fetchJson } from '@/lib/fetch-json'
import { isNavigationActive } from '@/lib/navigation-active'
import useSWR from 'swr'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'
import { summarizeUnreadByType } from '@/constants/notification-types'
import { useKickListener } from '@/hooks/useKickListener'
import { useSessionPing } from '@/hooks/useSessionPing'
import { clearSensitiveBrowserStorage } from '@/lib/client-sensitive-storage'
import BrandBackground from '@/components/BrandBackground'
import { ParentUsageGuideDrawerExtra } from '@/components/Parent/ParentUsageGuide'
import { MobileLayout, type MobileNavItem } from './MobileLayout'
import { LayoutHydrationFallback } from './LayoutHydrationFallback'
import type { MembershipLevel } from '@/constants/membership'

const { Sider, Content, Header } = Layout
const fetcher = ([url]: readonly [string, string]) => fetchJson<Record<string, number>>(url)

function flattenNavItems(items: MobileNavItem[]): MobileNavItem[] {
  return items.flatMap(item => item.children ? flattenNavItems(item.children) : [item])
}

function resolveActiveKey(pathname: string, search: string, items: MobileNavItem[], fallback: string) {
  const match = items
    .filter(item => isNavigationActive(pathname, search, item.key))
    .sort((a, b) => b.key.length - a.key.length)[0]

  return match?.key || fallback
}

export function ParentLayout({ children, initialMembershipLevel }: { children: React.ReactNode; initialMembershipLevel: MembershipLevel }) {
  const { data: session } = useSession()
  const unreadUserId = (session?.user as { id?: string } | undefined)?.id
  const pathname = usePathname()
  const isParentDashboard = pathname === '/parent/dashboard'
  const searchParams = useSearchParams()
  const router = useRouter()
  // 手机横屏时视口宽度可能超过 768px，仍应保持家长端的触控导航。
  // Keep the drawer/tab navigation through tablet widths so pages get the
  // full viewport instead of sharing it with an icon-only sidebar.
  const isMobile = useIsMobile(1025, true)
  const isTablet = useIsMobile(1025)
  const [collapsed, setCollapsed] = useState(false)
  const [tabletNavExpanded, setTabletNavExpanded] = useState(false)
  const effectiveCollapsed = isTablet ? !tabletNavExpanded : collapsed
  const [backgroundReady, setBackgroundReady] = useState(false)
  const [markingAllRead, setMarkingAllRead] = useState(false)
  const [parentTheme, setParentTheme] = useState<'normal' | 'vip' | 'svip'>(() => initialMembershipLevel.toLowerCase() as 'normal' | 'vip' | 'svip')
  const { data: unreadData, error: unreadError, mutate: mutateUnread } = useSWR(
    backgroundReady && unreadUserId ? ['/api/parent/unread-counts', unreadUserId] as const : null,
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

  // 学员等级主题系统（SVIP / VIP / 普通）：顶栏、底栏、主背景全流程贯穿
  const navTheme = parentTheme === 'svip'
    ? {
        accent: '#C9A45C',
        tabBg: 'rgba(13, 55, 50, 0.96)',
        tabBorder: '1px solid rgba(201, 164, 92, 0.35)',
        accentBg: 'linear-gradient(135deg, rgba(201, 164, 92, 0.32) 0%, rgba(201, 164, 92, 0.18) 100%)',
        tabActive: '#F6E9C8',
        tabInactive: 'rgba(246, 233, 200, 0.68)',
      }
    : parentTheme === 'vip'
      ? {
          accent: '#E8784A',
          tabBg: 'rgba(18, 64, 56, 0.95)',
          tabBorder: '1px solid rgba(232, 120, 74, 0.28)',
          accentBg: 'linear-gradient(135deg, rgba(232, 120, 74, 0.28) 0%, rgba(245, 158, 11, 0.18) 100%)',
          tabActive: '#FFA26B',
          tabInactive: 'rgba(255, 238, 226, 0.68)',
        }
      : {
          accent: '#1B5B43',
          tabBg: 'rgba(255, 255, 255, 0.96)',
          tabBorder: '1px solid rgba(44, 110, 82, 0.15)',
          accentBg: 'linear-gradient(135deg, rgba(62, 142, 110, 0.22) 0%, rgba(44, 110, 82, 0.12) 100%)',
          tabActive: '#1B5B43',
          tabInactive: '#6C8077',
        }

  const tierLabel = parentTheme === 'svip' ? 'SVIP' : parentTheme === 'vip' ? 'VIP' : '普通'
  const tierBadge = parentTheme === 'svip'
    ? { bg: '#EFE2BE', color: '#7C5F22', border: '1px solid rgba(168,135,61,.45)' }
    : parentTheme === 'vip'
      ? { bg: '#FBE3D2', color: '#C2541F', border: '1px solid rgba(232,120,74,.35)' }
      : { bg: '#D8EAE2', color: '#0F4A3E', border: '1px solid rgba(20,87,77,.18)' }

  const headerTheme = parentTheme === 'svip'
    ? {
        bg: 'rgba(13, 55, 50, 0.96)',
        fg: '#F6E9C8',
        border: '1px solid rgba(201, 164, 92, 0.35)',
        mainBg: 'radial-gradient(ellipse at 50% 0%, rgba(201, 164, 92, 0.09) 0%, transparent 65%), linear-gradient(180deg, #F8F5EC 0%, #F1EADC 100%)',
        dark: true,
      }
    : parentTheme === 'vip'
      ? {
          bg: 'rgba(255, 248, 242, 0.96)',
          fg: '#14574D',
          border: '1px solid rgba(232, 120, 74, 0.22)',
          mainBg: 'radial-gradient(ellipse at 50% 0%, rgba(232, 120, 74, 0.08) 0%, transparent 65%), linear-gradient(180deg, #FDF9F5 0%, #F6ECE2 100%)',
          dark: false,
        }
      : {
          bg: 'rgba(246, 251, 248, 0.96)',
          fg: '#14574D',
          border: '1px solid rgba(44, 110, 82, 0.15)',
          mainBg: 'radial-gradient(ellipse at 50% 0%, rgba(44, 110, 82, 0.07) 0%, transparent 65%), linear-gradient(180deg, #F7FAF8 0%, #EEF4F0 100%)',
          dark: false,
        }

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
  const totalUnreadValue = Number(unreadData?.total ?? 0)
  const totalUnread = Number.isFinite(totalUnreadValue) ? Math.max(0, totalUnreadValue) : 0

  // 未读通知按类型分组摘要（如：课堂反馈3·考勤2·试卷1…）
  const notificationSummary = summarizeUnreadByType(unreadData?.notificationsByType as Record<string, number> | undefined)

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
    { key: 'growth-group', icon: <ReadOutlined />, label: '孩子学习', children: [
      { key: '/parent/schedule', icon: <CalendarOutlined />, label: '课程表' },
      { key: '/parent/vip', icon: <CrownFilled />, label: 'VIP课程' },
      { key: '/parent/class-feedback', icon: <BookOutlined />, label: '课堂反馈', badge: unread.feedbacks },
      { key: '/parent/homework', icon: <FileTextOutlined />, label: '普通课作业' },
      { key: '/parent/study-hall', icon: <ReadOutlined />, label: '晚托作业', badge: unread.studyHallHomework },
      { key: '/parent/archive', icon: <FileTextOutlined />, label: '成长档案', badge: unread.papers + unread.posts },
      { key: '/parent/teachers', icon: <TeamOutlined />, label: '教师信息' },
    ] },
    { key: 'family-group', icon: <CommentOutlined />, label: '家校服务', children: [
      { key: '/parent/notifications', icon: <BellOutlined />, label: '通知', badge: unread.notifications },
      { key: '/parent/messages', icon: <CommentOutlined />, label: '家校沟通', badge: unread.messages },
      { key: '/parent/leave', icon: <CalendarOutlined />, label: '请假' },
      { key: '/parent/meals', icon: <CoffeeOutlined />, label: '就餐安排' },
      { key: '/parent/fees', icon: <AccountBookOutlined />, label: '缴费账单' },
    ] },
    { key: 'volunteer-group', icon: <BankOutlined />, label: '升学服务', children: [
      { key: '/parent/volunteer/schools', icon: <BankOutlined />, label: '高中学校库' },
      { key: '/parent/volunteer', icon: <ReadOutlined />, label: '志愿咨询' },
      { key: '/parent/volunteer/simulation', icon: <EditOutlined />, label: '模拟填报' },
      { key: '/parent/volunteer/rank-query', icon: <BarChartOutlined />, label: '一分一档位次' },
    ] },
    { key: 'resource-group', icon: <CompassOutlined />, label: '学习工具', children: [
      { key: '/parent/materials', icon: <ReadOutlined />, label: '学习资料' },
      { key: '/parent/practice', icon: <EditOutlined />, label: '题库练习' },
      { key: '/parent/vocab', icon: <BookOutlined />, label: '英语特训' },
      { key: '/parent/poetry', icon: <FileTextOutlined />, label: '古诗文必背' },
      { key: '/parent/phet', icon: <ExperimentOutlined />, label: '仿真教学' },
      { key: '/parent/ai', icon: <MessageFilled />, label: 'AI 助手' },
    ] },
    { key: 'account-group', icon: <IdcardOutlined />, label: '我的', children: [
      { key: '/parent/benefits', icon: <CrownOutlined />, label: '会员权益' },
      { key: '/parent/bind', icon: <WechatOutlined />, label: '绑定微信' },
      { key: '/parent/profile', icon: <IdcardOutlined />, label: '个人中心' },
    ] },
  ]

  // 升学服务（中考志愿）为初中部专属：高中部家长同步隐藏（对齐 Sidebar.tsx 管理端门控）
  const isSenior = (session?.user as { division?: string } | undefined)?.division === 'SENIOR'
  const visibleNavItems = navItems.filter((item) => !(isSenior && item.key === 'volunteer-group'))

  const leafItems = flattenNavItems(visibleNavItems)
  const bottomTabs: MobileNavItem[] = [
    { key: '/parent/dashboard', icon: <HomeOutlined />, label: '首页' },
    { key: '/parent/class-feedback', icon: <BookOutlined />, label: '课堂反馈', badge: unread.feedbacks },
    { key: '/parent/schedule', icon: <CalendarOutlined />, label: '课程表' },
    { key: '/parent/notifications', icon: <BellOutlined />, label: '通知', badge: unread.notifications },
    { key: '__more', icon: <MenuOutlined />, label: '更多' },
  ]
  const currentKey = resolveActiveKey(pathname, searchParams.toString(), leafItems, '/parent/dashboard')
  const defaultOpenKeys = navItems.filter(item => item.children?.some(child => child.key === currentKey)).map(item => item.key)

  const markAllRead = async () => {
    if (markingAllRead) return
    setMarkingAllRead(true)
    try {
      await fetchJson('/api/parent/unread-counts/read-all', { method: 'POST' })
      await mutateUnread()
      toast.success('已全部标为已读')
    } catch {
      toast.error('未能全部标为已读，请检查网络后重试')
    } finally {
      setMarkingAllRead(false)
    }
  }

  const menuItems = visibleNavItems.map(item => ({
    key: item.key,
    icon: effectiveCollapsed ? <Tooltip title={item.label} placement="right" trigger={['hover', 'focus']}>{item.icon}</Tooltip> : item.icon,
    label: item.label,
    children: item.children?.map(child => ({
      key: child.key,
      icon: effectiveCollapsed ? <Tooltip title={child.label} placement="right" trigger={['hover', 'focus']}>{child.icon}</Tooltip> : child.icon,
      label: (child.badge ?? 0) > 0 ? (
        <Badge dot size="small" offset={[4, 0]}><span>{child.label}</span></Badge>
      ) : child.label,
    })),
  }))

  if (isMobile === null || isTablet === null) return <LayoutHydrationFallback />

  if (isMobile) {
    return (
      <MobileLayout
        mode="tabs"
        navItems={visibleNavItems}
        bottomTabs={bottomTabs}
        moreItems={visibleNavItems}
        title="牧哲学堂"
        roleLabel="家长端"
        menuLabel="菜单"
        accentColor={navTheme.accent}
        accentBackground={navTheme.accentBg}
        tabBackground={navTheme.tabBg}
        tabBorderTop={navTheme.tabBorder}
        tabActiveColor={'tabActive' in navTheme ? navTheme.tabActive : undefined}
        tabInactiveColor={'tabInactive' in navTheme ? navTheme.tabInactive : undefined}
        headerTheme={headerTheme}
        pageTheme={parentTheme}
        tierLabel={tierLabel}
        tierBadge={tierBadge}
        brandBackground={isParentDashboard}
        drawerHeaderExtra={(
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <ParentUsageGuideDrawerExtra parentUserId={session?.user?.id} />
            {unreadError && <button type="button" onClick={() => void mutateUnread()} style={{ minHeight: 44, color: 'var(--color-ink)', background: 'var(--color-surface-1)', border: '1px solid var(--color-hairline-strong)', borderRadius: 10 }}>未读信息加载失败，点击重试</button>}
            {totalUnread > 0 && (
              <button type="button" disabled={markingAllRead} onClick={markAllRead} style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                background: 'rgba(232,120,74,.08)', border: '1px solid rgba(232,120,74,.2)',
                color: '#E8784A', fontWeight: 600, fontSize: 14, cursor: markingAllRead ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap',
              }}>
                <CheckOutlined /> {markingAllRead ? '正在标记…' : `一键已读（${totalUnread}条未读）`}
                {notificationSummary.parts.length > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(232,120,74,.75)', whiteSpace: 'nowrap' }}>
                    {notificationSummary.parts.join(' · ')}
                  </span>
                )}
              </button>
            )}
          </Space>
        )}
      >
        {children}
      </MobileLayout>
    )
  }

  // 1024px 及以下默认使用紧凑侧栏，点开按钮仍可临时展开查看菜单名称。
  const handleSiderCollapse = (nextCollapsed: boolean) => {
    if (isTablet) setTabletNavExpanded(!nextCollapsed)
    else setCollapsed(nextCollapsed)
  }

  return (
    <Layout
      className={isParentDashboard ? 'brand-background-route' : undefined}
      data-brand-background={isParentDashboard ? 'true' : undefined}
      style={{ minHeight: '100vh', background: isParentDashboard ? 'transparent' : undefined, isolation: isParentDashboard ? 'isolate' : undefined }}
    >
      {isParentDashboard && <BrandBackground />}
      <Sider
        collapsible
        collapsed={effectiveCollapsed}
        onCollapse={handleSiderCollapse}
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
          justifyContent: effectiveCollapsed ? 'center' : 'space-between',
          padding: effectiveCollapsed ? 0 : '0 12px 0 20px',
          borderBottom: '1px solid rgba(0,0,0,.06)',
        }}>
          {!effectiveCollapsed && (
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-ink)', whiteSpace: 'nowrap' }}>牧哲学堂 <small style={{ color: 'var(--color-role-parent)', fontSize: 11 }}>家长端</small></span>
          )}
          <Tooltip title={effectiveCollapsed ? '展开导航' : '收起导航'}>
            <button
              type="button"
              aria-label={effectiveCollapsed ? '展开导航' : '收起导航'}
              onClick={() => handleSiderCollapse(!effectiveCollapsed)}
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
              {effectiveCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </Tooltip>
        </div>

        <Menu
          key={effectiveCollapsed ? 'tablet-collapsed' : 'expanded'}
          className="role-navigation role-navigation--parent"
          mode="inline"
          selectedKeys={[currentKey]}
          defaultOpenKeys={effectiveCollapsed ? [] : defaultOpenKeys}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ borderInlineEnd: 'none', background: 'transparent', marginTop: 8, fontSize: 14 }}
        />
      </Sider>

      <Layout style={{ marginLeft: effectiveCollapsed ? 72 : 220, background: isParentDashboard ? 'transparent' : '#faf8f5' }}>
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
          <div className="parent-layout-brand-heading">
            {isParentDashboard && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="brand-background-header-logo" src="/brand/logo.png" alt="牧哲学堂" />
            )}
            <span style={{ color: 'var(--color-ink-muted)', fontSize: 13, fontWeight: 600 }}>家长中心</span>
          </div>
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

        <Content style={{ padding: isTablet ? 16 : 24, maxWidth: pathname.startsWith('/parent/volunteer') ? 1140 : 800, margin: '0 auto', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
