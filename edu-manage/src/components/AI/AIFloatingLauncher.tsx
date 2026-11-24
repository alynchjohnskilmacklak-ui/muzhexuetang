'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import useSWR from 'swr'
import { ArrowLeftOutlined, CloseOutlined, MessageOutlined } from '@ant-design/icons'
import styles from './AssistantBriefing.module.css'
import {
  AssistantBriefingPanel,
  AssistantBriefingPreview,
  AssistantMascotImage,
  useAssistantBriefing,
  useAssistantMascotAction,
  type AssistantRole,
} from './AssistantBriefing'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { AIRole } from '@/data/ai-prompts'
import { MEMBERSHIP_THEME, resolveMembership } from '@/constants/membership'
import { TIER_THEME, resolveTier } from '@/constants/teacher-tier'
import { getAssistantPanelGeometry } from './assistant-panel-layout'

const AIChatPanel = dynamic(
  () => import('./AIChatPanel').then((module) => module.AIChatPanel),
  { loading: () => <div role="status" style={{ padding: 20, color: 'var(--color-ink-muted)' }}>正在打开 AI 助手…</div> },
)

async function fetchParentUnreadCounts([url]: readonly [string, string]): Promise<{ total?: unknown }> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error('未读消息暂时无法读取')
  return await response.json() as { total?: unknown }
}

export const ROLE_QUESTIONS: Record<string, string[]> = {
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

export function roleToAIRole(role: string | undefined): AIRole {
  if (role === 'admin' || role === 'teacher') return role
  return 'parent'
}

/** 快捷指令：打开 AI 助手即可一键直达常看页面（按角色区分）；icon/sub 用于精细宫格，notify 入口带未读角标 */
const QUICK_LINKS: Record<string, { label: string; sub: string; href: string; icon: string; notify?: boolean }[]> = {
  parent: [
    { label: '课堂反馈', sub: '老师动态', href: '/parent/class-feedback', icon: '📝', notify: true },
    { label: '家校沟通', sub: '留言回复', href: '/parent/messages', icon: '💬', notify: true },
    { label: '缴费明细', sub: '课时余额', href: '/parent/fees', icon: '💰' },
    { label: '每日练习', sub: '专项刷题', href: '/parent/practice', icon: '✏️' },
    { label: '课程表', sub: '上课安排', href: '/parent/schedule', icon: '📅' },
    { label: '通知中心', sub: '全部消息', href: '/parent/notifications', icon: '🔔', notify: true },
  ],
  teacher: [
    { label: '今日课程', sub: '上课安排', href: '/teacher/today-lessons', icon: '📚' },
    { label: '考勤打卡', sub: '提交记录', href: '/teacher/attendance', icon: '✅' },
    { label: '我的反馈', sub: '发布动态', href: '/teacher/feedback', icon: '📝' },
    { label: '家校消息', sub: '家长留言', href: '/teacher/messages', icon: '💬', notify: true },
    { label: '课时工资', sub: '薪资明细', href: '/teacher/compensation', icon: '💰' },
  ],
  admin: [
    { label: '学员管理', sub: '学员台账', href: '/students', icon: '👥' },
    { label: '教师管理', sub: '教师档案', href: '/teachers', icon: '🧑‍🏫' },
    { label: '考勤审核', sub: '今日待核', href: '/attendance', icon: '✅' },
    { label: '课堂反馈', sub: '发布审核', href: '/classroom-feedback', icon: '📝' },
    { label: '缴费管理', sub: '缴费记录', href: '/fees', icon: '💰' },
    { label: '通知中心', sub: '全部消息', href: '/notifications', icon: '🔔', notify: true },
  ],
}

const STORAGE_KEY = 'muzhe-ai-launcher-v2'
const QUICK_HITS_KEY = 'muzhe-ai-quick-hits-v1' // 「最近在用」置顶计数

/** 快捷提问：按角色定制，点击直接进入 AI 问答（真实数据已回答，问什么答什么） */
const QUICK_QUESTIONS: Record<string, { q: string; icon: string }[]> = {
  parent: [
    { q: '帮我看看孩子的课堂反馈', icon: '📋' },
    { q: '今天孩子有什么安排', icon: '🗓️' },
    { q: '本周学习情况怎么样', icon: '📈' },
    { q: '怎么续报课程', icon: '🎓' },
  ],
  teacher: [
    { q: '今天有哪些课', icon: '📚' },
    { q: '我的课时和薪资情况', icon: '💰' },
    { q: '有哪些家长留言待回复', icon: '💬' },
    { q: '怎么提交课堂反馈', icon: '✍️' },
  ],
  admin: [
    { q: '今天运营数据怎么样', icon: '📊' },
    { q: '有哪些待审核的考勤', icon: '✅' },
    { q: '有哪些待处理的课堂反馈', icon: '📋' },
    { q: '学员和教师的情况如何', icon: '🧑‍🎓' },
  ],
}
const PEEK_SIZE = 56 // 靠边时保留小牧主体可见，同时让一部分自然缩进屏幕外
const EDGE_GAP = 24 // 展开时距边缘的间距（桌面）
const BADGE_MAX = 99
const TOP_SAFE = 72 // 留出顶部导航栏和间距，避免遮挡账号入口
const BOTTOM_SAFE_MOBILE = 96 // 移动端底部安全距离（避开底部导航）
const BOTTOM_SAFE_DESKTOP = 24

function getVerticalBounds(viewportHeight: number, ballSize: number, bottomSafe: number) {
  const maxTop = Math.max(4, viewportHeight - ballSize - bottomSafe)
  return { minTop: Math.min(TOP_SAFE, maxTop), maxTop }
}

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
    const ballSize = isMobile ? 72 : 88
    return getVerticalBounds(window.innerHeight, ballSize, bottomSafe).maxTop
  } catch {
    return 400
  }
}

