'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import aiLogo from '@/assets/ai-logo.png'
import { useSession } from 'next-auth/react'
import { CloseOutlined } from '@ant-design/icons'
import { AIChatPanel } from './AIChatPanel'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { AIRole } from '@/data/ai-prompts'
import type { RecentAlert } from '@/app/api/ai/recent-alerts/route'

const ROLE_QUESTIONS: Record<string, string[]> = {
  admin: [
    '2025年石家庄中考一统线和二统线有什么区别',
    '新乐市高中分配生政策是怎么运作的',
    '寒暑假辅导班如何制定科学的课程计划',
    '家长投诉如何妥善处理，有哪些沟通技巧',
    '河北省2025年中考政策有哪些重要新变化',
  ],
  teacher: [
    '如何写好一份高质量的课堂反馈',
    '课堂上如何提高孩子的专注度',
    '怎样设计分层作业满足不同水平的学生',
    '与家长沟通有哪些实用技巧',
    '如何制定新学期教学计划',
  ],
  parent: [
    '牧哲学堂是什么样的机构？简单介绍一下',
    '牧哲学堂的校区都在哪里？怎么联系',
    '牧哲学堂有什么课程？怎么收费',
    '牧哲学堂的老师怎么样？资质如何',
    '牧哲学堂和家长怎么沟通？能实时了解孩子情况吗',
    '牧哲学堂和普通补习班有什么不同',
  ],
}

