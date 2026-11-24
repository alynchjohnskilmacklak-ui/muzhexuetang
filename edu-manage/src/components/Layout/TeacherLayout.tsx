'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Badge, Button, Dropdown, Form, Input, Layout, Menu, Spin, Tooltip } from 'antd'
import useSWR from 'swr'
import {
  CalendarOutlined,
  AppstoreOutlined,
  BulbOutlined,
  CheckSquareOutlined,
  CoffeeOutlined,
  CrownOutlined,
  DashboardOutlined,
  DollarOutlined,
  ExperimentOutlined,
  FileImageOutlined,
  FileAddOutlined,
  FileTextOutlined,
  FolderOutlined,
  LockOutlined,
  LogoutOutlined,
  HomeOutlined,
  MenuOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageFilled,
  MessageOutlined,
  ExclamationCircleOutlined,
  QuestionCircleOutlined,
  ReadOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { signOut } from 'next-auth/react'
import { toast } from 'sonner'
import { DEFAULT_TEACHER_AVATAR, getTeacherAvatarUrl } from '@/lib/teacher-avatars'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'
import { BrandModal } from '@/components/Common/BrandModal'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useKickListener } from '@/hooks/useKickListener'
import { useSessionPing } from '@/hooks/useSessionPing'
import { PASSWORD_MIN_LENGTH, validatePassword } from '@/lib/password-policy'
import { clearSensitiveBrowserStorage } from '@/lib/client-sensitive-storage'
import { MobileLayout, type MobileNavItem } from './MobileLayout'
import { LayoutHydrationFallback } from './LayoutHydrationFallback'
import { resolveTier, TIER_APP, TIER_THEME } from '@/constants/teacher-tier'

const { Sider, Content, Header } = Layout

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface TeacherData {
  teacher: { id: string; name: string; gender?: string | null; avatar?: string | null; tierLevel?: string | null }
  badges: { unsubmitted: number; unpublished: number; unread: number; unreadMessages: number }
}

type NavItem = Omit<MobileNavItem, 'children'> & {
  badgeKey?: keyof TeacherData['badges'] | null
  children?: NavItem[]
}

const navItems: NavItem[] = [
  { key: '/teacher/dashboard', icon: <DashboardOutlined />, label: '工作台' },
  { key: 'classroom-group', icon: <CalendarOutlined />, label: '课堂教学', children: [
    { key: '/teacher/schedule', icon: <CalendarOutlined />, label: '我的课表' },
    { key: '/teacher/intensive', icon: <CrownOutlined />, label: 'VIP课程预约' },
    { key: '/teacher/lesson-previews', icon: <FileTextOutlined />, label: '讲义预告' },
    { key: '/teacher/attendance', icon: <CheckSquareOutlined />, label: '考勤录入', badgeKey: 'unsubmitted' },
    { key: '/teacher/interaction', icon: <BulbOutlined />, label: '课堂互动' },
    { key: '/teacher/feedback', icon: <MessageOutlined />, label: '我的反馈', badgeKey: 'unpublished' },
    { key: '/teacher/single-session-feedback', icon: <FileAddOutlined />, label: '单次课程反馈' },
  ] },
  { key: 'homework-group', icon: <ReadOutlined />, label: '作业与班级管理', children: [
    { key: '/teacher/homework', icon: <FileTextOutlined />, label: '普通课作业' },
    { key: '/teacher/study-hall', icon: <ReadOutlined />, label: '作业班工作台' },
  ] },
  { key: 'student-group', icon: <TeamOutlined />, label: '学员与家校', children: [
    { key: '/teacher/students', icon: <TeamOutlined />, label: '我的学员' },
    { key: '/teacher/messages', icon: <MessageOutlined />, label: '家校消息', badgeKey: 'unreadMessages' },
    { key: '/teacher/leave', icon: <CalendarOutlined />, label: '请假审批' },
  ] },
  { key: 'resource-group', icon: <FolderOutlined />, label: '教学资源', children: [
    { key: '/teacher/papers', icon: <FileImageOutlined />, label: '试卷上传' },
    { key: '/teacher/materials', icon: <FolderOutlined />, label: '学习资料' },
    { key: '/teacher/phet', icon: <ExperimentOutlined />, label: '仿真教学' },
    { key: '/teacher/ai', icon: <MessageFilled />, label: 'AI 助手' },
  ] },
  { key: 'account-group', icon: <AppstoreOutlined />, label: '服务与个人', children: [
    { key: '/teacher/meals', icon: <CoffeeOutlined />, label: '就餐上报' },
    { key: '/teacher/compensation', icon: <DollarOutlined />, label: '薪酬福利' },
  ] },
]

