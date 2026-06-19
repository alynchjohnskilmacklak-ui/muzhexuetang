'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Layout, Input, Badge, Avatar, Dropdown, Space } from 'antd'
import { BellOutlined, SearchOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons'
import { signOut, useSession } from 'next-auth/react'
import useSWR from 'swr'

const { Header } = Layout

const SEARCH_TARGETS: { prefix: string; keywords: string[]; href: string }[] = [
  { prefix: '学生', keywords: ['学生', '学员', 'student'], href: '/students' },
  { prefix: '课程', keywords: ['课程', '课', 'course'], href: '/courses' },
  { prefix: '教师', keywords: ['教师', '老师', 'teacher'], href: '/teachers' },
  { prefix: '排课', keywords: ['排课', '课表', 'schedule'], href: '/schedule' },
  { prefix: '考勤', keywords: ['考勤', 'attendance'], href: '/attendance' },
  { prefix: '收费', keywords: ['收费', '缴费', '费用', '学费'], href: '/fees' },
  { prefix: '志愿', keywords: ['志愿', '中考', '高中', '学校'], href: '/volunteer-sim' },
  { prefix: '通知', keywords: ['通知', '消息', 'notification'], href: '/notifications' },
  { prefix: '档案', keywords: ['档案', '成绩', '学习'], href: '/student-archive' },
  { prefix: '设置', keywords: ['设置', '配置', '系统'], href: '/settings' },
]

function resolveSearchRoute(query: string): string | null {
  const trimmed = query.trim()
  if (!trimmed) return null
  for (const target of SEARCH_TARGETS) {
    if (target.keywords.some((kw) => trimmed.includes(kw))) return target.href
  }
  return null
}

export function TopNav({ mobileMode = false }: { mobileMode?: boolean } = {}) {
  const { data: session } = useSession()
  const router = useRouter()
  const user = session?.user as Record<string, unknown> | undefined
  const userName = (user?.name as string) || '管理员'
  const division = user?.division as string | undefined
  const systemName =
    division === 'SENIOR'
      ? '高中部管理系统'
      : division === 'JUNIOR'
        ? '初中部管理系统'
        : '管理系统'

  const [searchValue, setSearchValue] = useState('')

  const { data: unreadData } = useSWR(
    '/api/messages/unread-count',
    (url: string) => fetch(url).then((r) => r.ok ? r.json() : { count: 0 }),
    { refreshInterval: 60_000 },
  )
  const unreadCount: number = unreadData?.count ?? 0

  const handleSearch = useCallback(
    (value: string) => {
      const route = resolveSearchRoute(value)
      if (route) {
        router.push(route)
        setSearchValue('')
      }
    },
    [router],
  )

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: '个人信息' },
      { type: 'divider' as const },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        danger: true,
        onClick: () => signOut({ callbackUrl: `${window.location.origin}/login` }),
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
      <Input.Search
        placeholder="快速跳转：输入学生/课程/考勤等关键词"
        prefix={<SearchOutlined style={{ color: '#9a8e7a' }} />}
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onSearch={handleSearch}
        style={{ width: 320, borderRadius: 10 }}
        size="middle"
        allowClear
      />
      <Space size={20}>
        <Badge count={unreadCount} size="small" offset={[-2, 2]}>
          <BellOutlined
            style={{ fontSize: 18, cursor: 'pointer', color: '#5a4e3a' }}
            onClick={() => router.push('/notifications')}
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