function roleToAIRole(role: string | undefined): AIRole {
  if (role === 'admin' || role === 'teacher') return role
  return 'parent'
}

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return '刚刚'
    if (m < 60) return `${m}分钟前`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}小时前`
    const d = Math.floor(h / 24)
    if (d < 7) return `${d}天前`
    return new Date(iso).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  } catch {
    return ''
  }
}

/** 快捷指令：打开 AI 助手即可一键直达常看页面（按角色区分） */
const QUICK_LINKS: Record<string, { label: string; href: string }[]> = {
  parent: [
    { label: '课堂反馈', href: '/parent/class-feedback' },
    { label: '家校沟通', href: '/parent/messages' },
    { label: '缴费明细', href: '/parent/fees' },
    { label: '每日练习', href: '/parent/practice' },
    { label: '课程表', href: '/parent/schedule' },
    { label: '通知中心', href: '/parent/notifications' },
  ],
  teacher: [
    { label: '今日课程', href: '/teacher/today-lessons' },
    { label: '考勤打卡', href: '/teacher/attendance' },
    { label: '我的反馈', href: '/teacher/feedback' },
    { label: '家校消息', href: '/teacher/messages' },
    { label: '课时工资', href: '/teacher/compensation' },
  ],
  admin: [
    { label: '学员管理', href: '/students' },
    { label: '教师管理', href: '/teachers' },
    { label: '考勤审核', href: '/attendance' },
    { label: '课堂反馈', href: '/classroom-feedback' },
    { label: '缴费管理', href: '/fees' },
    { label: '通知中心', href: '/notifications' },
  ],
}

const ALERT_TYPE_COLOR: Record<string, string> = {
  CLASSROOM_FEEDBACK: '#E8784A',
  PERFORMANCE_FEEDBACK: '#E8784A',
  PERFORMANCE_UPDATE: '#8B7BD8',
  ATTENDANCE: '#4C9F70',
  MESSAGE: '#5B8DEF',
  PAPER_PUBLISHED: '#B8860B',
  EXAM_PAPER: '#B8860B',
  STUDY_HALL_HOMEWORK: '#C86B85',
  COURSE_CHANGE_EVENT: '#6C8EAE',
  SCHEDULE_CHANGE: '#6C8EAE',
}

const STORAGE_KEY = 'muzhe-ai-launcher-v1'
const PEEK_SIZE = 44 // 贴边时露出的宽度
const EDGE_GAP = 24 // 展开时距边缘的间距（桌面）
const BADGE_MAX = 99
const TOP_SAFE = 16 // 垂直拖动时的顶部安全距离
const BOTTOM_SAFE_MOBILE = 96 // 移动端底部安全距离（避开底部导航）
const BOTTOM_SAFE_DESKTOP = 24

interface LauncherPref {
  side: 'left' | 'right'
  x: number // 距所在侧边缘的像素距离（展开态）
  top: number // 距顶部像素距离（球顶边）
  expanded?: boolean // 用户是否曾经展开过（false = 长期贴边收起）
}

function defaultTop(): number {
  try {
    const isMobile = window.innerWidth < 768
    const bottomSafe = isMobile ? BOTTOM_SAFE_MOBILE : BOTTOM_SAFE_DESKTOP
    return Math.max(TOP_SAFE, window.innerHeight - 56 - bottomSafe)
  } catch {
    return 400
  }
}

function loadPref(): LauncherPref {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as LauncherPref
      if ((parsed.side === 'left' || parsed.side === 'right') && Number.isFinite(parsed.top)) return parsed
    }
  } catch {}
  return { side: 'right', x: EDGE_GAP, top: defaultTop(), expanded: false }
}

export function AIFloatingLauncher() {
  const { data: session } = useSession()
  const isMobile = useIsMobile() ?? false
  const [open, setOpen] = useState(false)
  const [peeked, setPeeked] = useState(true)
  const [pref, setPref] = useState<LauncherPref>({ side: 'right', x: EDGE_GAP, top: 400 })
  const [unread, setUnread] = useState(0)
  // 最近通知预览（未展开时也常驻展示，点击可跳转）
  const [alerts, setAlerts] = useState<RecentAlert[]>([])
  const [alertsDismissed, setAlertsDismissed] = useState(false)
  const router = useRouter()
  // 拖拽状态：dragPos=拖动中球的绝对位置（left/top）；非 null 表示正在拖
  const [dragPos, setDragPos] = useState<{ left: number; top: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; moved: boolean } | null>(null)
  const suppressClickRef = useRef(false)
  const role = (session?.user as { role?: string } | undefined)?.role ?? 'parent'
  const questions = ROLE_QUESTIONS[role] ?? ROLE_QUESTIONS.parent
  const aiRole = roleToAIRole(role)
  const quickLinks = QUICK_LINKS[role] ?? QUICK_LINKS.parent

  const handleQuickLink = useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router],
  )

  useEffect(() => {
    const loaded = loadPref()
    setPref(loaded)
    setPeeked(!(loaded.expanded ?? false))
  }, [])

  // 打开时锁定背景滚动
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // 家长端：拉取未读总数做角标（失败静默，不影响悬浮球）
  const refreshUnread = useCallback(async () => {
    if (role !== 'parent') return
    try {
      const res = await fetch('/api/parent/unread-counts', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      const total = [data.papers, data.posts, data.notifications, data.feedbacks, data.studyHallHomework, data.messages]
        .filter(Number.isFinite)
        .reduce((sum: number, n: number) => sum + (n || 0), 0)
      setUnread(total)
    } catch {}
  }, [role])

  useEffect(() => {
    void refreshUnread()
  }, [refreshUnread])

  // ---- 最近通知预览：登录后拉取最近未读（反馈/留言/通知），常驻在球旁 ----
  const refreshAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/recent-alerts', { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      setAlerts(Array.isArray(data.alerts) ? data.alerts : [])
    } catch {}
  }, [])

  useEffect(() => {
    void refreshAlerts()
  }, [refreshAlerts])

  const ballSize = isMobile ? 52 : 56
  const panelWidth = isMobile ? 'calc(100vw - 20px)' : 420
  const panelHeight = isMobile ? 'min(78vh, 680px)' : 640

  const side = pref.side

  const persist = useCallback((next: LauncherPref) => {
    setPref(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {}
  }, [])

  const handleOpen = useCallback(() => {
    setOpen(true)
    setPeeked(false)
    persist({ ...pref, expanded: true })
    void refreshUnread()
  }, [pref, persist, refreshUnread])

  const handleClose = useCallback(() => {
    setOpen(false)
    setPeeked(true)
    // 关闭后回到贴边收起态（仅侧边位置有效；上/下边吸附保持原位由 expanded 语义管理）
    persist({ ...pref, expanded: false })
  }, [pref, persist])

  // ---- 拖拽（桌面与移动端均支持，全屏自由拖拽：水平+垂直） ----
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      dragRef.current = { startX: e.clientX, startY: e.clientY, moved: false }
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const d = dragRef.current
      if (!d) return
      const dx = e.clientX - d.startX
      const dy = e.clientY - d.startY
      if (!d.moved && Math.hypot(dx, dy) > 5) d.moved = true // 超过5px才算拖拽，否则视为点击
      if (!d.moved) return
      // 全屏自由跟随（clamp 防拖出屏幕）
      const bottomSafe = isMobile ? BOTTOM_SAFE_MOBILE : BOTTOM_SAFE_DESKTOP
      const left = Math.max(4, Math.min(e.clientX - ballSize / 2, window.innerWidth - ballSize - 4))
      const top = Math.max(TOP_SAFE, Math.min(e.clientY - ballSize / 2, window.innerHeight - ballSize - bottomSafe))
      setDragPos({ left, top })
    },
    [ballSize, isMobile],
  )

  const onPointerUp = useCallback(() => {
    const d = dragRef.current
    dragRef.current = null
    if (!d) return
    if (!d.moved) return // 点击，不吸附
    suppressClickRef.current = true // 拖完不触发点击
    const pos = dragPos ?? {
      left: side === 'right' ? window.innerWidth - pref.x - ballSize : pref.x,
      top: pref.top,
    }
    // 四边吸附：松手时收回离球最近的边，绝不停在屏幕中间
    const bottomSafe = isMobile ? BOTTOM_SAFE_MOBILE : BOTTOM_SAFE_DESKTOP
    const centerX = pos.left + ballSize / 2
    const centerY = pos.top + ballSize / 2
    const dist = {
      left: centerX,
      right: window.innerWidth - centerX,
      top: centerY - TOP_SAFE,
      bottom: window.innerHeight - centerY - bottomSafe,
    }
    const nearest = (Object.keys(dist) as Array<keyof typeof dist>).reduce((a, b) => (dist[a] <= dist[b] ? a : b))

    let nextSide = side
    let x = side === 'right' ? window.innerWidth - pos.left - ballSize : pos.left
    let top = pos.top
    let expanded = pref.expanded ?? false
    if (nearest === 'left' || nearest === 'right') {
      // 左右边：贴边收起（露出一点 + 红点提示）
      nextSide = nearest === 'left' ? 'left' : 'right'
      x = -(ballSize - PEEK_SIZE)
      top = pos.top // 垂直位置保留
      expanded = false
    } else if (nearest === 'top') {
      // 上边：贴顶完整显示
      top = TOP_SAFE
      expanded = true
    } else {
      // 下边：贴底完整显示
      top = window.innerHeight - ballSize - bottomSafe
      expanded = true
    }
    setPeeked(!expanded)
    persist({ side: nextSide, x, top, expanded })
    setDragPos(null)
  }, [dragPos, isMobile, pref.expanded, pref.x, pref.top, persist, ballSize, side])

  // 渲染时的横向位置
  const displayX = dragPos !== null ? undefined : peeked ? -(ballSize - PEEK_SIZE) : pref.x

  const ballStyle: React.CSSProperties = {
    position: 'fixed',
    top: pref.top,
    width: ballSize,
    height: ballSize,
    borderRadius: '50%',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    touchAction: 'none',
    background: '#fff',
    boxShadow: '0 6px 22px rgba(26,18,1,.28), 0 0 0 1px rgba(232,117,69,.25)',
    zIndex: 1080,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    transition: dragPos !== null ? 'none' : 'right .28s cubic-bezier(.2, 0, 0, 1), left .28s cubic-bezier(.2, 0, 0, 1), top .28s cubic-bezier(.2, 0, 0, 1)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  }
  if (dragPos !== null) {
    // 拖动中：绝对位置实时跟随
    ballStyle.left = dragPos.left
    ballStyle.top = dragPos.top
  } else if (side === 'left') {
    ballStyle.left = displayX
  } else {
    ballStyle.right = displayX
  }

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: isMobile ? 10 : 24,
    width: panelWidth,
    height: panelHeight,
    maxWidth: 'calc(100vw - 20px)',
    background: '#f7f4f0',
    borderRadius: 16,
    boxShadow: '0 16px 48px rgba(0,0,0,.25)',
    zIndex: 1100,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  }
  if (side === 'left') panelStyle.left = isMobile ? 10 : 24
  else panelStyle.right = isMobile ? 10 : 24
  if (!isMobile && !dragPos) {
    // 桌面端：面板在悬浮球附近垂直展开（不遮挡球）
    const panelTop = Math.min(pref.top + ballSize + 10, window.innerHeight - 640 - 12)
    panelStyle.top = Math.max(12, panelTop)
    delete panelStyle.bottom
  }

  const badge = unread > 0 ? (unread > BADGE_MAX ? `${BADGE_MAX}+` : String(unread)) : null

  // 通知预览面板定位：跟随悬浮球（球旁展开；球在上半屏则面板在下，反之在上）
  const alertStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1085,
    width: 'min(320px, calc(100vw - 20px))',
  }
  if (alerts.length > 0 && !alertsDismissed && !open) {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 800
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800
    const tipBallLeft = dragPos ? dragPos.left : side === 'right' ? vw - (displayX as number) - ballSize : (displayX as number)
    const tipBallTop = dragPos ? dragPos.top : pref.top
    if (tipBallLeft + ballSize / 2 < vw / 2) alertStyle.left = Math.max(10, tipBallLeft + ballSize + 8)
    else alertStyle.right = Math.max(10, vw - tipBallLeft + 8)
    if (tipBallTop + ballSize < vh / 2) alertStyle.top = tipBallTop + ballSize + 8
    else alertStyle.bottom = vh - tipBallTop + 8
    // 面板不要超出屏幕（宽度 min(320, vw-20)，防止被裁掉）
    const panelW = Math.min(320, vw - 20)
    if (alertStyle.right !== undefined) {
      const panelLeft = vw - (alertStyle.right as number) - panelW
      if (panelLeft < 10) {
        alertStyle.left = 10
        delete alertStyle.right
      }
    } else if (alertStyle.left !== undefined) {
      const panelRight = vw - (alertStyle.left as number) - panelW
      if (panelRight < 10) {
        alertStyle.right = 10
        delete alertStyle.left
      }
    }
  }

  const handleAlertClick = useCallback(
    (a: RecentAlert) => {
      setAlertsDismissed(true)
      if (a.key.startsWith('nt_') && role === 'parent') {
        void fetch('/api/parent/notifications/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: a.key.slice(3) }),
        }).catch(() => {})
        void refreshUnread()
      }
      setOpen(false)
      router.push(a.href)
    },
    [role, router, refreshUnread],
  )

  return (
    <>
      {/* 最近通知预览：登录后常驻展示，点击条目直达对应页面 */}
      {alerts.length > 0 && !alertsDismissed && !open && (
        <div
          role="status"
          style={{
            ...alertStyle,
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 10px 30px rgba(26,18,1,.22), 0 0 0 1px rgba(232,117,69,.18)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 12px 8px 14px',
              background: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1201' }}>最近通知</span>
              <span
                style={{
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  borderRadius: 9,
                  background: '#E8784A',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  lineHeight: '18px',
                  textAlign: 'center',
                }}
              >
                {alerts.length > 9 ? '9+' : alerts.length}
              </span>
            </div>
            <button
              type="button"
              aria-label="关闭通知预览"
              onClick={() => setAlertsDismissed(true)}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                width: 26,
                height: 26,
                color: '#b0a28c',
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {alerts.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => handleAlertClick(a)}
                style={{
                  display: 'flex',
                  gap: 10,
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  borderTop: '1px solid rgba(0,0,0,.05)',
                  background: 'transparent',
                  padding: '9px 14px',
                  cursor: 'pointer',
                  alignItems: 'flex-start',
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    marginTop: 5,
                    background: ALERT_TYPE_COLOR[a.type] || '#E8784A',
                  }}
                />
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#1a1201', lineHeight: 1.4 }}>
                    {a.title}
                  </span>
                  {a.snippet && (
                    <span style={{ display: 'block', fontSize: 12, color: '#8a7c66', marginTop: 2, lineHeight: 1.4 }}>
                      {a.snippet}
                    </span>
                  )}
                </span>
                <span style={{ flexShrink: 0, fontSize: 11, color: '#b0a28c', marginTop: 2 }}>{timeAgo(a.time)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {open && (
        <div
          onClick={handleClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(26,18,1,.35)',
            zIndex: 1090,
            backdropFilter: 'blur(1px)',
          }}
        />
      )}

      {/* 弹窗面板 */}
      {open && (
        <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px 10px 16px',
              background: '#fff',
              borderBottom: '1px solid rgba(0,0,0,.06)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Image
                src={aiLogo}
                alt=""
                width={26}
                height={26}
                style={{ objectFit: 'cover', borderRadius: 6 }}
              />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1201' }}>
                小牧 AI 助手
              </span>
            </div>
            <button
              type="button"
              aria-label="关闭AI助手"
              onClick={handleClose}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#8a7c66',
                fontSize: 14,
                borderRadius: 8,
              }}
            >
              <CloseOutlined />
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              overflowX: 'auto',
              padding: '8px 14px',
              background: '#fff',
              borderBottom: '1px solid rgba(0,0,0,.06)',
              flexShrink: 0,
              scrollbarWidth: 'none',
            }}
          >
            {quickLinks.map((q) => (
              <button
                key={q.href}
                type="button"
                onClick={() => handleQuickLink(q.href)}
                style={{
                  flexShrink: 0,
                  border: '1px solid rgba(232,117,69,.35)',
                  background: '#FFF6F0',
                  color: '#C85A2C',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 999,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {q.label}
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <AIChatPanel aiRole={aiRole} suggestedQuestions={questions} />
          </div>
        </div>
      )}

      {/* 悬浮球：可拖拽（桌面），贴边收起态露出一点，点击滑出；再点开弹窗 */}
      <button
        type="button"
        aria-label="打开AI助手"
        onClick={() => {
          if (suppressClickRef.current) { suppressClickRef.current = false; return }
          if (peeked) { setPeeked(false); handleOpen(); return }
          setOpen((v) => !v)
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={ballStyle}
      >
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fff',
            pointerEvents: 'none',
          }}
        >
          <Image
            src={aiLogo}
            alt="AI助手"
            width={ballSize}
            height={ballSize}
            style={{ objectFit: 'cover', width: '100%', height: '100%', borderRadius: '50%' }}
          />
        </span>
        {/* 未读角标（家长端） */}
        {badge && (
          <span
            aria-label={`${unread}条未读动态`}
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: 20,
              height: 20,
              padding: '0 5px',
              borderRadius: 10,
              background: '#E8784A',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              lineHeight: '20px',
              textAlign: 'center',
              boxShadow: '0 0 0 2px #fff',
              pointerEvents: 'none',
            }}
          >
            {badge}
          </span>
        )}
        {peeked && (
          <span
            style={{
              position: 'absolute',
              top: '50%',
              width: 10,
              height: 10,
              marginTop: -5,
              borderRadius: '50%',
              background: '#E8784A',
              boxShadow: '0 0 0 2px #fff',
              pointerEvents: 'none',
              ...(side === 'right' ? { left: 3 } : { right: 3 }),
            }}
          />
        )}
        {peeked && (
          <span
            style={{
              position: 'absolute',
              top: '50%',
              marginTop: -2,
              fontSize: 10,
              color: '#E8784A',
              lineHeight: 1,
              pointerEvents: 'none',
              ...(side === 'right' ? { left: 16 } : { right: 16, transform: 'scaleX(-1)' }),
            }}
          >
            ›
          </span>
        )}
      </button>
    </>
  )
}
