'use client'

import { useState } from 'react'
import { Avatar, Badge, Drawer, Dropdown } from 'antd'
import { CloseOutlined, DownOutlined, LogoutOutlined, MenuOutlined, RightOutlined, UserOutlined } from '@ant-design/icons'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clearSensitiveBrowserStorage } from '@/lib/client-sensitive-storage'
import { getDefaultTeacherAvatar } from '@/lib/default-avatar'

const TAB_BAR_HEIGHT = 60

export type MobileNavItem = {
  key: string
  icon: React.ReactNode
  label: string
  badge?: number
  children?: MobileNavItem[]
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
  menuLabel = '功能菜单',
  roleLabel,
  accentColor = 'var(--color-primary)',
  accentBackground = 'var(--color-primary-bg)',
  tabBackground,
  tabBorderTop,
  tabInactiveColor,
  tabActiveColor,
  pageTheme = 'normal',
  headerTheme,
}: {
  children: React.ReactNode
  navItems: MobileNavItem[]
  title?: React.ReactNode
  mode?: MobileLayoutMode
  bottomTabs?: MobileNavItem[]
  moreItems?: MobileNavItem[]
  showBottomTabs?: boolean
  drawerHeaderExtra?: React.ReactNode
  menuLabel?: string
  roleLabel?: string
  accentColor?: string
  accentBackground?: string
  tabBackground?: string
  tabBorderTop?: string
  tabActiveColor?: string
  tabInactiveColor?: string
  pageTheme?: 'normal' | 'vip' | 'svip'
  headerTheme?: { bg: string; fg: string; border: string; mainBg?: string; dark?: boolean }
}) {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()
  const userRole = (session?.user as { role?: string })?.role
  const userGender = (session?.user as { gender?: string })?.gender
  const userId = (session?.user as { id?: string })?.id
  const userAvatar = (session?.user as { avatar?: string })?.avatar
  const defaultAvatarSrc = userAvatar
    ? userAvatar
    : getDefaultTeacherAvatar(userRole === 'teacher' || userRole === 'admin' ? userGender : null, userRole === 'teacher' || userRole === 'admin' ? userId : null)
  const effectiveTabBackground = tabBackground ?? (headerTheme?.dark ? 'rgba(14,46,42,.98)' : '#ffffff')
  const effectiveTabBorderTop = tabBorderTop ?? (headerTheme?.dark ? '1px solid rgba(201,164,92,.30)' : '1px solid rgba(0,0,0,.06)')
  const effectiveTabInactive = tabInactiveColor ?? (headerTheme?.dark ? 'rgba(246,233,200,.78)' : 'var(--color-ink-subtle)')
  const pathname = usePathname()

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
      onClick: () => {
        clearSensitiveBrowserStorage()
        return signOut({ callbackUrl: `${window.location.origin}/login` })
      },
    }],
  }

  const isActive = (key: string) => pathname === key || pathname.startsWith(`${key}/`)
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<string[]>(() =>
    drawerItems.filter(item => item.children?.some(child => isActive(child.key))).map(item => item.key),
  )

  return (
    <div id="mobile-root" className={pageTheme !== 'normal' ? 'parent-page--' + pageTheme : undefined} style={{ minHeight: '100dvh', backgroundColor: 'var(--color-canvas)', width: '100%', maxWidth: '100vw', overflowX: 'clip', overflowY: 'visible' }}>
      {/* ---- Top Header ---- */}
      <header className="mobile-app-header" style={{
        position: 'fixed',
        inset: '0 0 auto',
        zIndex: 300,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        background: headerTheme?.bg ?? (pageTheme === 'svip' ? '#123C35' : pageTheme === 'vip' ? '#FFF3EA' : '#ffffff'),
        borderBottom: headerTheme?.border ?? (pageTheme === 'svip' ? '1px solid rgba(201,164,92,.35)' : '1px solid rgba(0,0,0,.06)'),
      }}>
        <div className="mobile-app-header__bar" style={{
          height: 56,
          color: headerTheme?.fg ?? (pageTheme === 'svip' ? '#F6E9C8' : undefined),
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 12px',
          maxWidth: '100vw',
        }}>
          <button
            type="button"
            aria-label={`打开${menuLabel}`}
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="mobile-menu-trigger"
            style={{
              width: 'fit-content',
              minWidth: 76,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              padding: '0 10px',
              background: accentBackground,
              border: '1px solid var(--color-hairline-strong)',
              borderRadius: 10,
              cursor: 'pointer',
              color: accentColor,
              fontSize: 13,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <MenuOutlined style={{ fontSize: 18 }} />
            <span>{menuLabel}</span>
          </button>

          <div className="mobile-brand-lockup" style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            minWidth: 0,
            maxWidth: 'calc(100% - 160px)',
            lineHeight: 1,
            pointerEvents: 'none',
          }}>
            <span className="mobile-brand-title" style={{
              fontSize: pageTheme === 'svip' || headerTheme ? 17 : 16,
              fontWeight: pageTheme === 'svip' || headerTheme ? 800 : 760,
              letterSpacing: pageTheme === 'svip' || headerTheme ? '0.02em' : '-0.02em',
              color: headerTheme?.fg ?? (pageTheme === 'svip' ? '#F6E9C8' : 'var(--color-ink)'),
              textShadow: pageTheme === 'svip' || headerTheme ? '0 1px 3px rgba(0,0,0,.35)' : undefined,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>{title}</span>
            {roleLabel && <span className="mobile-brand-role" style={{ flexShrink: 0, padding: '3px 5px', borderRadius: 5, color: accentColor, background: accentBackground, fontSize: 10, fontWeight: 750, whiteSpace: 'nowrap' }}>{roleLabel}</span>}
          </div>

          <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
            <button type="button" aria-label="打开用户菜单" style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              padding: '2px 6px',
              minHeight: 44,
              minWidth: 44,
              borderRadius: 20,
              border: 0,
              background: 'transparent',
              position: 'relative',
              zIndex: 1,
            }}>
              <Avatar size={32} src={defaultAvatarSrc} icon={<UserOutlined />} style={{ flexShrink: 0, objectFit: 'cover' }} />
            </button>
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
            backgroundColor: '#faf8f5',
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
          backgroundColor: '#faf8f5',
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-ink)' }}>
            {roleLabel ? `${roleLabel} · 功能导航` : mode === 'tabs' ? '更多功能' : `${menuLabel}导航`}
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
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid rgba(0,0,0,.05)',
          backgroundColor: '#faf8f5',
        }}>
          <Avatar size={40} src={defaultAvatarSrc} icon={<UserOutlined />} style={{ flexShrink: 0, objectFit: 'cover' }} />
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
            if (item.children?.length) {
              const expanded = expandedGroupKeys.includes(item.key)
              const active = item.children.some(child => isActive(child.key))
              return (
                <div key={item.key} style={{ marginBottom: 4 }}>
                  <button
                    type="button"
                    onClick={() => setExpandedGroupKeys(keys => expanded ? keys.filter(key => key !== item.key) : [...keys, item.key])}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px',
                      borderRadius: 10, cursor: 'pointer', backgroundColor: active ? accentBackground : 'transparent',
                      color: active ? accentColor : 'var(--color-ink-muted)', fontSize: 14, fontWeight: active ? 700 : 600,
                      border: 0, textAlign: 'left', minHeight: 46,
                    }}
                  >
                    <span style={{ fontSize: 19, flexShrink: 0, width: 24, textAlign: 'center' }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {expanded ? <DownOutlined /> : <RightOutlined />}
                  </button>
                  {expanded && item.children.map(child => {
                    const childActive = isActive(child.key)
                    return (
                      <Link
                        key={child.key}
                        href={child.key}
                        prefetch={true}
                        onClick={() => setOpen(false)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 12px 10px 28px', borderRadius: 10, marginBottom: 1,
                          backgroundColor: childActive ? accentBackground : 'transparent',
                          color: childActive ? accentColor : 'var(--color-ink-muted)', fontSize: 14,
                          fontWeight: childActive ? 650 : 400, minHeight: 44, textDecoration: 'none',
                        }}
                      >
                        <span style={{ fontSize: 17, flexShrink: 0, width: 24, textAlign: 'center' }}>{child.icon}</span>
                        {child.badge != null && child.badge > 0 ? (
                          <Badge count={child.badge} size="small"><span>{child.label}</span></Badge>
                        ) : <span>{child.label}</span>}
                      </Link>
                    )
                  })}
                </div>
              )
            }
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
                  gap: 12,
                  padding: '11px 12px',
                  borderRadius: 10,
                  marginBottom: 4,
                  cursor: 'pointer',
                  backgroundColor: active ? accentBackground : 'transparent',
                  color: active ? accentColor : 'var(--color-ink-muted)',
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  border: 0,
                  textAlign: 'left' as const,
                  transition: 'background-color .15s ease, color .15s ease',
                  minHeight: 46,
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
          backgroundColor: '#faf8f5',
        }}>
          <button
            type="button"
            onClick={() => {
              clearSensitiveBrowserStorage()
              return signOut({ callbackUrl: `${window.location.origin}/login` })
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 14px',
              borderRadius: 12,
              cursor: 'pointer',
              color: '#E24B4A',
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
        className={headerTheme?.dark ? 'mobile-page-content teacher-main--dark' : 'mobile-page-content'}
        style={{
          background: headerTheme?.mainBg || '#f5f7fa',
          paddingTop: 'calc(56px + env(safe-area-inset-top, 0px) + 2px)',
          paddingBottom: hasBottomTabs
            ? `calc(${TAB_BAR_HEIGHT + 26}px + max(env(safe-area-inset-bottom, 0px), 8px))`
            : 'calc(24px + max(env(safe-area-inset-bottom, 0px), 8px))',
          minHeight: '100dvh',
          maxWidth: '100vw',
          overflowX: 'clip',
          overflowY: 'visible',
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
          background: effectiveTabBackground,
          borderTop: effectiveTabBorderTop,
        }}>
          {tabs.map(item => {
            const active = item.key !== '__more' && isActive(item.key)
            const sharedStyle: React.CSSProperties = {
              flex: 1,
              minWidth: 0,
              border: 0,
              background: 'transparent',
              color: active ? (tabActiveColor ?? (headerTheme?.dark ? '#F6E9C8' : accentColor)) : effectiveTabInactive,
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
              borderRadius: 0,
              margin: 0,
              borderTop: `2px solid ${active ? (tabActiveColor ?? (headerTheme?.dark ? '#F6E9C8' : accentColor)) : 'transparent'}`,
              transition: 'color .15s ease, background-color .15s ease',
              height: TAB_BAR_HEIGHT,
              maxHeight: TAB_BAR_HEIGHT,
            }
            const icon = (
              <Badge count={item.badge || 0} size="small" offset={[6, -2]}>
                <span style={{
                  fontSize: 20,
                  lineHeight: 1,
                  color: active ? (tabActiveColor ?? (headerTheme?.dark ? '#F6E9C8' : accentColor)) : effectiveTabInactive,
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
