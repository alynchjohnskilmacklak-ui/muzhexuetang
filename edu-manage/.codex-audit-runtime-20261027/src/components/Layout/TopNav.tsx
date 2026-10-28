'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Layout, Badge, Avatar, Button, Dropdown, Space, Tooltip } from 'antd'
import { BellOutlined, UserOutlined, LogoutOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { signOut, useSession } from 'next-auth/react'
import useSWR from 'swr'
import { GlobalSearch } from '@/components/GlobalSearch'
import { clearSensitiveBrowserStorage } from '@/lib/client-sensitive-storage'

const { Header } = Layout

export function TopNav({ mobileMode = false }: { mobileMode?: boolean } = {}) {
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user as Record<string, unknown> | undefined
  const [backgroundReady, setBackgroundReady] = useState(false)
  const userName = (user?.name as string) || '管理员'
  const division = user?.division as string | undefined
  const systemName =
    division === 'SENIOR'
      ? '高中部管理系统'
      : division === 'JUNIOR'
        ? '初中部管理系统'
        : '管理系统'

  const { data: unreadData } = useSWR(
    backgroundReady ? '/api/messages/unread-count' : null,
    (url: string) => fetch(url).then((r) => r.ok ? r.json() : { count: 0 }),
    { refreshInterval: 30_000, revalidateOnFocus: true, revalidateOnReconnect: true },
  )
  const unreadCount: number = unreadData?.count ?? 0

  useEffect(() => {
    const timer = window.setTimeout(() => setBackgroundReady(true), 1200)
    return () => window.clearTimeout(timer)
  }, [])

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        danger: true,
        onClick: () => {
          clearSensitiveBrowserStorage()
          return signOut({ callbackUrl: `${window.location.origin}/login` })
        },
      },
    ],
  }

  if (mobileMode) {
    return (
      <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
        <button type="button" aria-label="打开用户菜单" style={{ padding: 0, border: 0, background: 'transparent', cursor: 'pointer', borderRadius: '50%' }}>
          <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: 'var(--color-role-admin)' }} />
        </button>
      </Dropdown>
    )
  }

  return (
    <Header
      style={{
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(0,0,0,.06)',
        height: 56,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#ffffff',
      }}
    >
      <GlobalSearch />
      <Space size={12}>
        <Tooltip title="使用帮助" trigger={['hover', 'focus']}><Button type="text" icon={<QuestionCircleOutlined />} onClick={() => router.push('/dashboard?guide=1')} aria-label="打开使用帮助" /></Tooltip>
        <Badge count={unreadCount} size="small" offset={[-2, 2]}>
          <Button
            type="text"
            aria-label={unreadCount > 0 ? `打开家长留言，${unreadCount}条未读` : '打开家长留言'}
            icon={<BellOutlined style={{ fontSize: 18 }} />}
            style={{ color: 'var(--color-ink-muted)' }}
            onClick={() => router.push('/parent-messages')}
          />
        </Badge>
        <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
          <button type="button" aria-label="打开用户菜单" style={{ padding: 0, border: 0, background: 'transparent', cursor: 'pointer' }}>
            <Space>
            <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: 'var(--color-role-admin)' }} />
            <span style={{ color: 'var(--color-ink)', fontSize: 13, fontWeight: 600 }}>{userName}</span>
            <span style={{ color: 'var(--color-ink-subtle)', fontSize: 11 }}>{systemName}</span>
            </Space>
          </button>
        </Dropdown>
      </Space>
    </Header>
  )
}