function loadPref(): LauncherPref {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as LauncherPref
      if ((parsed.side === 'left' || parsed.side === 'right') && Number.isFinite(parsed.top)) {
        const mobile = window.innerWidth < 768
        const ballSize = mobile ? 72 : 88
        const bottomSafe = mobile ? BOTTOM_SAFE_MOBILE : BOTTOM_SAFE_DESKTOP
        const maxX = Math.max(4, window.innerWidth - ballSize - 4)
        const { minTop, maxTop } = getVerticalBounds(window.innerHeight, ballSize, bottomSafe)
        const savedX = Number.isFinite(parsed.x) && parsed.x >= 0 ? parsed.x : EDGE_GAP
        // Old versions allowed the launcher to be saved at the very top of
        // the viewport. Clamping that legacy value to TOP_SAFE still leaves it
        // over page content on mobile, so migrate it to the safe default spot.
        const savedTop = Number.isFinite(parsed.top) ? parsed.top : defaultTop()
        return {
          side: parsed.side,
          x: Math.min(maxX, Math.max(4, savedX)),
          top: savedTop <= minTop ? defaultTop() : Math.min(maxTop, savedTop),
          expanded: parsed.expanded === true,
        }
      }
    }
  } catch {}
  return { side: 'right', x: EDGE_GAP, top: defaultTop(), expanded: false }
}

