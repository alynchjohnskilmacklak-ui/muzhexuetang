'use client'

import { useState } from 'react'
import { Avatar, Badge, Drawer, Dropdown } from 'antd'
import { CloseOutlined, LogoutOutlined, MenuOutlined, UserOutlined } from '@ant-design/icons'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useKickListener } from '@/hooks/useKickListener'

const TAB_BAR_HEIGHT = 60

export type MobileNavItem = {
  key: string
  icon: React.ReactNode
  label: string
  badge?: number
}

type MobileLayoutMode = 'drawer' | 'tabs'

export function MobileLayout({
  children,
  navItems,
  title = '牧哲学堂',
  mode = 'drawer',
  bottomTabs = [],
  moreItems,
  showBottomTabs,
  drawerHeaderExtra,
}: {
  children: React.ReactNode
  navItems: MobileNavItem[]
  title?: string
  mode?: MobileLayoutMode
  bottomTabs?: MobileNavItem[]
  moreItems?: MobileNavItem[]
  showBottomTabs?: boolean
  drawerHeaderExtra?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  useKickListener()

  const hasBottomTabs = showBottomTabs ?? mode === 'tabs'
  const drawerItems = mode === 'tabs' ? (moreItems || navItems) : navItems
  const tabs = bottomTabs.length > 0 ? bottomTabs : navItems.slice(0, 5)
  const name = session?.user?.name || '用户'
  const email = session?.user?.email || ''
  const userMenu = {
    items: [{
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: () => signOut({ callbackUrl: `${window.location.origin}/login` }),
    }],
  }

  const isActive = (key: string) => pathname === key || pathname.startsWith(`${key}/`)

  const navigate = (key: string) => {
    if (key === '__more') {
      setOpen(true)
      return
    }
    router.push(key)
    setOpen(false)
  }

  return (
    <div id="mobile-root" style={{ minHeight: '100dvh', backgroundColor: '#faf8f5', maxWidth: '100vw', overflowX: 'hidden' }}>
      {/* ---- Top Header ---- */}
      <header style={{
        position: 'fixed',
        inset: '0 0 auto',
        zIndex: 300,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid rgba(0,0,0,.06)',
      }}>
        <div style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          maxWidth: '100vw',
        }}>
          <button
            type="button"
            aria-label="打开导航菜单"
            onClick={() => setOpen(true)}
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'none',
              border: 0,
              borderRadius: 10,
              cursor: 'pointer',
              color: '#5a4e3a',
            }}
          >
            <MenuOutlined style={{ fontSize: 20 }} />
          </button>

          <span style={{
            fontSize: 16,
            fontWeight: 700,
            color: '#E8784A',
            letterSpacing: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
            flex: 1,
            textAlign: 'center',
          }}>
            {title}
          </span>

          <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              minWidth: 0,
              padding: '2px 6px',
              borderRadius: 20,
            }}>
              <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: '#E8784A', flexShrink: 0 }} />
            </div>
          </Dropdown>
        </div>
      </header>

      {/* ---- Left Drawer ---- */}
      <Drawer
        placement="left"
        open={open}
        onClose={() => setOpen(false)}
        width={280}
        styles={{
          header: { display: 'none' },
          body: {
            padding: 0,
            backgroundColor: '#FFFBF7',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          },
        }}
        closeIcon={null}
      >
        {/* Drawer header */}
        <div style={{
          minHeight: 56,
          padding: 'env(safe-area-inset-top, 0px) 16px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0,0,0,.06)',
          backgroundColor: '#FFFBF7',
        }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#E8784A' }}>
            {mode === 'tabs' ? '更多功能' : '牧哲学堂'}
          </span>
          <button
            type="button"
            aria-label="关闭导航"
            onClick={() => setOpen(false)}
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,.04)',
              border: 0,
              borderRadius: 10,
              cursor: 'pointer',
            }}
          >
            <CloseOutlined style={{ color: '#5a4e3a', fontSize: 15 }} />
          </button>
        </div>

        {/* User profile */}
        <div style={{
          padding: '18px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid rgba(0,0,0,.05)',
          backgroundColor: '#FFFBF7',
        }}>
          <Avatar size={42} icon={<UserOutlined />} style={{ backgroundColor: '#E8784A', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 15,
              fontWeight: 600,
              color: '#1a1201',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {name}
            </div>
            <div style={{
              fontSize: 13,
              color: '#9a8e7a',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {email}
            </div>
          </div>
        </div>

        {/* Extra header content (mark all read, todo summary, etc.) */}
        {drawerHeaderExtra && (
          <div style={{ padding: '0 10px 8px' }}>{drawerHeaderExtra}</div>
        )}

        {/* Navigation items */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '10px 10px', WebkitOverflowScrolling: 'touch' }}>
          {drawerItems.map(item => {
            const active = isActive(item.key)
            return (
              <Link
                key={item.key}
                href={item.key}
                prefetch={true}
                onClick={() => setOpen(false)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 14px',
                  borderRadius: 12,
                  marginBottom: 4,
                  cursor: 'pointer',
                  backgroundColor: active ? 'rgba(232,120,74,.1)' : 'transparent',
                  color: active ? '#E8784A' : '#5a4e3a',
                  fontSize: 15,
                  fontWeight: active ? 600 : 400,
                  border: 0,
                  textAlign: 'left' as const,
                  transition: 'background-color .15s ease, color .15s ease',
                  minHeight: 50,
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: 19, flexShrink: 0, width: 24, textAlign: 'center' as const }}>
                  {item.icon}
                </span>
                {item.badge != null && item.badge > 0 ? (
                  <Badge count={item.badge} size="small">
                    <span>{item.label}</span>
                  </Badge>
                ) : (
                  <span>{item.label}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div style={{
          padding: '10px 10px calc(20px + env(safe-area-inset-bottom, 0px))',
          borderTop: '1px solid rgba(0,0,0,.05)',
          backgroundColor: '#FFFBF7',
        }}>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 14px',
              borderRadius: 12,
              cursor: 'pointer',
              color: '#d9363e',
              fontSize: 15,
              fontWeight: 500,
              backgroundColor: 'rgba(217,54,62,.06)',
              border: 0,
              minHeight: 50,
            }}
          >
            <LogoutOutlined style={{ fontSize: 18 }} />
            <span>退出登录</span>
          </button>
        </div>
      </Drawer>

      {/* ---- Main Content ---- */}
      <main
        className="mobile-page-content"
        style={{
          paddingTop: 'calc(52px + env(safe-area-inset-top, 0px) + 2px)',
          paddingBottom: hasBottomTabs
            ? `calc(${TAB_BAR_HEIGHT + 26}px + max(env(safe-area-inset-bottom, 0px), 8px))`
            : 'calc(24px + max(env(safe-area-inset-bottom, 0px), 8px))',
          minHeight: '100dvh',
          maxWidth: '100vw',
          overflowX: 'hidden',
          paddingLeft: 12,
          paddingRight: 12,
        }}
      >
        {children}
      </main>

      {/* ---- Bottom Tab Bar ---- */}
      {hasBottomTabs && (
        <nav style={{
          position: 'fixed',
          inset: 'auto 0 0',
          zIndex: 300,
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)',
          minHeight: 'calc(56px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          background: '#ffffff',
          borderTop: '1px solid rgba(0,0,0,.06)',
        }}>
          {tabs.map(item => {
            const active = item.key !== '__more' && isActive(item.key)
            const sharedStyle: React.CSSProperties = {
              flex: 1,
              minWidth: 0,
              border: 0,
              background: active ? 'rgba(232,120,74,.06)' : 'transparent',
              color: active ? '#E8784A' : '#8D806F',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              fontSize: 12,
              fontWeight: active ? 600 : 400,
              lineHeight: 1.2,
              padding: '7px 4px 5px',
              borderRadius: 10,
              margin: '4px 3px',
              transition: 'color .15s ease, background-color .15s ease',
              height: TAB_BAR_HEIGHT,
              maxHeight: TAB_BAR_HEIGHT,
            }
            const icon = (
              <Badge count={item.badge || 0} size="small" offset={[6, -2]}>
                <span style={{
                  fontSize: 20,
                  lineHeight: 1,
                  color: active ? '#E8784A' : '#8D806F',
                  transition: 'color .15s ease',
                }}>
                  {item.icon}
                </span>
              </Badge>
            )
            const label = (
              <span style={{
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {item.label}
              </span>
            )
            if (item.key === '__more') {
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setOpen(true)}
                  style={sharedStyle}
                >
                  {icon}
                  {label}
                </button>
              )
            }
            return (
              <Link
                key={item.key}
                href={item.key}
                prefetch={true}
                style={{ ...sharedStyle, textDecoration: 'none' }}
              >
                {icon}
                {label}
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}
