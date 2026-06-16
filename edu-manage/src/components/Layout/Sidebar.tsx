'use client'

import { useEffect, useMemo } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { Badge, Layout, Menu, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import {
  BarChartOutlined,
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  CommentOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DollarOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageFilled,
  MessageOutlined,
  ReadOutlined,
  SafetyOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'

const { Sider } = Layout
const fetcher = (url: string) => fetch(url).then((res) => res.ok ? res.json() : [])

// Desktop admin menu. Keep in sync with MainLayout.tsx adminNavItems for mobile.
// When adding or removing admin routes, update both places.
const menuItems: MenuProps['items'] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '数据总览' },
  { key: '/students', icon: <UserOutlined />, label: '学员管理' },
  {
    key: 'teacher-group',
    icon: <TeamOutlined />,
    label: '教师管理',
    children: [
      { key: '/teachers', label: '教师档案' },
      { key: '/teacher-logs', icon: <ClockCircleOutlined />, label: '行为日志' },
      { key: '/teacher-salary', icon: <DollarOutlined />, label: '薪资管理' },
    ],
  },
  { key: '/courses', icon: <BookOutlined />, label: '课程管理' },
  {
    key: 'schedule-group',
    icon: <CalendarOutlined />,
    label: '排课系统',
    children: [
      { key: '/schedule', label: '教室矩阵（精品班课）' },
      { key: '/schedule/intensive', label: '突击全能班（1对1/2/3）' },
      { key: '/schedule?view=teacher-week', label: '教师课表' },
      { key: '/schedule?view=week-heatmap', label: '周总览' },
    ],
  },
  { key: '/attendance', icon: <CheckSquareOutlined />, label: '考勤管理' },
  { key: '/classroom-feedback', icon: <MessageOutlined />, label: '成长反馈' },
  {
    key: 'finance-group',
    icon: <DollarOutlined />,
    label: '财务后勤',
    children: [
      { key: '/fees', label: '收费管理' },
      { key: '/meals', icon: <CoffeeOutlined />, label: '就餐管理' },
    ],
  },
  { key: '/grades', icon: <FileTextOutlined />, label: '学习档案' },
  {
    key: 'comm-group',
    icon: <CommentOutlined />,
    label: '沟通中心',
    children: [
      { key: '/parent-messages', label: '家长留言' },
      { key: '/notifications', icon: <BellOutlined />, label: '消息通知' },
    ],
  },
  {
    key: 'volunteer-group',
    icon: <ExperimentOutlined />,
    label: '中考志愿',
    children: [
      { key: '/volunteer', label: '志愿咨询' },
      { key: '/volunteer-sim', label: '中考模拟测算' },
      { key: '/volunteer-sim/schools', label: '高中学校库' },
    ],
  },
  { key: '/reports', icon: <BarChartOutlined />, label: '数据报表' },
  { key: '/data-admin', icon: <DatabaseOutlined />, label: '数据管理' },
  { key: '/login-records', icon: <SafetyOutlined />, label: '登录记录' },
  {
    key: 'resource-group',
    icon: <ReadOutlined />,
    label: '教学资源',
    children: [
      { key: '/materials', label: '学习资料' },
      { key: '/phet', label: '仿真教学' },
      { key: '/ai', label: 'AI 助手' },
    ],
  },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
]

function flattenMenuKeys(items: MenuProps['items']): string[] {
  return (items || []).flatMap((item: any) => {
    if (!item) return []
    const ownKey = typeof item.key === 'string' && item.key.startsWith('/') ? [item.key] : []
    return [...ownKey, ...flattenMenuKeys(item.children)]
  })
}

function resolveActiveKey(pathname: string, keys: string[], fallback: string) {
  const exact = keys.find(key => key === pathname)
  if (exact) return exact

  const match = keys
    .filter(key => pathname.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0]

  return match || fallback
}

