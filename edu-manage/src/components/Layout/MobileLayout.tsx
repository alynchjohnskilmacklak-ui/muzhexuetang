'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Badge, Drawer, Dropdown } from 'antd'
import { CloseOutlined, LeftOutlined, LogoutOutlined, RightOutlined } from '@ant-design/icons'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { isNavigationActive } from '@/lib/navigation-active'
import { clearSensitiveBrowserStorage } from '@/lib/client-sensitive-storage'
import { getDefaultTeacherAvatar } from '@/lib/default-avatar'
import { normalizeAvatarUrl } from '@/lib/upload-url'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'
import BrandBackground from '@/components/BrandBackground'
import { NavBrandIsland } from '@/components/island/nav-brand-island'
import { DrawerStudentSwitcher } from '@/components/Parent/DrawerStudentSwitcher'

const TAB_BAR_HEIGHT = 60

type MobileBackHandler = () => boolean
type MobileBackHandlerEntry = {
  handler: MobileBackHandler
  canGoBack?: () => boolean
  priority: number
  sequence: number
}
type RegisterMobileBackHandler = (handler: MobileBackHandler, priority?: number, canGoBack?: () => boolean) => () => void

const MobileBackHandlerContext = createContext<RegisterMobileBackHandler>(() => () => undefined)

export function useMobileBackHandler(handler: MobileBackHandler, priority = 0, canGoBack?: () => boolean) {
  const register = useContext(MobileBackHandlerContext)

  useEffect(() => register(handler, priority, canGoBack), [handler, priority, canGoBack, register])
}

function MobileAnimatedBadge({ count = 0, children, offset }: { count?: number; children: React.ReactNode; offset?: [number, number] }) {
  const [displayCount, setDisplayCount] = useState(count)
  const [leaving, setLeaving] = useState(false)
  const leaveTimer = useRef<number | null>(null)
  const previousCount = useRef(count)

  useEffect(() => {
    if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current)
    const previous = previousCount.current
    previousCount.current = count
    if (previous > 0 && count <= 0) {
      setLeaving(true)
      leaveTimer.current = window.setTimeout(() => {
        setDisplayCount(0)
        setLeaving(false)
      }, 220)
    } else {
      setDisplayCount(Math.max(0, count))
      setLeaving(false)
    }
    return () => {
      if (leaveTimer.current !== null) window.clearTimeout(leaveTimer.current)
    }
  }, [count])

  const label = displayCount > 99 ? '99+' : String(displayCount)
  const width = Math.max(18, label.length * 8 + 10)
  const badgeContent = displayCount > 0 ? (
    <span
      className="mobile-nav-badge-count"
      data-leaving={leaving}
      style={{
        width,
        color: '#ffffff',
        background: 'linear-gradient(135deg, #FF5B36 0%, #E02E24 100%)',
      }}
      aria-label={`${displayCount}条待处理`}
    >
      <span key={label} className="mobile-nav-badge-count__value">{label}</span>
    </span>
  ) : 0

  return <Badge count={badgeContent} size="small" offset={offset}>{children}</Badge>
}

