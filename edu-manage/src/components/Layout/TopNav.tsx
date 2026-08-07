'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Layout, Badge, Avatar, Dropdown, Space } from 'antd'
import { BellOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons'
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
    { refreshInterval: 5_000, revalidateOnFocus: true, revalidateOnReconnect: true },
  )
  const unreadCount: number = unreadData?.count ?? 0

  useEffect(() => {
    const timer = window.setTimeout(() => setBackgroundReady(true), 1200)
    return () => window.clearTimeout(timer)
  }, [])

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: '个人信息' },
      { type: 'divider' as const },
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
      <Dropdown menu={userMenu} placement="bottomRight">
        <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: '#E8784A', cursor: 'pointer' }} />
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
        height: 64,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#ffffff',
      }}
    >
      <GlobalSearch />
      <Space size={20}>
        <Badge count={unreadCount} size="small" offset={[-2, 2]}>
          <BellOutlined
            style={{ fontSize: 18, cursor: 'pointer', color: '#5a4e3a' }}
            onClick={() => router.push('/parent-messages')}
          />
        </Badge>
        <Dropdown menu={userMenu} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: '#E8784A' }} />
            <span style={{ color: '#1a1201', fontSize: 14, fontWeight: 500 }}>
              {userName}｜{systemName}
            </span>
          </Space>
        </Dropdown>
      </Space>
    </Header>
  )
}
