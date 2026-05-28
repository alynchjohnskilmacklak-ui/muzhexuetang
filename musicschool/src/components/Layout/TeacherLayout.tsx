'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Layout, Menu, Badge, Avatar, Dropdown, Spin, Tooltip } from 'antd'
import {
  BookOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  CoffeeOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  FileImageOutlined,
  FolderOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MessageFilled,
  StarOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { signOut } from 'next-auth/react'
import { normalizeUploadUrl } from '@/lib/upload-url'
import { useIsMobile } from '@/hooks/useIsMobile'
import { MobileLayout } from './MobileLayout'

const { Sider, Content, Header } = Layout

interface TeacherData {
  teacher: { id: string; name: string; avatar?: string | null }
  badges: { unsubmitted: number; unpublished: number; unread: number }
}

type NavItem = { key: string; icon: React.ReactNode; label: string; badgeKey?: string | null }

const navItems: NavItem[] = [
  { key: '/teacher/dashboard', icon: <DashboardOutlined />, label: '工作台' },
  { key: '/teacher/schedule', icon: <CalendarOutlined />, label: '我的课表' },
  { key: '/teacher/attendance', icon: <CheckSquareOutlined />, label: '考勤录入', badgeKey: 'unsubmitted' },
  { key: '/teacher/meals', icon: <CoffeeOutlined />, label: '就餐上报' },
  { key: '/teacher/papers', icon: <FileImageOutlined />, label: '试卷上传' },
  { key: '/teacher/classroom-feedback', icon: <BookOutlined />, label: '课堂反馈', badgeKey: 'unpublished' },
  { key: '/teacher/materials', icon: <FolderOutlined />, label: '学习资料' },
  { key: '/teacher/performance', icon: <StarOutlined />, label: '表现反馈', badgeKey: 'unread' },
  { key: '/teacher/students', icon: <TeamOutlined />, label: '我的学员' },
  { key: '/teacher/phet', icon: <ExperimentOutlined />, label: '仿真教学' },
  { key: '/teacher/ai', icon: <MessageFilled />, label: 'AI 助手' },
]

export function TeacherLayout({ children, initialData }: { children: React.ReactNode; initialData?: TeacherData }) {
  const pathname = usePathname()
  const router = useRouter()
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('teacher_sider_collapsed') === 'true'
    }
    return false
  })
  const [data, setData] = useState<TeacherData | null>(initialData || null)

  useEffect(() => {
    localStorage.setItem('teacher_sider_collapsed', String(collapsed))
  }, [collapsed])

  useEffect(() => {
    fetch('/api/teacher/dashboard')
      .then((res) => res.json())
      .then((payload) => {
        if (payload.teacher) setData({ teacher: payload.teacher, badges: payload.badges || { unsubmitted: 0, unpublished: 0, unread: 0 } })
      })
      .catch(() => {})
  }, [])

  const selectedKey = navItems.find(item => pathname.startsWith(item.key))?.key || '/teacher/dashboard'

  const menuItems = navItems.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.badgeKey && data ? (
      <Badge count={data.badges[item.badgeKey as keyof typeof data.badges] || 0} size="small" offset={[8, 0]}>
        {item.label}
      </Badge>
    ) : item.label,
  }))

  if (isMobile) {
    return (
      <MobileLayout navItems={navItems} title="牧哲学堂 教师">
        <div style={{ padding: 12 }}>{children}</div>
      </MobileLayout>
    )
  }

  if (isMobile) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#faf8f5' }}>
        <Header style={{
          position: 'fixed', inset: '0 0 auto', zIndex: 100, height: 52, padding: '0 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid #EEE7E1', background: '#fff',
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#E87545' }}>牧哲学堂 教师端</span>
          {data ? (
            <Dropdown menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => signOut({ callbackUrl: '/login' }) }] }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 0 }}>
                <Avatar size={30} icon={<UserOutlined />} src={normalizeUploadUrl(data.teacher.avatar) || undefined} />
                <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{data.teacher.name}</span>
              </div>
            </Dropdown>
          ) : <Spin size="small" />}
        </Header>
        <Content style={{ marginTop: 52, marginBottom: 68, padding: 12, width: '100%' }}>
          {children}
        </Content>
        <div style={{
          position: 'fixed', inset: 'auto 0 0', zIndex: 100, height: 68,
          display: 'flex', overflowX: 'auto', background: '#fff', borderTop: '1px solid #EEE7E1',
        }}>
          {navItems.map(item => {
            const active = selectedKey === item.key
            return (
              <button key={item.key} type="button" onClick={() => router.push(item.key)} style={{
                minWidth: 72, flex: 1, border: 0, borderTop: active ? '2px solid #E87545' : '2px solid transparent',
                background: '#fff', color: active ? '#E87545' : '#9a8e7a', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 10,
              }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </Layout>
    )
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={220}
        collapsedWidth={72}
        style={{
          background: '#FFFBF7',
          borderRight: '1px solid #F0DDD2',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 98,
          overflow: 'auto',
        }}
      >
        <div style={{
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: collapsed ? '0 12px' : '0 12px 0 20px', borderBottom: '1px solid #F0DDD2',
        }}>
          <Link href="/teacher/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Image src="/images/logo.jpg" alt="" width={28} height={28} style={{ borderRadius: 6, objectFit: 'contain' }} unoptimized />
            {!collapsed && <span style={{ fontSize: 14, fontWeight: 700, color: '#E87545', whiteSpace: 'nowrap' }}>牧哲学堂 · 教师端</span>}
          </Link>
          <Tooltip title={collapsed ? '展开导航' : '收起导航'}>
            <button onClick={() => setCollapsed(!collapsed)} style={{
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
          items={menuItems}
          onClick={({ key }) => router.push(key)}
          style={{ borderInlineEnd: 'none', background: 'transparent', marginTop: 8, fontSize: 14 }}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 72 : 220, transition: 'margin-left 0.2s', background: '#faf8f5' }}>
        <Header style={{
          padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          borderBottom: '1px solid #EEE7E1', height: 56, position: 'sticky', top: 0,
          zIndex: 97, background: '#fff', gap: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {data ? (
              <Dropdown menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => signOut({ callbackUrl: '/login' }) }] }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <Avatar size={28} icon={<UserOutlined />} src={normalizeUploadUrl(data.teacher.avatar) || undefined} />
                  <span style={{ fontSize: 13, color: '#1a1201', whiteSpace: 'nowrap' }}>{data.teacher.name}</span>
                </div>
              </Dropdown>
            ) : <Spin size="small" />}
          </div>
        </Header>
        <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto', width: '100%' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