export function AIFloatingLauncher() {
  const { data: session, status: sessionStatus } = useSession()
  const isMobile = useIsMobile() ?? false
  const [open, setOpen] = useState(false)
  /** 弹窗内双页：overview=今日概况 / chat=AI 问答（弹窗内切换，不跳路由） */
  const [panelView, setPanelView] = useState<'overview' | 'chat'>('overview')
  /** 第一页快捷提问 → 切第二页并自动发送 */
  const [quickAsk, setQuickAsk] = useState<string | null>(null)
  const [petPopped, setPetPopped] = useState(false)
  const [peeked, setPeeked] = useState(true)
  const [pref, setPref] = useState<LauncherPref>({ side: 'right', x: EDGE_GAP, top: 400 })
  const [viewportWidth, setViewportWidth] = useState<number | null>(null)
  const [viewportHeight, setViewportHeight] = useState<number | null>(null)
  const [briefingDismissed, setBriefingDismissed] = useState(false)
  const router = useRouter()
  // 拖拽状态：dragPos=拖动中球的绝对位置（left/top）；非 null 表示正在拖
  const [dragPos, setDragPos] = useState<{ left: number; top: number } | null>(null)
  const dragRef = useRef<{ startX: number; startY: number; moved: boolean } | null>(null)
  const suppressClickRef = useRef(false)
  const petOpenTimerRef = useRef<number | null>(null)
  const role = (session?.user as { role?: string } | undefined)?.role ?? 'parent'
  const unreadUserId = (session?.user as { id?: string } | undefined)?.id
  const unreadKey = sessionStatus === 'authenticated' && role === 'parent' && unreadUserId
    ? ['/api/parent/unread-counts', unreadUserId] as const
    : null
  const { data: unreadData, mutate: refreshUnread } = useSWR(unreadKey, fetchParentUnreadCounts, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const unreadTotal = Number(unreadData?.total)
  const unread = Number.isFinite(unreadTotal) && unreadTotal >= 0 ? Math.floor(unreadTotal) : 0
  const assistantRole: AssistantRole = role === 'admin' ? 'admin' : role === 'teacher' ? 'teacher' : 'parent'
  const userName = typeof session?.user?.name === 'string' ? session.user.name : ''
  const questions = ROLE_QUESTIONS[role] ?? ROLE_QUESTIONS.parent
  const aiRole = roleToAIRole(role)
  const quickLinks = QUICK_LINKS[role] ?? QUICK_LINKS.parent
  // 「最近在用」置顶：记录各快捷入口点击次数，按次数降序稳定排序（同次保持原顺序）
  const [quickHits, setQuickHits] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem(QUICK_HITS_KEY) ?? '{}') as Record<string, number>
    } catch {
      return {}
    }
  })
  const sortedQuickLinks = useMemo(() => {
    const list = quickLinks.slice()
    list.sort((a, b) => (quickHits[b.href] ?? 0) - (quickHits[a.href] ?? 0))
    return list
  }, [quickLinks, quickHits])
  const topQuickHref = sortedQuickLinks[0]?.href
  const { data: briefingData, refresh: refreshBriefing } = useAssistantBriefing(assistantRole)
  const { actionId: mascotActionId, cycleAction: cycleMascotAction } = useAssistantMascotAction(assistantRole, briefingData)
  // 等级主题：家长按会员等级（普通绿/VIP橙/SVIP深墨绿+金）、教师按教师等级、管理固定深绿 —— 注入弹窗/简报/宫格
  const levelTheme = useMemo(() => {
    if (assistantRole === 'teacher') {
      const tier = resolveTier(briefingData.teacherDashboard?.teacher?.tierLevel)
      const theme = TIER_THEME[tier]
      // ELITE keeps its dark green tier badge, but the assistant's content
      // surfaces stay light so dark body text and controls remain readable.
      return {
        accent: tier === 'ELITE' ? 'var(--color-primary)' : theme.accent,
        tint: tier === 'ELITE' ? 'var(--color-brand-gold-bg)' : theme.bg,
        gold: theme.gold || 'var(--color-brand-gold)',
      }
    }
    if (assistantRole === 'parent') {
      const level = resolveMembership(briefingData.parentToday?.students?.[0]?.student?.membershipLevel)
      const theme = MEMBERSHIP_THEME[level]
      return { accent: theme.accent, tint: theme.bg, gold: theme.gold }
    }
    return { accent: 'var(--color-primary)', tint: 'var(--color-primary-bg)', gold: 'var(--color-brand-gold)' }
  }, [assistantRole, briefingData])
  // 快捷入口未读角标：从简报动态里按类型计数（反馈/留言/通知）
  const feedbackAlertCount = briefingData.alerts.filter((a) => /FEEDBACK/.test((a.type || '').toUpperCase())).length
  const messageAlertCount = briefingData.alerts.filter((a) => (a.type || '').toUpperCase() === 'MESSAGE').length
  const noticeAlertCount = role === 'parent' ? unread : briefingData.alerts.length
  const teacherMessageCount = briefingData.teacherMessageCount ?? 0

  const handleQuickLink = useCallback(
    (href: string) => {
      setOpen(false)
      setQuickHits((current) => {
        const next = { ...current, [href]: (current[href] ?? 0) + 1 }
        try {
          localStorage.setItem(QUICK_HITS_KEY, JSON.stringify(next))
        } catch {}
        return next
      })
      router.push(href)
    },
    [router],
  )

  useEffect(() => {
    const loaded = loadPref()
    setPref(loaded)
    const mobile = window.innerWidth < 768
    // Keep the closed mascot tucked on phones even when an older saved
    // preference left it fully expanded over tappable page content.
    setPeeked(mobile || !(loaded.expanded ?? false))

    const syncViewportBounds = () => {
      const mobile = window.innerWidth < 768
      const size = mobile ? 72 : 88
      const bottomSafe = mobile ? BOTTOM_SAFE_MOBILE : BOTTOM_SAFE_DESKTOP
      const maxX = Math.max(4, window.innerWidth - size - 4)
      const { minTop, maxTop } = getVerticalBounds(window.innerHeight, size, bottomSafe)
      setViewportWidth(window.innerWidth)
      setViewportHeight(window.innerHeight)
      setPref((current) => ({
        ...current,
        x: Math.min(maxX, Math.max(4, current.x)),
        top: Math.min(maxTop, Math.max(minTop, current.top)),
      }))
    }

    syncViewportBounds()
    window.addEventListener('resize', syncViewportBounds)
    return () => window.removeEventListener('resize', syncViewportBounds)
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

  const ballSize = isMobile ? 72 : 88
  // 双端统一：水平垂直居中弹窗（电脑 480×640 / 手机 92vw×88dvh），同一套视觉规范
  const panelWidth = isMobile ? 'min(92vw, 400px)' : 'min(480px, calc(100vw - 32px))'
  const panelGeometry = getAssistantPanelGeometry(isMobile)

  const side = pref.side

  const persist = useCallback((next: LauncherPref) => {
    setPref(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {}
  }, [])

  const handleOpen = useCallback(() => {
    setOpen(true)
    setPanelView('overview')
    setQuickAsk(null)
    setPeeked(false)
    persist({ ...pref, expanded: true })
    void refreshUnread()
    void refreshBriefing()
  }, [pref, persist, refreshUnread, refreshBriefing])

  const handleClose = useCallback(() => {
    if (petOpenTimerRef.current !== null) {
      window.clearTimeout(petOpenTimerRef.current)
      petOpenTimerRef.current = null
    }
    setOpen(false)
    setPetPopped(false)
    setPeeked(true)
    // 关闭后让小羊重新从屏幕边缘倾身探头。
    persist({ ...pref, expanded: false })
  }, [pref, persist])

  const handlePetClick = useCallback(() => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (open) {
      handleClose()
      return
    }
    setPeeked(false)
    setPetPopped(true)
    if (petOpenTimerRef.current !== null) window.clearTimeout(petOpenTimerRef.current)
    petOpenTimerRef.current = window.setTimeout(() => {
      petOpenTimerRef.current = null
      handleOpen()
    }, 220)
  }, [handleClose, handleOpen, open])

  useEffect(() => () => {
    if (petOpenTimerRef.current !== null) window.clearTimeout(petOpenTimerRef.current)
  }, [])

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
      const { minTop, maxTop } = getVerticalBounds(window.innerHeight, ballSize, bottomSafe)
      const left = Math.max(4, Math.min(e.clientX - ballSize / 2, window.innerWidth - ballSize - 4))
      const top = Math.max(minTop, Math.min(e.clientY - ballSize / 2, maxTop))
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
    const { minTop, maxTop } = getVerticalBounds(window.innerHeight, ballSize, bottomSafe)
    const centerX = pos.left + ballSize / 2
    const centerY = pos.top + ballSize / 2
    const dist = {
      left: centerX,
      right: window.innerWidth - centerX,
      top: centerY - minTop,
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
      // x 始终保存展开态的正边距；收起时的负位置由 displayX 临时计算。
      x = EDGE_GAP
      top = pos.top // 垂直位置保留
      expanded = false
    } else if (nearest === 'top') {
      // 上边：贴顶；手机端仍贴边收起，避免挡住页面控件。
      top = minTop
      expanded = !isMobile
    } else {
      // 下边：贴底；手机端仍贴边收起，避免挡住页面控件。
      top = maxTop
      expanded = !isMobile
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
    zIndex: 1080,
    overflow: 'visible',
    pointerEvents: 'none',
    transition: dragPos !== null ? 'none' : 'right .28s cubic-bezier(.2, 0, 0, 1), left .28s cubic-bezier(.2, 0, 0, 1), top .28s cubic-bezier(.2, 0, 0, 1)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  }
  const petHitAreaStyle: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    borderRadius: 0,
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    touchAction: 'none',
    background: 'transparent',
    boxShadow: 'none',
    pointerEvents: 'auto',
    // The tucked phone launcher sits in the page gutter; keep the inner 10px
    // click-through so it cannot steal the trailing arrow on full-width cards.
    clipPath: peeked && isMobile
      ? side === 'right' ? 'inset(0 0 0 10px)' : 'inset(0 10px 0 0)'
      : undefined,
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
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    width: panelWidth,
    height: panelGeometry.height,
    maxWidth: '100vw',
    maxHeight: panelGeometry.maxHeight,
    background: '#FFFDF9',
    borderRadius: 24,
    boxShadow: '0 24px 64px rgba(14,59,46,.18)',
    zIndex: 1100,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  }

  const badge = unread > 0 ? (unread > BADGE_MAX ? `${BADGE_MAX}+` : String(unread)) : null

  // 通知预览面板定位：跟随悬浮球（球旁展开；球在上半屏则面板在下，反之在上）
  const alertStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1085,
    width: isMobile ? 'min(280px, calc(100vw - 78px))' : 'min(320px, calc(100vw - 20px))',
  }
  let previewAttachmentSide: 'left' | 'right' = 'right'
  let previewAttachmentPosition: 'top' | 'bottom' = 'top'
  if (!briefingDismissed && !open) {
    // Fixed-position CSS uses the layout viewport (clientWidth), which can be
    // narrower than innerWidth when a desktop scrollbar is present.
    const cssViewportWidth = viewportWidth ?? 800
    const vw = typeof document !== 'undefined'
      ? document.documentElement.clientWidth || cssViewportWidth
      : cssViewportWidth
    const vh = viewportHeight ?? 800
    const tipBallLeft = dragPos ? dragPos.left : side === 'right' ? vw - (displayX as number) - ballSize : (displayX as number)
    const tipBallTop = dragPos ? dragPos.top : pref.top
    // Keep the briefing bubble beside the mascot instead of covering its visible body.
    const bubbleGap = 0
    if (tipBallLeft + ballSize / 2 < vw / 2) {
      alertStyle.left = Math.max(10, tipBallLeft + ballSize + bubbleGap)
      previewAttachmentSide = 'left'
    } else {
      alertStyle.right = Math.max(10, vw - tipBallLeft + bubbleGap)
      previewAttachmentSide = 'right'
    }
    if (tipBallTop + ballSize < vh / 2) {
      alertStyle.top = tipBallTop + ballSize + bubbleGap
      previewAttachmentPosition = 'top'
    } else {
      alertStyle.bottom = vh - tipBallTop + bubbleGap
      previewAttachmentPosition = 'bottom'
    }
    // 面板不要超出屏幕（宽度 min(320, vw-20)，防止被裁掉）
    const panelW = Math.min(isMobile ? 280 : 320, cssViewportWidth - (isMobile ? 78 : 20))
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
    const panelLeft = typeof alertStyle.left === 'number'
      ? alertStyle.left
      : vw - (alertStyle.right as number) - panelW
    previewAttachmentSide = panelLeft + panelW / 2 < tipBallLeft + ballSize / 2 ? 'right' : 'left'
    previewAttachmentPosition = alertStyle.top !== undefined ? 'top' : 'bottom'
  }

  // 今日概况区（简报 + 快捷宫格）：默认全量展开，无「展开详情」交互
  const briefingHeader = (
    <>
      <AssistantBriefingPanel
        role={assistantRole}
        userName={userName}
        data={briefingData}
        actionId={mascotActionId}
        onCycleAction={cycleMascotAction}
        onNavigate={handleQuickLink}
        onRefresh={refreshBriefing}
      />
      <div style={{ padding: '4px 0 8px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 6,
            width: '100%',
            minWidth: 0,
          }}
        >
          {sortedQuickLinks.map((q) => {
            const badgeCount = q.notify
              ? q.href.includes('messages')
                ? (role === 'teacher' ? teacherMessageCount : messageAlertCount)
                : q.href.includes('notifications')
                  ? noticeAlertCount
                  : feedbackAlertCount
              : 0
            return (
              <button
                key={q.href}
                type="button"
                onClick={() => handleQuickLink(q.href)}
                aria-label={`${q.label}：${q.sub}${badgeCount > 0 ? `，${badgeCount} 条未读` : ''}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: 'none',
                  background: 'var(--assistant-tint, #F2F6F1)',
                  borderRadius: 12,
                  padding: '7px 9px',
                  minHeight: 40,
                  minWidth: 0,
                  position: 'relative',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'transform .12s cubic-bezier(.2, 0, 0, 1)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'var(--assistant-tint, #FFFDF9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  {q.icon}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--color-ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {q.label}
                    {Object.keys(quickHits).length > 0 && q.href === topQuickHref && (
                      <span
                        style={{
                          marginLeft: 5,
                          fontSize: 9,
                          color: 'var(--assistant-gold, #B4652E)',
                          background: 'var(--assistant-tint, #FBF1E3)',
                          padding: '1px 5px',
                          borderRadius: 8,
                          verticalAlign: 1,
                        }}
                      >
                        最近在用
                      </span>
                    )}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: 10,
                      color: 'var(--color-ink-subtle)',
                      marginTop: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {q.sub}
                  </span>
                </span>
                {badgeCount > 0 && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: 5,
                      right: 5,
                      minWidth: 17,
                      height: 17,
                      padding: '0 4px',
                      borderRadius: 9,
                      background: 'var(--assistant-accent, #E8784A)',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 700,
                      lineHeight: '17px',
                      textAlign: 'center',
                      boxShadow: '0 0 0 2px #FFFDF9',
                    }}
                  >
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )

  return (
    <div style={{ '--assistant-accent': levelTheme.accent, '--assistant-tint': levelTheme.tint, '--assistant-gold': levelTheme.gold } as React.CSSProperties}>
      {/* 手机上的悬浮气泡会遮挡正在操作的页面；简报保留在点开小牧后的助手面板里。 */}
      {viewportHeight !== null && viewportWidth !== null && viewportWidth > 1024 && viewportHeight > 600 && !isMobile && !open && !briefingDismissed && (
        <div style={alertStyle}>
          <AssistantBriefingPreview
            role={assistantRole}
            userName={userName}
            data={briefingData}
            actionId={mascotActionId}
            attachmentSide={previewAttachmentSide}
            attachmentPosition={previewAttachmentPosition}
            onCycleAction={cycleMascotAction}
            onOpen={handleOpen}
            onNavigate={handleQuickLink}
            onDismiss={() => setBriefingDismissed(true)}
          />
        </div>
      )}

      {open && (
        <div
          onClick={handleClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(14,59,46,.42)',
            zIndex: 1090,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        />
      )}

      {/* 弹窗面板 */}
      {open && (
        <div style={panelStyle} className={styles.aiPanelEnter} onClick={(e) => e.stopPropagation()}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px 10px 16px',
              background: 'linear-gradient(180deg, #FFFDF9, #FBF6EC)',
              borderBottom: '1px solid rgba(14,59,46,.06)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 36, height: 36, display: 'flex', overflow: 'hidden', borderRadius: 12 }}>
                <AssistantMascotImage actionId={mascotActionId} size={36} crop />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-ink)', letterSpacing: .3 }}>
                    小牧助手
                  </span>
                  <span
                    aria-label="在线"
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#38B26A',
                      boxShadow: '0 0 0 3px rgba(56,178,106,.18)',
                      display: 'inline-block',
                    }}
                  />
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--assistant-gold, #B4652E)',
                    letterSpacing: .4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  把每一个孩子当作自己孩子来教
                </span>
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
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-ink-subtle)',
                fontSize: 14,
                borderRadius: 8,
              }}
            >
              <CloseOutlined />
            </button>
          </div>
          {panelView === 'overview' ? (
            <>
              {/* 第一页：今日概况（简报 + 快捷宫格 + 快捷提问 + 家校服务），全量展开 */}
              <div
                style={{
                  flex: '1 1 auto',
                  minHeight: 0,
                  overflowY: 'auto',
                  overscrollBehavior: 'contain',
                  background: '#FFFDF9',
                  scrollbarWidth: 'thin',
                }}
              >
                {briefingHeader}
                <div style={{ padding: '14px 12px 4px', borderTop: '1px solid rgba(14,59,46,.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 750, color: 'var(--assistant-accent, var(--color-primary))' }}>你可以这样问小牧</span>
                    <span style={{ fontSize: 10.5, color: 'var(--color-ink-subtle)' }}>点击直接进入 AI 问答</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {(QUICK_QUESTIONS[assistantRole] ?? QUICK_QUESTIONS.parent).map((item) => (
                      <button
                        key={item.q}
                        type="button"
                        onClick={() => {
                          setQuickAsk(item.q)
                          setPanelView('chat')
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          border: '1px solid rgba(14,59,46,.14)',
                          background: '#fff',
                          color: 'var(--color-ink)',
                          borderRadius: 12,
                          minHeight: 38,
                          padding: '0 10px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(14,59,46,.06)',
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          justifyContent: 'flex-start',
                        }}
                      >
                        <span style={{ fontSize: 13, flexShrink: 0 }}>{item.icon}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.q}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ padding: '12px 12px 4px' }}>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '38px minmax(0, 1fr)',
                      alignItems: 'center',
                      gap: '6px 10px',
                      padding: '10px 12px',
                      borderRadius: 14,
                      background: 'var(--assistant-tint, var(--color-primary-bg))',
                      border: '1px solid rgba(14,59,46,.08)',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        gridRow: '1 / span 2',
                        width: 38,
                        height: 38,
                        borderRadius: 12,
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 17,
                        boxShadow: '0 1px 3px rgba(14,59,46,.08)',
                        flexShrink: 0,
                      }}
                    >
                      📞
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--color-ink)' }}>
                        家校服务热线
                      </span>
                      <span style={{ display: 'block', fontSize: 10.5, color: 'var(--color-ink-muted)', marginTop: 2, lineHeight: 1.4 }}>
                        周一至周日 08:00-21:00 · 课程、考勤、缴费问题随时联系
                      </span>
                    </span>
                    <span style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, minWidth: 0 }}>
                      {['15930114500', '18031264903'].map((phone) => (
                        <a
                          key={phone}
                          href={`tel:${phone}`}
                          aria-label={`拨打家校服务热线 ${phone}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: 0,
                            minHeight: 36,
                            padding: '0 6px',
                            background: 'var(--assistant-accent, var(--color-primary))',
                            color: '#fff',
                            borderRadius: 10,
                            fontSize: 11,
                            fontWeight: 700,
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {phone}
                        </a>
                      ))}
                    </span>
                  </div>
                </div>
                <div style={{ padding: '2px 12px 14px' }}>
                  <button
                    type="button"
                    onClick={() => setPanelView('chat')}
                    aria-label="进入 AI 智能问答"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      border: 'none',
                      background: 'linear-gradient(135deg, var(--assistant-accent, #0E3B2E), var(--assistant-accent, #0E3B2E))',
                      color: '#fff',
                      borderRadius: 14,
                      minHeight: 46,
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 6px 16px rgba(14,59,46,.16)',
                    }}
                  >
                    <MessageOutlined style={{ fontSize: 15 }} />
                    和小牧聊聊
                    <span style={{ fontSize: 11, opacity: .8, fontWeight: 500 }}>AI 智能问答 ›</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 第二页：AI 问答（全屏聊天），消息列表滚动 + 输入框固定 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  background: '#fff',
                  borderBottom: '1px solid rgba(0,0,0,.06)',
                  flexShrink: 0,
                }}
              >
                <button
                  type="button"
                  onClick={() => setPanelView('overview')}
                  aria-label="返回今日概况"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    border: 'none',
                    background: 'var(--assistant-tint, #F2F6F1)',
                    color: 'var(--assistant-accent, #0E3B2E)',
                    borderRadius: 10,
                    minHeight: 36,
                    padding: '0 12px',
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <ArrowLeftOutlined style={{ fontSize: 12 }} />
                  今日概况
                </button>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink)', marginLeft: 4 }}>
                  和小牧聊聊
                </span>
              </div>
              {/* 品牌理念横幅：办学信条 + 校训（等级主题色） */}
              <div
                style={{
                  flexShrink: 0,
                  margin: '10px 12px 0',
                  padding: '9px 12px 10px',
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, var(--assistant-accent, #0E3B2E), var(--assistant-accent, #0E3B2E))',
                  position: 'relative',
                  overflow: 'hidden',
                  color: '#fff',
                  boxShadow: '0 4px 12px rgba(14,59,46,.14)',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    right: -14,
                    top: -18,
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    background: 'var(--assistant-gold, #C9A45C)',
                    opacity: .16,
                  }}
                />
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    right: 22,
                    top: -30,
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    border: '1.5px solid var(--assistant-gold, #C9A45C)',
                    opacity: .35,
                  }}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--assistant-gold, #C9A45C)', letterSpacing: 1 }}>
                    牧哲学堂 · MOREJOY
                  </span>
                </span>
                <span
                  style={{
                    display: 'block',
                    marginTop: 3,
                    fontSize: 13,
                    fontWeight: 750,
                    lineHeight: 1.45,
                    textShadow: '0 1px 2px rgba(0,0,0,.18)',
                  }}
                >
                  没有学不会的学生，只有不会教的老师
                </span>
                <span
                  style={{
                    display: 'block',
                    marginTop: 2,
                    fontSize: 10,
                    color: 'rgba(255,255,255,.78)',
                    letterSpacing: .3,
                  }}
                >
                  不侈学识，唯恐志短 · 河北新乐 · 2016 创办
                </span>
              </div>
              <div style={{ flex: 1, minHeight: 0, background: '#f7f4f0', marginTop: 10 }}>
                <AIChatPanel
                  aiRole={aiRole}
                  suggestedQuestions={questions}
                  quickAsk={quickAsk}
                  onQuickAskHandled={() => setQuickAsk(null)}
                  onNavigate={handleQuickLink}
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* 小牧宠物：可拖拽，点宠物打开助手，气泡主任务直接跳转 */}
      <div
        data-ai-floating-launcher
        data-peek-side={side}
        className={[
          styles.petLauncher,
          peeked && !open ? styles.petLauncherPeeking : '',
          petPopped ? styles.petLauncherPopped : '',
          dragPos !== null ? styles.petLauncherDragging : '',
        ].filter(Boolean).join(' ')}
        style={ballStyle}
      >
        <button
          type="button"
          aria-label={open ? '关闭小牧AI助手' : '点击小羊打开AI助手'}
          aria-expanded={open}
          className={styles.petLauncherHitArea}
          onClick={handlePetClick}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          style={petHitAreaStyle}
        />
        <span className={styles.petLauncherArt} aria-hidden="true">
          <Image
            src="/images/assistant-mascot/companion-3d.webp"
            alt=""
            width={512}
            height={497}
            loading="eager"
            unoptimized
            draggable={false}
            sizes={ballSize + 'px'}
            style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
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
      </div>
    </div>
  )
}