export type MobileNavItem = {
  key: string
  icon: React.ReactNode
  label: string
  badge?: number
  sectionLabel?: string
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
  tierLabel,
  tierBadge,
  brandBackground = false,
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
  /** 等级徽标：家长端学员等级 / 教师端教师等级（浅底深字，避免挤压菜单文字） */
  tierLabel?: string
  tierBadge?: { bg: string; color: string; border?: string }
  /** 仅用于家长首页，避免把品牌背景带入教师端和管理端。 */
  brandBackground?: boolean
}) {
  const [open, setOpen] = useState(false)
  const { data: session } = useSession()
  const userRole = (session?.user as { role?: string })?.role
  const userGender = (session?.user as { gender?: string })?.gender
  const userId = (session?.user as { id?: string })?.id
  const userAvatar = (session?.user as { avatar?: string })?.avatar
  const normalizedUserAvatar = normalizeAvatarUrl(userAvatar)
  const defaultAvatarSrc = normalizedUserAvatar
    ? normalizedUserAvatar
    : userRole === 'teacher' || userRole === 'admin'
      ? getDefaultTeacherAvatar(userGender, userId)
      : (() => {
          // 家长端：根据当前学生性别显示学生默认头像
          if (typeof window !== 'undefined') {
            const match = document.cookie.match(/(?:^|;\s*)current-student-gender=([^;]+)/)
            const g = match ? decodeURIComponent(match[1]) : ''
            const isFemale = g === 'F' || g === '女' || g === 'female'
            return isFemale ? '/avatars/student-female.jpg' : '/avatars/student-male.jpg'
          }
          return '/avatars/student-male.jpg'
        })()
  const effectiveTabBackground = tabBackground ?? (headerTheme?.dark ? 'rgba(14,46,42,.98)' : '#ffffff')
  const effectiveTabBorderTop = tabBorderTop ?? (headerTheme?.dark ? '1px solid rgba(201,164,92,.30)' : '1px solid rgba(0,0,0,.06)')
  const effectiveTabInactive = tabInactiveColor ?? (headerTheme?.dark ? 'rgba(246,233,200,.78)' : 'var(--color-ink-subtle)')
  const isDarkHeader = Boolean(headerTheme?.dark) || pageTheme === 'svip'
  const pathname = usePathname()

  const drawerItems = mode === 'tabs' ? (moreItems || navItems) : navItems
  const tabs = bottomTabs.length > 0 ? bottomTabs : navItems.slice(0, 5)

  // 一级根页面判断：仅在当前路径严格等于某个底栏 Tab 的根路径时显示底栏；所有下钻/二级/三级子页面自动隐藏底栏
  const isRootTabPage = mode === 'tabs' && tabs.some((item) => {
    if (item.key === '__more') return false
    const [tabPath] = item.key.split('?')
    const cleanCurrent = pathname.replace(/\/+$/, '')
    const cleanTab = tabPath.replace(/\/+$/, '')
    return cleanCurrent === cleanTab
  })
  const hasBottomTabs = showBottomTabs ?? isRootTabPage
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

  const router = useRouter()
  const searchParams = useSearchParams()
  const [mobileBackHandlers, setMobileBackHandlers] = useState<MobileBackHandlerEntry[]>([])
  const mobileBackHandlerSequenceRef = useRef(0)
  const registerMobileBackHandler = useCallback<RegisterMobileBackHandler>((handler, priority = 0, canGoBack) => {
    const entry: MobileBackHandlerEntry = {
      handler,
      canGoBack,
      priority,
      sequence: mobileBackHandlerSequenceRef.current++,
    }
    setMobileBackHandlers((handlers) => [...handlers, entry])
    return () => {
      setMobileBackHandlers((handlers) => handlers.filter((registered) => registered !== entry))
    }
  }, [])
  const hasActiveMobileBackHandler = mobileBackHandlers.some((entry) => entry.canGoBack?.())
  const handleBack = () => {
    const handlers = [...mobileBackHandlers].sort(
      (left, right) => right.priority - left.priority || right.sequence - left.sequence,
    )
    for (const entry of handlers) {
      if (entry.handler()) return
    }

    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      const fallback = tabs.find((t) => t.key !== '__more')?.key || '/'
      router.push(fallback)
    }
  }
  const isActive = (key: string) => isNavigationActive(pathname, searchParams.toString(), key)
  const activeTabIndex = tabs.findIndex((item) => item.key !== '__more' && isActive(item.key))
  const previousActiveTabIndex = useRef(activeTabIndex)
  const transitionTimer = useRef<number | null>(null)
  const [tabTransitioning, setTabTransitioning] = useState(false)
  const [routeDirection, setRouteDirection] = useState(1)

  useEffect(() => {
    const previousIndex = previousActiveTabIndex.current
    previousActiveTabIndex.current = activeTabIndex
    if (activeTabIndex < 0 || previousIndex < 0 || previousIndex === activeTabIndex) return
    setTabTransitioning(true)
    if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current)
    transitionTimer.current = window.setTimeout(() => setTabTransitioning(false), 420)
    return () => {
      if (transitionTimer.current !== null) window.clearTimeout(transitionTimer.current)
    }
  }, [activeTabIndex])

  const setRouteDirectionForTab = (targetIndex: number) => {
    if (activeTabIndex >= 0 && targetIndex !== activeTabIndex) {
      setRouteDirection(targetIndex > activeTabIndex ? 1 : -1)
    }
  }
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<string[]>(() =>
    drawerItems.filter(item => item.children?.some(child => isActive(child.key))).map(item => item.key),
  )

  const hasBack = Boolean(!hasBottomTabs || hasActiveMobileBackHandler)

  return (
    <div id="mobile-root" data-brand-background={brandBackground ? 'true' : undefined} className={pageTheme !== 'normal' ? 'parent-page--' + pageTheme : undefined} style={{ minHeight: '100dvh', backgroundColor: brandBackground ? 'transparent' : 'var(--color-canvas)', isolation: brandBackground ? 'isolate' : undefined, width: '100%', maxWidth: '100vw', overflowX: 'clip', overflowY: 'visible' }}>
      {brandBackground && <BrandBackground />}
      {/* ---- Top Header ---- */}
      <header className="mobile-app-header" style={{
        position: 'fixed',
        inset: '0 0 auto',
        zIndex: 1200,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        background: headerTheme?.bg ?? (pageTheme === 'svip' ? '#0D3732' : pageTheme === 'vip' ? '#FFF8F2' : '#ffffff'),
        borderBottom: headerTheme?.border ?? (pageTheme === 'svip' ? '1px solid rgba(201,164,92,.30)' : '1px solid rgba(0,0,0,.06)'),
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
          {hasBottomTabs && !hasActiveMobileBackHandler ? (
            <button
              type="button"
              aria-label={open ? `关闭${menuLabel}` : `打开${menuLabel}`}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
              className="mobile-menu-trigger"
              style={{
                width: 'fit-content',
                minWidth: 76,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                padding: '0 10px',
                background: accentBackground,
                border: headerTheme?.dark
                  ? '1px solid rgba(201,164,92,.35)'
                  : pageTheme === 'vip'
                    ? '1px solid rgba(232,120,74,.25)'
                    : '1px solid rgba(44,110,82,.22)',
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
              <span className="mobile-menu-glyph" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span>{menuLabel}</span>
            </button>
          ) : (
            <div
              className="mobile-back-pill"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 36,
                borderRadius: 999,
                background: accentBackground,
                border: headerTheme?.dark
                  ? '1px solid rgba(201,164,92,.35)'
                  : pageTheme === 'vip'
                    ? '1px solid rgba(232,120,74,.25)'
                    : '1px solid rgba(44,110,82,.22)',
                overflow: 'hidden',
                position: 'relative',
                zIndex: 1,
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
              }}
            >
              <button
                type="button"
                aria-label="返回上一页"
                onClick={handleBack}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '0 8px 0 7px',
                  height: '100%',
                  color: accentColor,
                  fontSize: 12.5,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                <LeftOutlined style={{ fontSize: 12, fontWeight: 800 }} />
                <span>返回</span>
              </button>
              <div style={{ width: 1, height: 14, background: headerTheme?.dark ? 'rgba(201,164,92,.35)' : 'rgba(0, 0, 0, 0.12)' }} />
              <button
                type="button"
                aria-label={open ? `关闭${menuLabel}` : `打开${menuLabel}`}
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 8px',
                  height: '100%',
                  color: accentColor,
                  fontSize: 12.5,
                }}
              >
                <span className="mobile-menu-glyph" aria-hidden="true" style={{ width: 13 }}>
                  <span />
                  <span />
                  <span />
                </span>
              </button>
            </div>
          )}

          <div className="mobile-brand-lockup" style={{
            position: 'absolute',
            left: hasBack ? 96 : 76,
            right: hasBack ? 96 : 76,
            top: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 10,
          }}>
            <div style={{ pointerEvents: 'auto', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <NavBrandIsland
                title={typeof title === 'string' ? title : '牧哲学堂'}
                roleLabel={roleLabel}
                userRole={userRole}
                compact={true}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative', zIndex: 12 }}>
            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
              <button type="button" aria-label="打开用户菜单" style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                padding: '2px 4px',
                minHeight: 44,
                minWidth: 40,
                borderRadius: 20,
                border: 0,
                background: 'transparent',
                position: 'relative',
                zIndex: 1,
              }}>
                <CachedAvatarImage src={defaultAvatarSrc} fallbackSrc={defaultAvatarSrc} alt={name} loading="eager" style={{ width: 34, height: 34, flexShrink: 0, borderRadius: '50%', objectFit: 'cover' }} />
              </button>
            </Dropdown>
          </div>
        </div>
      </header>

      {/* ---- Left Drawer ---- */}
      <Drawer
        placement="left"
        zIndex={1190}
        rootClassName="mobile-layout-drawer"
        open={open}
        onClose={() => setOpen(false)}
        width="min(316px, calc(100vw - 44px))"
        styles={{
          header: { display: 'none' },
          body: {
            padding: 0,
            backgroundColor: '#FAF8F5',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            fontFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif',
          },
        }}
        closeIcon={null}
      >
        {/* Drawer header：学堂墨印标头 + 白玉气泡关闭按钮 */}
        <div style={{
          minHeight: 'calc(52px + env(safe-area-inset-top, 0px))',
          padding: 'env(safe-area-inset-top, 0px) 14px 0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(20, 87, 77, 0.1)',
          background: 'linear-gradient(180deg, #FAF7F2 0%, #F5EFE6 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: 'linear-gradient(135deg, #14574D 0%, #0F3E37 100%)',
                color: '#FFFFFF',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 800,
                boxShadow: '0 2px 5px rgba(20, 87, 77, 0.22)',
              }}
            >
              牧
            </span>
            <span style={{ fontSize: 15.5, fontWeight: 800, color: '#1A1201', letterSpacing: '-0.01em' }}>
              {roleLabel ? `${roleLabel} · 功能导航` : mode === 'tabs' ? '更多功能' : `${menuLabel}导航`}
            </span>
          </div>
          <button
            type="button"
            aria-label="关闭导航"
            onClick={() => setOpen(false)}
            style={{
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#FFFFFF',
              border: '1px solid rgba(20, 87, 77, 0.14)',
              boxShadow: '0 1px 4px rgba(20, 60, 50, 0.05)',
              borderRadius: '50%',
              cursor: 'pointer',
              color: '#5C503D',
              transition: 'all 0.16s ease',
            }}
          >
            <CloseOutlined style={{ fontSize: 13, fontWeight: 750 }} />
          </button>
        </div>

        {/* User profile：白玉微晶名士尊享卡 */}
        <div style={{ padding: '12px 12px 6px' }}>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 16,
              background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF8F4 100%)',
              border: '1px solid rgba(20, 87, 77, 0.09)',
              boxShadow: 'inset 0 1px 0 #FFFFFF, 0 2px 8px rgba(20, 60, 50, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <CachedAvatarImage
                  src={defaultAvatarSrc}
                  fallbackSrc={defaultAvatarSrc}
                  alt={name}
                  loading="eager"
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    display: 'block',
                    boxShadow: '0 0 0 2px #FFFFFF, 0 0 0 3.5px rgba(20, 87, 77, 0.18)',
                  }}
                />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: 15.5,
                      fontWeight: 750,
                      color: '#1A1201',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {name}
                  </span>
                  {tierLabel && (
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: 10.5,
                        fontWeight: 800,
                        lineHeight: 1,
                        padding: '3px 8px',
                        borderRadius: 999,
                        whiteSpace: 'nowrap',
                        background: tierLabel.includes('SVIP')
                          ? 'linear-gradient(135deg, #FDE68A 0%, #D97706 100%)'
                          : tierBadge?.bg ?? accentBackground,
                        color: tierLabel.includes('SVIP')
                          ? '#123C35'
                          : tierBadge?.color ?? accentColor,
                        border: tierLabel.includes('SVIP')
                          ? '1px solid rgba(255, 255, 255, 0.45)'
                          : tierBadge?.border ?? '1px solid transparent',
                        boxShadow: tierLabel.includes('SVIP')
                          ? '0 2px 6px rgba(217, 119, 6, 0.28), inset 0 1px 0 #FFFFFF'
                          : undefined,
                      }}
                    >
                      {tierLabel.includes('SVIP') ? '👑✨ SVIP 尊享' : tierLabel.includes('VIP') ? '👑 VIP' : tierLabel}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: '#8C7E6A',
                    marginTop: 3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                  }}
                >
                  {email || '牧哲学堂 · 陪伴成长'}
                </div>

                {/* 家长端：在读孩子下拉框切换 */}
                {userRole === 'parent' && (
                  <div style={{ marginTop: 6 }}>
                    <DrawerStudentSwitcher onClose={() => setOpen(false)} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Extra header content (mark all read, todo summary, etc.) */}
        {drawerHeaderExtra && (
          <div style={{ padding: '4px 12px 8px' }}>{drawerHeaderExtra}</div>
        )}

        {/* Navigation items */}
        <nav style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 10px 16px',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
        }}>
          {drawerItems.map((item, itemIdx) => {
            const sectionHeader = item.sectionLabel ? (
              <div
                key={`sec-${item.key}`}
                style={{
                  padding: itemIdx === 0 ? '4px 10px 8px' : '14px 10px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11.5,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  color: '#8C7E6A',
                  userSelect: 'none',
                }}
              >
                <span style={{ width: 3.5, height: 10, borderRadius: 2, background: 'linear-gradient(180deg, #D6B45B 0%, #14574D 100%)' }} />
                <span>{item.sectionLabel}</span>
              </div>
            ) : null

            if (item.children?.length) {
              const expanded = expandedGroupKeys.includes(item.key)
              const active = item.children.some(child => isActive(child.key))
              return (
                <div key={item.key}>
                  {sectionHeader}
                  <div style={{ marginBottom: 6 }}>
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setExpandedGroupKeys(keys => expanded ? keys.filter(key => key !== item.key) : [...keys, item.key])}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '0 10px',
                        borderRadius: 13,
                        cursor: 'pointer',
                        backgroundColor: active || expanded ? 'rgba(20, 87, 77, 0.05)' : 'transparent',
                        color: active || expanded ? accentColor : '#1A1201',
                        fontSize: 14.5,
                        fontWeight: active || expanded ? 750 : 650,
                        border: 0,
                        textAlign: 'left',
                        minHeight: 46,
                        transition: 'all .16s ease',
                      }}
                    >
                      <span
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                          flexShrink: 0,
                          background: active || expanded ? accentColor : 'rgba(20, 87, 77, 0.07)',
                          color: active || expanded ? '#FFFFFF' : '#14574D',
                          boxShadow: active || expanded ? '0 2px 6px rgba(20, 87, 77, 0.22)' : 'none',
                          transition: 'all 0.16s ease',
                        }}
                      >
                        {item.icon}
                      </span>
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.label}
                      </span>
                      <span
                        style={{
                          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.18s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          color: active || expanded ? accentColor : '#8C7E6A',
                        }}
                      >
                        <RightOutlined style={{ fontSize: 11 }} />
                      </span>
                    </button>
                    <div style={{
                      overflow: 'hidden',
                      transition: 'max-height .18s ease, opacity .18s ease',
                      maxHeight: expanded ? 800 : 0,
                      opacity: expanded ? 1 : 0,
                    }}>
                      {expanded && (
                        <div style={{ paddingLeft: 18, borderLeft: '1.5px dashed rgba(20, 87, 77, 0.15)', marginLeft: 22, marginTop: 3, marginBottom: 4 }}>
                          {item.children.map(child => {
                            const childActive = isActive(child.key)
                            return (
                              <Link
                                key={child.key}
                                href={child.key}
                                prefetch={true}
                                onClick={() => setOpen(false)}
                                style={{
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  padding: '0 10px',
                                  borderRadius: 10,
                                  marginTop: 2,
                                  position: 'relative',
                                  backgroundColor: childActive ? 'rgba(20, 87, 77, 0.1)' : 'transparent',
                                  color: childActive ? accentColor : '#4A4033',
                                  fontSize: 13.5,
                                  fontWeight: childActive ? 750 : 500,
                                  minHeight: 40,
                                  textDecoration: 'none',
                                  transition: 'all .15s ease',
                                }}
                              >
                                {childActive && (
                                  <span style={{
                                    position: 'absolute',
                                    left: 2,
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    width: 3,
                                    height: 14,
                                    borderRadius: 999,
                                    backgroundColor: accentColor,
                                  }} />
                                )}
                                <span style={{ fontSize: 15, flexShrink: 0, width: 20, textAlign: 'center', lineHeight: 1, color: childActive ? accentColor : '#8C7E6A' }}>
                                  {child.icon}
                                </span>
                                <span style={{
                                  flex: 1,
                                  minWidth: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}>
                                  {child.label}
                                </span>
                                {child.badge != null && child.badge > 0 && (
                                  <MobileAnimatedBadge count={child.badge}>
                                    <span className="mobile-nav-badge-anchor" aria-hidden="true" />
                                  </MobileAnimatedBadge>
                                )}
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            }
            const active = isActive(item.key)
            return (
              <div key={item.key}>
                {sectionHeader}
                <Link
                  key={item.key}
                  href={item.key}
                  prefetch={true}
                  onClick={() => setOpen(false)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '0 10px',
                    borderRadius: 13,
                    marginBottom: 6,
                    position: 'relative',
                    cursor: 'pointer',
                    backgroundColor: active
                      ? 'linear-gradient(135deg, rgba(20, 87, 77, 0.1) 0%, rgba(20, 87, 77, 0.04) 100%)'
                      : 'transparent',
                    border: active ? '1px solid rgba(20, 87, 77, 0.12)' : '1px solid transparent',
                    color: active ? accentColor : '#1A1201',
                    fontSize: 14.5,
                    fontWeight: active ? 750 : 650,
                    textAlign: 'left' as const,
                    transition: 'all .16s ease',
                    minHeight: 46,
                    textDecoration: 'none',
                  }}
                >
                {active && (
                  <span style={{
                    position: 'absolute',
                    left: 3,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3.5,
                    height: 18,
                    borderRadius: 999,
                    backgroundColor: accentColor,
                    boxShadow: `0 0 6px ${accentColor}`,
                  }} />
                )}
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    flexShrink: 0,
                    background: active ? accentColor : 'rgba(20, 87, 77, 0.07)',
                    color: active ? '#FFFFFF' : '#14574D',
                    boxShadow: active ? '0 2px 6px rgba(20, 87, 77, 0.22)' : 'none',
                    transition: 'all 0.16s ease',
                  }}
                >
                  {item.icon}
                </span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
                {item.badge != null && item.badge > 0 ? (
                  <MobileAnimatedBadge count={item.badge}>
                    <span className="mobile-nav-badge-anchor" aria-hidden="true" />
                  </MobileAnimatedBadge>
                ) : null}
              </Link>
            </div>
          )
        })}
        </nav>

        {/* Logout：雅致白玉安全底栏 */}
        <div style={{
          padding: '10px 12px calc(14px + env(safe-area-inset-bottom, 0px))',
          borderTop: '1px solid rgba(20, 87, 77, 0.1)',
          background: 'linear-gradient(180deg, #FAF8F5 0%, #F5EFE6 100%)',
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
              justifyContent: 'center',
              gap: 8,
              padding: '0 14px',
              borderRadius: 13,
              cursor: 'pointer',
              color: '#8A4A40',
              fontSize: 14,
              fontWeight: 700,
              backgroundColor: '#FFFFFF',
              border: '1px solid rgba(185, 47, 47, 0.2)',
              boxShadow: '0 2px 6px rgba(20, 60, 50, 0.03)',
              minHeight: 44,
              transition: 'all 0.16s ease',
            }}
          >
            <LogoutOutlined style={{ fontSize: 15 }} />
            <span>退出登录</span>
          </button>
        </div>
      </Drawer>

      {/* ---- Main Content ---- */}
      <MobileBackHandlerContext.Provider value={registerMobileBackHandler}>
      <main
        className={headerTheme?.dark ? 'mobile-page-content teacher-main--dark' : 'mobile-page-content'}
        style={{
          background: brandBackground ? 'transparent' : headerTheme?.mainBg || '#f5f7fa',
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
        <div key={pathname} className="mobile-route-enter" style={{ '--mobile-route-enter-x': `${routeDirection * 10}px` } as React.CSSProperties}>
          {children}
        </div>
      </main>
      </MobileBackHandlerContext.Provider>

      {/* ---- Bottom Tab Bar ---- */}
      {hasBottomTabs && (
        <nav style={{
          position: 'fixed',
          inset: 'auto 0 0',
          zIndex: 298,
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)',
          minHeight: 'calc(56px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          background: effectiveTabBackground,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: effectiveTabBorderTop,
          boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.04)',
        }} className="mobile-bottom-nav" data-moving={tabTransitioning} data-direction={routeDirection}>
          {activeTabIndex >= 0 && (
            <span
              aria-hidden="true"
              className="mobile-bottom-nav__indicator"
              style={{
                left: `${activeTabIndex * 100 / tabs.length}%`,
                width: `${100 / tabs.length}%`,
                background: accentBackground,
                border: pageTheme === 'svip'
                  ? '1px solid rgba(201, 164, 92, 0.45)'
                  : pageTheme === 'vip'
                    ? '1px solid rgba(232, 120, 74, 0.35)'
                    : '1px solid rgba(44, 110, 82, 0.22)',
                boxShadow: pageTheme === 'svip'
                  ? '0 2px 10px rgba(201, 164, 92, 0.18)'
                  : pageTheme === 'vip'
                    ? '0 2px 10px rgba(232, 120, 74, 0.18)'
                    : '0 2px 8px rgba(44, 110, 82, 0.12)',
                transformOrigin: routeDirection > 0 ? 'left center' : 'right center',
              }}
            />
          )}
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
              borderTop: '2px solid transparent',
              transition: 'color 380ms cubic-bezier(.16,1,.3,1), background-color 380ms cubic-bezier(.16,1,.3,1), font-weight 380ms ease',
              height: TAB_BAR_HEIGHT,
              maxHeight: TAB_BAR_HEIGHT,
            }
            const icon = (
              <MobileAnimatedBadge count={item.badge || 0} offset={[6, -2]}>
                <span className="mobile-bottom-nav__icon" style={{
                  fontSize: 20,
                  lineHeight: 1,
                  color: active ? (tabActiveColor ?? (headerTheme?.dark ? '#F6E9C8' : accentColor)) : effectiveTabInactive,
                  transition: 'color 380ms cubic-bezier(.16,1,.3,1)',
                }}>
                  {item.icon}
                </span>
              </MobileAnimatedBadge>
            )
            const label = (
              <span className="mobile-bottom-nav__label" style={{
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
                  className={`mobile-bottom-nav__item${active ? ' is-active' : ''}`}
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
                onClick={() => setRouteDirectionForTab(tabs.findIndex((tab) => tab.key === item.key))}
                className={`mobile-bottom-nav__item${active ? ' is-active' : ''}`}
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
