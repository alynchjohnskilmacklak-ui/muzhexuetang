'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { Badge, Layout, Menu, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { adminNavItems } from './admin-nav'
import type { MobileNavItem } from './MobileLayout'
import { useDivision } from '@/contexts/DivisionContext'

const { Sider } = Layout
const fetcher = (url: string) => fetch(url).then((res) => res.ok ? res.json() : [])

type SidebarMenuItem = Omit<MobileNavItem, 'label' | 'children'> & {
  label: React.ReactNode
  children?: SidebarMenuItem[]
}
const menuItems: SidebarMenuItem[] = adminNavItems

function flattenMenuKeys(items: MenuProps['items']): string[] {
  return (items || []).flatMap((item) => {
    if (!item) return []
    const ownKey = typeof item.key === 'string' && item.key.startsWith('/') ? [item.key] : []
    return [...ownKey, ...flattenMenuKeys('children' in item ? item.children : undefined)]
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
  const { division } = useDivision()
  const { data: session } = useSession()
  const [backgroundReady, setBackgroundReady] = useState(false)
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const { data: alerts } = useSWR(backgroundReady ? `/api/teacher-logs/alerts?division=${division}` : null, fetcher, {
    refreshInterval: 300_000,
    dedupingInterval: 30_000,
  })
  const alertCount = Array.isArray(alerts) ? alerts.filter((a) => !a.isResolved).length : 0
  const isSenior = (session?.user as { division?: string } | undefined)?.division === 'SENIOR'

  useEffect(() => {
    localStorage.setItem('admin_sider_collapsed', String(collapsed))
  }, [collapsed])

  useEffect(() => {
    const timer = window.setTimeout(() => setBackgroundReady(true), 1500)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => setPendingKey(null), [pathname, searchParams])

  useEffect(() => {
    if (!pendingKey) return
    const timer = window.setTimeout(() => setPendingKey(null), 10_000)
    return () => window.clearTimeout(timer)
  }, [pendingKey])

  const menuKeys = useMemo(() => flattenMenuKeys(menuItems), [])
  const baseKey = resolveActiveKey(pathname, menuKeys, '/dashboard')
  const isScheduleIntensive = pathname.startsWith('/schedule/intensive')
  const viewParam = searchParams.get('view')
  const selectedKey = pendingKey || (isScheduleIntensive
    ? '/schedule/intensive'
    : baseKey === '/schedule' && viewParam
    ? `/schedule?view=${viewParam}`
    : baseKey)
  const defaultOpenKeys = menuItems
    .filter((item) => item.children?.some((child) => child.key === selectedKey || child.key === baseKey))
    .map((item) => String(item.key))

  // 初中部专属菜单：高中部不展示中考志愿相关入口
  const JUNIOR_ONLY_GROUP_KEY = 'volunteer-group'
  const visibleMenuItems = useMemo(() => {
    if (!isSenior) return menuItems
    return menuItems?.filter((item) => item?.key !== JUNIOR_ONLY_GROUP_KEY)
  }, [isSenior])

  const items = useMemo(() => {
    const decorate = (item: SidebarMenuItem): SidebarMenuItem => ({
      ...item,
      label: item.key.startsWith('/') ? (
        <span onMouseEnter={() => router.prefetch(item.key)} style={{ display: 'block', width: '100%' }}>
          {item.key === '/teacher-logs' ? <Badge count={alertCount} size="small" offset={[8, 0]}>行为日志</Badge> : item.label}
          {pendingKey === item.key && <span style={{ marginInlineStart: 8, fontSize: 11, color: 'var(--color-ink-subtle)' }}>打开中…</span>}
        </span>
      ) : item.label,
      children: item.children?.map(decorate),
    })
    return visibleMenuItems.map(decorate)
  }, [visibleMenuItems, alertCount, pendingKey, router])

  const handleClick: MenuProps['onClick'] = ({ key }) => {
    if (!key.startsWith('/')) return
    setPendingKey(key)
    router.push(key)
    onMenuClick?.()
  }

  return (
    <Sider
      className="desktop-role-sidebar desktop-role-sidebar--admin"
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      trigger={null}
      width={220}
      collapsedWidth={72}
      style={{
        height: '100vh', position: onMenuClick ? 'relative' : 'fixed', left: 0, top: 0, bottom: 0, overflow: 'auto',
        background: 'var(--color-canvas)', borderRight: '1px solid var(--color-hairline)', zIndex: 98,
      }}
    >
      <div style={{
        height: 56, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between',
        padding: collapsed ? 0 : '0 12px 0 18px', borderBottom: '1px solid var(--color-hairline)',
      }}>
        {!collapsed && <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Image src="/images/logo.jpg" alt="牧哲学堂" width={32} height={32} style={{ borderRadius: 8, objectFit: 'cover' }} unoptimized />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-ink)', whiteSpace: 'nowrap' }}>牧哲学堂 <small style={{ color: 'var(--color-role-admin)', fontSize: 11 }}>管理端</small></span>
        </div>}
        <Tooltip title={collapsed ? '展开导航' : '收起导航'}>
          <button type="button" aria-label={collapsed ? '展开导航' : '收起导航'} onClick={() => onCollapse(!collapsed)} style={{
            width: 44, height: 44, borderRadius: 10, border: '1px solid var(--color-hairline-strong)',
            cursor: 'pointer', background: 'var(--color-role-admin-bg)', color: 'var(--color-role-admin)',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </button>
        </Tooltip>
      </div>
      <Menu
        className="role-navigation role-navigation--admin"
        mode="inline"
        selectedKeys={[selectedKey]}
        defaultOpenKeys={defaultOpenKeys}
        items={items}
        onClick={handleClick}
        style={{ background: 'transparent', borderInlineEnd: 'none', marginTop: 8 }}
      />
    </Sider>
  )
}
