'use client'

import { Layout, Input, Badge, Avatar, Dropdown, Space, Tag } from 'antd'
import { BellOutlined, SearchOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons'
import { signOut, useSession } from 'next-auth/react'

const { Header } = Layout

function getDivisionLabel(user: Record<string, unknown> | undefined) {
  const selected = user?.selectedDivision as string | undefined
  if (selected === 'SENIOR') return '高中部管理系统'
  return '初中部管理系统'
}

export function TopNav({ mobileMode = false }: { mobileMode?: boolean } = {}) {
  const { data: session } = useSession()
  const user = session?.user as Record<string, unknown> | undefined
  const divisionLabel = getDivisionLabel(user)

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: '个人信息' },
      { type: 'divider' as const },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        danger: true,
        onClick: () => signOut({ callbackUrl: '/login' }),
      },
    ],
  }

  if (mobileMode) {
    return (
      <Dropdown menu={userMenu} placement="bottomRight">
        <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: '#E87545', cursor: 'pointer' }} />
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
        borderBottom: '1px solid #EEE7E1',
        height: 64,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#ffffff',
      }}
    >
      <Input
        placeholder="搜索课程、学员、教师..."
        prefix={<SearchOutlined style={{ color: '#98A2B3' }} />}
        style={{ width: 320, borderRadius: 10 }}
        size="middle"
      />
      <Space size={20}>
        <Badge count={5} size="small">
          <BellOutlined style={{ fontSize: 18, cursor: 'pointer', color: '#5a4e3a' }} />
        </Badge>
        <Dropdown menu={userMenu} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: '#E87545' }} />
            <span style={{ color: '#1F2329', fontSize: 14, fontWeight: 500 }}>
              {(user?.name as string) || '管理员'}
            </span>
            <Tag style={{ borderRadius: 20, border: '1px solid #E8754530', background: '#FFF6F1', color: '#E87545', fontSize: 11, marginInlineEnd: 0 }}>
              {divisionLabel}
            </Tag>
          </Space>
        </Dropdown>
      </Space>
    </Header>
  )
}