export function Sidebar({
  collapsed,
  onCollapse,
  onMenuClick,
}: {
  collapsed: boolean
  onCollapse: (v: boolean) => void
  onMenuClick?: () => void
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { data: alerts } = useSWR('/api/teacher-logs/alerts', fetcher, { refreshInterval: 300_000 })
  const alertCount = Array.isArray(alerts) ? alerts.filter((a: any) => !a.isResolved).length : 0
  const isSenior = (session?.user as { division?: string } | undefined)?.division === 'SENIOR'

  useEffect(() => {
    localStorage.setItem('admin_sider_collapsed', String(collapsed))
  }, [collapsed])

  const menuKeys = useMemo(() => flattenMenuKeys(menuItems), [])
  const baseKey = resolveActiveKey(pathname, menuKeys, '/dashboard')
  const isScheduleIntensive = pathname.startsWith('/schedule/intensive')
  const viewParam = searchParams.get('view')
  const selectedKey = isScheduleIntensive
    ? '/schedule/intensive'
    : baseKey === '/schedule' && viewParam
    ? `/schedule?view=${viewParam}`
    : baseKey
  const defaultOpenKeys = (baseKey === '/teachers' || baseKey === '/teacher-logs' || baseKey === '/teacher-salary')
    ? ['teacher-group']
    : (baseKey === '/schedule' || isScheduleIntensive)
    ? ['schedule-group']
    : (baseKey === '/fees' || baseKey === '/meals')
    ? ['finance-group']
    : (baseKey === '/parent-messages' || baseKey === '/notifications')
    ? ['comm-group']
    : (baseKey === '/volunteer' || baseKey === '/volunteer-sim' || baseKey === '/volunteer-sim/schools')
    ? ['volunteer-group']
    : (baseKey === '/materials' || baseKey === '/phet' || baseKey === '/ai')
    ? ['resource-group']
    : []

  // 初中部专属菜单：高中部不展示中考志愿相关入口
  const JUNIOR_ONLY_GROUP_KEY = 'volunteer-group'
  const visibleMenuItems = useMemo(() => {
    if (!isSenior) return menuItems
    return (menuItems as { key: string; [k: string]: unknown }[]).filter(
      (item) => item.key !== JUNIOR_ONLY_GROUP_KEY,
    )
  }, [isSenior])

  const items = useMemo(() => (visibleMenuItems as any[]).map((item: any) => {
    if (item.key === 'teacher-group') {
      return {
        ...item,
        children: item.children?.map((child: any) =>
          child.key === '/teacher-logs'
            ? { ...child, label: <Badge count={alertCount} size="small" offset={[8, 0]}>行为日志</Badge> }
            : child
        ),
      }
    }
    return item
  }), [visibleMenuItems, alertCount])

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    if (!key.startsWith('/')) return
    router.push(key)
    onMenuClick?.()
  }

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      trigger={null}
      width={220}
      collapsedWidth={72}
      style={{
        height: '100vh', position: onMenuClick ? 'relative' : 'fixed', left: 0, top: 0, bottom: 0, overflow: 'auto',
        background: '#ffffff', borderRight: '1px solid rgba(0,0,0,.06)', zIndex: 98,
      }}
    >
      <div style={{
        height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: collapsed ? '0 12px' : '0 12px 0 24px', borderBottom: '1px solid rgba(0,0,0,.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/images/logo.jpg" alt="牧哲学堂" width={32} height={32} style={{ borderRadius: 8, objectFit: 'cover' }} unoptimized />
          {!collapsed && <span style={{ fontSize: 16, fontWeight: 700, color: '#E8784A', whiteSpace: 'nowrap' }}>牧哲学堂</span>}
        </div>
        <Tooltip title={collapsed ? '展开导航' : '收起导航'}>
          <button onClick={() => onCollapse(!collapsed)} style={{
            width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(232,120,74,.2)',
            cursor: 'pointer', background: 'rgba(232,120,74,.08)', color: '#E8784A',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
        </Tooltip>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        defaultOpenKeys={defaultOpenKeys}
        items={items}
        onClick={handleClick}
        style={{ background: '#ffffff', borderInlineEnd: 'none', marginTop: 8 }}
      />
    </Sider>
  )
}
