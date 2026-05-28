'use client'

import { useState } from 'react'
import { Avatar, Badge, Drawer, Dropdown } from 'antd'
import { CloseOutlined, LogoutOutlined, MenuOutlined, UserOutlined } from '@ant-design/icons'
import { signOut, useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'

export type MobileNavItem = {
  key: string
  icon: React.ReactNode
  label: string
  badge?: number
}

export function MobileLayout({ children, navItems, title = '牧哲学堂' }: {
  children: React.ReactNode
  navItems: MobileNavItem[]
  title?: string
}) {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  const name = session?.user?.name || '用户'
  const email = session?.user?.email || ''
  const userMenu = {
    items: [{
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: () => signOut({ callbackUrl: '/login' }),
    }],
  }

  const navigate = (key: string) => {
    router.push(key)
    setOpen(false)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#faf8f5' }}>
      <div style={{
        position: 'fixed', inset: '0 0 auto', zIndex: 300, height: 52,
        backgroundColor: '#fff', borderBottom: '1px solid rgba(0,0,0,.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', boxShadow: '0 1px 4px rgba(0,0,0,.06)',
      }}>
        <button type="button" aria-label="Open navigation" onClick={() => setOpen(true)} style={{
          background: 'none', border: 0, padding: 8, cursor: 'pointer',
          display: 'flex', alignItems: 'center', borderRadius: 8, color: '#1a1201',
        }}>
          <MenuOutlined style={{ fontSize: 20 }} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#E87545', letterSpacing: 1 }}>{title}</span>
        <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', minWidth: 0 }}>
            <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: '#E87545', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#1a1201', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
          </div>
        </Dropdown>
      </div>

      <Drawer
        placement="left"
        open={open}
        onClose={() => setOpen(false)}
        width={260}
        styles={{
          header: { display: 'none' },
          body: { padding: 0, backgroundColor: '#1a1201', display: 'flex', flexDirection: 'column' },
        }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#E87545' }}>牧哲学堂</span>
          <button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 4 }}>
            <CloseOutlined style={{ color: '#9a8e7a', fontSize: 16 }} />
          </button>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,.08)' }}>
          <Avatar size={40} icon={<UserOutlined />} style={{ backgroundColor: '#E87545', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            <div style={{ fontSize: 12, color: '#9a8e7a', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {navItems.map(item => {
            const active = pathname === item.key || pathname.startsWith(`${item.key}/`)
            return (
              <button key={item.key} type="button" onClick={() => navigate(item.key)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 10, marginBottom: 2, cursor: 'pointer',
                backgroundColor: active ? 'rgba(232,117,69,.15)' : 'transparent',
                color: active ? '#E87545' : '#d0c8bc', fontSize: 14, fontWeight: active ? 600 : 400,
                border: 0, borderLeft: active ? '3px solid #E87545' : '3px solid transparent',
                textAlign: 'left',
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                {(item.badge ?? 0) > 0 ? <Badge dot><span>{item.label}</span></Badge> : <span>{item.label}</span>}
              </button>
            )
          })}
        </div>
        <div style={{ padding: '12px 12px 24px' }}>
          <button type="button" onClick={() => signOut({ callbackUrl: '/login' })} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
            borderRadius: 10, cursor: 'pointer', color: '#e03e2d', fontSize: 14,
            backgroundColor: 'rgba(224,62,45,.08)', border: 0,
          }}>
            <LogoutOutlined style={{ fontSize: 18 }} />
            <span>退出登录</span>
          </button>
        </div>
      </Drawer>
      <div style={{ paddingTop: 52, minHeight: '100vh' }}>{children}</div>
    </div>
  )
}
