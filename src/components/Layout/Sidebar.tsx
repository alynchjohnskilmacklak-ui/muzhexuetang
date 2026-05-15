'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Layout, Menu } from 'antd'
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  DollarOutlined,
  BarChartOutlined,
  FileTextOutlined,
  SettingOutlined,
} from '@ant-design/icons'

const { Sider } = Layout

const menuItems = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '数据总览' },
  { key: '/students', icon: <UserOutlined />, label: '学员管理' },
  { key: '/teachers', icon: <TeamOutlined />, label: '教师管理' },
  { key: '/courses', icon: <BookOutlined />, label: '课程管理' },
  { key: '/schedule', icon: <CalendarOutlined />, label: '排课系统' },
  { key: '/attendance', icon: <CheckSquareOutlined />, label: '考勤管理' },
  { key: '/fees', icon: <DollarOutlined />, label: '收费管理' },
  { key: '/grades', icon: <FileTextOutlined />, label: '成绩管理' },
  { key: '/reports', icon: <BarChartOutlined />, label: '数据报表' },
  { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const selectedKey = '/' + (pathname.split('/')[1] || 'dashboard')

  return (
    <Sider
      width={220}
      style={{
        background: '#fff',
        borderRight: '1px solid #f0f0f0',
        height: '100vh',
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        overflow: 'auto',
      }}
    >
      <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#1677ff', whiteSpace: 'nowrap' }}>牧哲学堂</span>
      </div>
      <Menu
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={({ key }) => router.push(key)}
        style={{ borderInlineEnd: 'none', marginTop: 8 }}
      />
    </Sider>
  )
}