function withBadges(items: NavItem[], data: TeacherData | null): MobileNavItem[] {
  return items.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
    badge: item.badgeKey && data ? data.badges[item.badgeKey] || 0 : undefined,
    children: item.children ? withBadges(item.children, data) : undefined,
  }))
}

function flattenNavItems(items: NavItem[]): NavItem[] {
  return items.flatMap(item => item.children ? flattenNavItems(item.children) : [item])
}

export function TeacherLayout({ children, initialData }: { children: React.ReactNode; initialData?: TeacherData }) {
  const pathname = usePathname()
  const router = useRouter()
  // Use the labeled touch navigation on tablets too; the narrow desktop rail
  // makes both the content area and the navigation hard to use at tablet widths.
  const isMobile = useIsMobile(1025)
  const isTablet = useIsMobile(1025)
  const [collapsed, setCollapsed] = useState(false)
  const [tabletNavExpanded, setTabletNavExpanded] = useState(false)
  const effectiveCollapsed = isTablet ? !tabletNavExpanded : collapsed
  const [data, setData] = useState<TeacherData | null>(initialData || null)
  const [backgroundReady, setBackgroundReady] = useState(false)
  const [changingPwd, setChangingPwd] = useState(false)
  const [pwdSubmitting, setPwdSubmitting] = useState(false)
  const [pwdForm] = Form.useForm()
  useKickListener()
  useSessionPing({ initialDelay: 6000 })

  useEffect(() => {
    const timer = window.setTimeout(() => setBackgroundReady(true), 1200)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('teacher_sider_collapsed')
    if (saved !== null) setCollapsed(saved === 'true')
  }, [])

  useEffect(() => {
    localStorage.setItem('teacher_sider_collapsed', String(collapsed))
  }, [collapsed])

  const { data: dashData } = useSWR(backgroundReady ? '/api/teacher/dashboard' : null, fetcher, {
    refreshInterval: 300_000,
    revalidateOnFocus: true,
    dedupingInterval: 30_000,
  })

  const { data: msgUnreadData } = useSWR(backgroundReady ? '/api/messages/unread-count' : null, fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })

  useEffect(() => {
    if (dashData?.teacher) {
      setData({
        teacher: dashData.teacher,
        badges: {
          ...(dashData.badges || { unsubmitted: 0, unpublished: 0, unread: 0 }),
          unreadMessages: Number(dashData.badges?.unreadMessages || 0) + Number(msgUnreadData?.count || 0),
        },
      })
    }
  }, [dashData, msgUnreadData])

  const appTier = data?.teacher ? resolveTier(data.teacher.tierLevel) : 'NEW'
  const appTheme = TIER_APP[appTier]
  const leafItems = useMemo(() => flattenNavItems(navItems), [])
  const selectedKey = leafItems
    .filter(item => pathname === item.key || pathname.startsWith(`${item.key}/`))
    .sort((a, b) => b.key.length - a.key.length)[0]?.key || '/teacher/dashboard'
  const selectedItem = leafItems.find(item => item.key === selectedKey)
  const defaultOpenKeys = navItems.filter(item => item.children?.some(child => child.key === selectedKey)).map(item => item.key)
  const mobileNavItems = withBadges(navItems, data)
  const bottomTabs: MobileNavItem[] = [
    { key: '/teacher/dashboard', icon: <HomeOutlined />, label: '首页' },
    { key: '/teacher/schedule', icon: <CalendarOutlined />, label: '课表' },
    { key: '/teacher/attendance', icon: <CheckSquareOutlined />, label: '考勤', badge: data?.badges?.unsubmitted },
    { key: '/teacher/feedback', icon: <FileTextOutlined />, label: '反馈', badge: data?.badges?.unpublished },
    { key: '__more', icon: <MenuOutlined />, label: '更多' },
  ]
  const todoTotal = (data?.badges?.unsubmitted || 0) + (data?.badges?.unpublished || 0) + (data?.badges?.unreadMessages || 0)

  const handleChangePwd = async (values: { oldPassword: string; newPassword: string }) => {
    setPwdSubmitting(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const result = await res.json()
      if (!res.ok) { toast.error(result.error || '修改失败'); return }
      toast.success('密码已修改，下次登录请使用新密码')
      setChangingPwd(false)
      pwdForm.resetFields()
      clearSensitiveBrowserStorage()
      await signOut({ callbackUrl: `${window.location.origin}/login?reason=password-changed` })
    } catch { toast.error('网络错误') }
    finally { setPwdSubmitting(false) }
  }

  const menuItems = navItems.map((item) => ({
    key: item.key,
    icon: effectiveCollapsed ? <Tooltip title={item.label} placement="right" trigger={['hover', 'focus']}>{item.icon}</Tooltip> : item.icon,
    label: item.label,
    children: item.children?.map(child => ({
      key: child.key,
      icon: effectiveCollapsed ? <Tooltip title={child.label} placement="right" trigger={['hover', 'focus']}>{child.icon}</Tooltip> : child.icon,
      label: child.badgeKey && data ? (
        <Badge count={data.badges[child.badgeKey] || 0} size="small" offset={[8, 0]}>{child.label}</Badge>
      ) : child.label,
    })),
  }))

  if (isMobile === null || isTablet === null) return <LayoutHydrationFallback />

  if (isMobile) {
    const isFeedbackPage = pathname.startsWith('/teacher/feedback') || pathname.startsWith('/teacher/single-session-feedback')
    return (
      <MobileLayout
        mode="tabs"
        navItems={mobileNavItems}
        bottomTabs={bottomTabs}
        moreItems={mobileNavItems}
        showBottomTabs={isFeedbackPage ? false : undefined}
        title="牧哲学堂"
        roleLabel="教师端"
        menuLabel="菜单"
        accentColor={appTheme.siderFg}
        accentBackground={appTheme.menuSelectedBg}
        tierLabel={TIER_THEME[appTier].label}
        tierBadge={{ bg: TIER_THEME[appTier].bg, color: TIER_THEME[appTier].accent, border: `1px solid ${TIER_THEME[appTier].border}` }}
        headerTheme={{ bg: appTheme.headerBg, fg: appTheme.headerFg, border: appTheme.headerBorder, mainBg: appTheme.mainBg, dark: appTheme.dark }}
        drawerHeaderExtra={(
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todoTotal > 0 && <div style={{ fontSize: 12, color: 'var(--color-ink-muted)', background: 'var(--color-role-teacher-bg)', borderRadius: 8, padding: '8px 12px', border: '1px solid var(--color-hairline)' }}>
              <ExclamationCircleOutlined style={{ color: 'var(--color-role-teacher)', marginRight: 6 }} />
              今日待办：{data?.badges?.unsubmitted || 0}节考勤，{data?.badges?.unpublished || 0}条反馈，{data?.badges?.unreadMessages || 0}条留言
            </div>}
            <Button size="small" icon={<QuestionCircleOutlined />} onClick={() => router.push('/teacher/dashboard?guide=1')}>使用帮助</Button>
          </div>
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
    <Layout style={{ minHeight: '100vh', background: appTheme.mainBg }}>
      <Sider
        collapsible
        collapsed={effectiveCollapsed}
        onCollapse={handleSiderCollapse}
        trigger={null}
        width={220}
        collapsedWidth={72}
        className={`teacher-theme--${appTier.toLowerCase()}`}
        style={{
          background: appTheme.siderBg,
          borderRight: `1px solid ${appTheme.siderBorder}`,
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
          borderBottom: '1px solid var(--color-hairline)',
        }}>
          {!effectiveCollapsed && <Link href="/teacher/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Image src="/images/logo.jpg" alt="牧哲学堂" width={28} height={28} style={{ borderRadius: 6, objectFit: 'contain' }} unoptimized />
            <span style={{ fontSize: 14, fontWeight: 700, color: appTheme.siderFg, whiteSpace: 'nowrap' }}>牧哲学堂 <small style={{ color: appTheme.siderFg, opacity: .78, fontSize: 11 }}>教师端</small></span>
          </Link>}
          <Tooltip title={effectiveCollapsed ? '展开导航' : '收起导航'} trigger={['hover', 'focus']}>
            <button type="button" aria-label={effectiveCollapsed ? '展开导航' : '收起导航'} onClick={() => handleSiderCollapse(!effectiveCollapsed)} style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              border: '1px solid var(--color-hairline-strong)',
              cursor: 'pointer',
              background: 'var(--color-role-teacher-bg)',
              color: 'var(--color-role-teacher)',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              {effectiveCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </Tooltip>
        </div>

        <Menu
          key={effectiveCollapsed ? 'tablet-collapsed' : 'expanded'}
          className="role-navigation role-navigation--teacher"
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={effectiveCollapsed ? [] : defaultOpenKeys}
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ borderInlineEnd: 'none', background: 'transparent', marginTop: 8, fontSize: 14, color: appTheme.siderFg }}
        />
      </Sider>

      <Layout style={{ marginLeft: effectiveCollapsed ? 72 : 220, background: '#faf8f5' }}>
        <Header style={{
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${appTheme.headerBorder}`,
          height: 56,
          position: 'sticky',
          top: 0,
          zIndex: 97,
          background: appTheme.headerBg,
          gap: 16,
        }}>
          <div className="teacher-shell-breadcrumb" aria-label="当前位置" style={{ color: appTheme.headerFg }}>
            <span>教师工作台</span>
            {selectedItem && selectedItem.key !== '/teacher/dashboard' && (
              <>
                <span className="teacher-shell-breadcrumb__separator" aria-hidden="true">/</span>
                <strong>{selectedItem.label}</strong>
              </>
            )}
          </div>
          {data ? (
            <Dropdown menu={{ items: [
              { key: 'help', icon: <QuestionCircleOutlined />, label: '使用帮助', onClick: () => router.push('/teacher/dashboard?guide=1') },
              { key: 'change-pwd', icon: <LockOutlined />, label: '修改密码', onClick: () => setChangingPwd(true) },
              { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => {
                clearSensitiveBrowserStorage()
                return signOut({ callbackUrl: `${window.location.origin}/login` })
              } },
            ] }} trigger={['click']}>
              <button type="button" aria-label="打开用户菜单" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: 0, border: 0, background: 'transparent' }}>
                <CachedAvatarImage
                  src={getTeacherAvatarUrl(data.teacher.avatar, data.teacher.gender, data.teacher.id)}
                  fallbackSrc={getTeacherAvatarUrl(null, data.teacher.gender, data.teacher.id) || DEFAULT_TEACHER_AVATAR}
                  alt={data.teacher.name}
                  loading="eager"
                  style={{ width: 30, height: 30, flexShrink: 0, borderRadius: '50%', objectFit: 'cover', background: 'var(--color-role-teacher)' }}
                />
                <span style={{ fontSize: 13, color: appTheme.headerFg, whiteSpace: 'nowrap' }}>{data.teacher.name}</span>
              </button>
            </Dropdown>
          ) : <Spin size="small" />}
        </Header>
        <Content
          className={appTheme.dark ? 'teacher-main--dark' : 'teacher-main--light'}
          style={{ padding: isTablet ? 16 : 24, maxWidth: 1280, margin: '0 auto', width: '100%', minWidth: 0, boxSizing: 'border-box', background: appTheme.mainBg }}
        >
          {children}
        </Content>
      </Layout>

      <BrandModal
        open={changingPwd}
        onCancel={() => { setChangingPwd(false); pwdForm.resetFields() }}
        title="修改密码"
        footer={null}
        width={400}
        destroyOnClose
      >
        <Form form={pwdForm} layout="vertical" onFinish={handleChangePwd} style={{ marginTop: 16 }}>
          <Form.Item name="oldPassword" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
            <Input.Password placeholder="输入当前密码" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="newPassword" label="新密码" rules={[
            { required: true, message: '请输入新密码' },
            {
              validator: async (_rule, value) => {
                if (!value) return
                const result = validatePassword(value)
                if (!result.valid) throw new Error(result.errors[0])
              },
            },
          ]}>
            <Input.Password placeholder={`至少${PASSWORD_MIN_LENGTH}位，包含英文字母`} style={{ borderRadius: 8 }} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => { setChangingPwd(false); pwdForm.resetFields() }}>取消</Button>
            <Button type="primary" htmlType="submit" loading={pwdSubmitting}
              style={{ background: 'var(--color-primary)', border: 'none', borderRadius: 8 }}>
              确认修改
            </Button>
          </div>
        </Form>
      </BrandModal>
    </Layout>
  )
}
