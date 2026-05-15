'use client'

import { Layout, Avatar, Dropdown, Space, Menu } from 'antd'
import { UserOutlined, LogoutOutlined, HomeOutlined, CalendarOutlined, FileTextOutlined, DollarOutlined } from '@ant-design/icons'
import { signOut, useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'

const { Header, Content } = Layout

export function ParentLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: '个人信息' },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true, onClick: () => signOut({ callbackUrl: '/login' }) },
    ],
  }

  const navItems = [
    { key: '/parent/dashboard', icon: <HomeOutlined />, label: '首页' },
    { key: '/parent/schedule', icon: <CalendarOutlined />, label: '课程表' },
    { key: '/parent/grades', icon: <FileTextOutlined />, label: '成绩' },
    { key: '/parent/fees', icon: <DollarOutlined />, label: '缴费' },
  ]

  const currentKey = '/parent/' + (pathname.split('/')[2] || 'dashboard')

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', height: 56, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#1677ff' }}>牧哲学堂</span>
          <Menu
            mode="horizontal"
            selectedKeys={[currentKey]}
            items={navItems}
            onClick={({ key }) => router.push(key)}
            style={{ border: 'none', flex: 1, minWidth: 300 }}
          />
        </div>
        <Dropdown menu={userMenu} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: '#52c41a' }} />
            <span style={{ fontSize: 14 }}>{session?.user?.name || '家长'}</span>
          </Space>
        </Dropdown>
      </Header>
      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {children}
      </Content>
    </Layout>
  )
}
