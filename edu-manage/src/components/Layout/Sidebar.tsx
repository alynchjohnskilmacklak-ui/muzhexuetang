'use client'

import { useEffect, useMemo } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { Badge, Layout, Menu, Tooltip } from 'antd'
import type { MenuProps } from 'antd'
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { getAdminMenuTree } from '@/config/adminMenu'

const { Sider } = Layout
const fetcher = (url: string) => fetch(url).then((res) => res.ok ? res.json() : [])

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
  const menuItems = useMemo<MenuProps['items']>(() => getAdminMenuTree(isSenior) as MenuProps['items'], [isSenior])

  useEffect(() => {
    localStorage.setItem('admin_sider_collapsed', String(collapsed))
  }, [collapsed])

  const menuKeys = useMemo(() => flattenMenuKeys(menuItems), [menuItems])
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

  const items = useMemo(() => (menuItems as any[]).map((item: any) => {
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
  }), [menuItems, alertCount])

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
