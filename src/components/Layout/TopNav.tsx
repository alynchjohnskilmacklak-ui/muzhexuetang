'use client'

import { Layout, Input, Badge, Avatar, Dropdown, Space } from 'antd'
import { BellOutlined, SearchOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons'
import { signOut, useSession } from 'next-auth/react'

const { Header } = Layout

export function TopNav() {
  const { data: session } = useSession()

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

  return (
    <Header
      style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #f0f0f0',
        height: 64,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Input
        placeholder="搜索课程、学员、教师..."
        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
        style={{ width: 320, borderRadius: 6 }}
        size="middle"
      />
      <Space size={20}>
        <Badge count={5} size="small">
          <BellOutlined style={{ fontSize: 18, cursor: 'pointer', color: '#595959' }} />
        </Badge>
        <Dropdown menu={userMenu} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
            <span style={{ color: '#262626', fontSize: 14 }}>{session?.user?.name || '管理员'}</span>
          </Space>
        </Dropdown>
      </Space>
    </Header>
  )
}
