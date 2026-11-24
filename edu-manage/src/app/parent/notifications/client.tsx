'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, Typography } from 'antd'
import {
  AimOutlined,
  ArrowRightOutlined,
  BellOutlined,
  BookOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  StarOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { formatFriendlyTime } from '@/lib/date/relative'
import { useRouter } from 'next/navigation'
import { useSWRConfig } from 'swr'
import { isParentUnreadCountsCacheKey } from '@/lib/parent-unread-cache'
import { useIsMobile } from '@/hooks/useIsMobile'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { PullToRefresh } from '@/components/PullToRefresh'
import { resolveTier, TIER_THEME, type TeacherTier } from '@/constants/teacher-tier'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'
import { AnimatedNumber } from '@/components/Common/AnimatedNumber'
import { getArchiveEntryTransitionName, runDocumentViewTransition } from '@/lib/ui-motion'

const { Text, Paragraph } = Typography

type NotificationType = {
  label: string
  icon: React.ReactNode
  /** 主色（深色） */
  color: string
  /** 浅色底 */
  bg: string
  /** 渐变（图标容器） */
  gradient: string
  /** 筛选分类 */
  category: 'feedback' | 'growth' | 'notice' | 'other'
}

const TYPE_META: Record<string, NotificationType> = {
  CLASSROOM_PICK: {
    label: '随堂互动',
    icon: <AimOutlined />,
    color: '#1E4D3A',
    bg: '#E8F2EC',
    gradient: 'linear-gradient(135deg, #2E6B50, #1E4D3A)',
    category: 'feedback',
  },
  CLASSROOM_FEEDBACK: {
    label: '课堂反馈',
    icon: <BookOutlined />,
    color: '#1E4D3A',
    bg: '#E8F2EC',
    gradient: 'linear-gradient(135deg, #2E6B50, #1E4D3A)',
    category: 'feedback',
  },
  PERFORMANCE_FEEDBACK: {
    label: '表现反馈',
    icon: <StarOutlined />,
    color: '#A6781F',
    bg: '#F7EED8',
    gradient: 'linear-gradient(135deg, #D9B36A, #A6781F)',
    category: 'growth',
  },
  PERFORMANCE_UPDATE: {
    label: '表现更新',
    icon: <StarOutlined />,
    color: '#A6781F',
    bg: '#F7EED8',
    gradient: 'linear-gradient(135deg, #D9B36A, #A6781F)',
    category: 'growth',
  },
  PAPER_PUBLISHED: {
    label: '试卷通知',
    icon: <FileTextOutlined />,
    color: '#3E6B8C',
    bg: '#EAF1F6',
    gradient: 'linear-gradient(135deg, #5B8DB0, #3E6B8C)',
    category: 'notice',
  },
  EXAM_PAPER: {
    label: '试卷通知',
    icon: <FileTextOutlined />,
    color: '#3E6B8C',
    bg: '#EAF1F6',
    gradient: 'linear-gradient(135deg, #5B8DB0, #3E6B8C)',
    category: 'notice',
  },
  ATTENDANCE: {
    label: '考勤通知',
    icon: <ClockCircleOutlined />,
    color: '#B07A1E',
    bg: '#FBF0DC',
    gradient: 'linear-gradient(135deg, #D9A84C, #B07A1E)',
    category: 'notice',
  },
  STUDY_HALL_HOMEWORK: {
    label: '作业班',
    icon: <BookOutlined />,
    color: '#C05B22',
    bg: '#FBEAE2',
    gradient: 'linear-gradient(135deg, #E08B52, #C05B22)',
    category: 'notice',
  },
  SYSTEM: {
    label: '系统通知',
    icon: <BellOutlined />,
    color: '#7A6E60',
    bg: '#F2EEE8',
    gradient: 'linear-gradient(135deg, #A99B8A, #7A6E60)',
    category: 'notice',
  },
  INFO: {
    label: '通知',
    icon: <BellOutlined />,
    color: '#7A6E60',
    bg: '#F2EEE8',
    gradient: 'linear-gradient(135deg, #A99B8A, #7A6E60)',
    category: 'notice',
  },
  WEEKLY_DIGEST: {
    label: '学习周报',
    icon: <FileTextOutlined />,
    color: '#A6781F',
    bg: '#F7EED8',
    gradient: 'linear-gradient(135deg, #D9B36A, #A6781F)',
    category: 'notice',
  },
  leave: {
    label: '请假通知',
    icon: <ClockCircleOutlined />,
    color: '#B07A1E',
    bg: '#FBF0DC',
    gradient: 'linear-gradient(135deg, #D9A84C, #B07A1E)',
    category: 'notice',
  },
}

type ParentNotification = {
  id: string
  type: string
  relatedType?: string | null
  relatedId?: string | null
  href?: string | null
  title: string
  content?: string | null
  createdAt: string
  read: boolean
  subject?: string | null
  teacherName?: string | null
  teacherAvatar?: string | null
  teacherTier?: string | null
  teacherGender?: string | null
  pickResult?: string | null
  pickComment?: string | null
  questionLabel?: string | null
}

/** 反馈类通知的引导文案 */
const ACTION_TEXT: Record<string, string> = {
  CLASSROOM_FEEDBACK: '发布了课堂反馈，请您点击查看',
  CLASSROOM_PICK: '在随堂互动中进行了即时互动提问，点开可查看即时点评',
  PERFORMANCE_FEEDBACK: '发布了成长反馈，请您点击查看',
  PERFORMANCE_UPDATE: '更新了表现记录，请您点击查看',
}

function getNotificationMeta(n: ParentNotification): NotificationType {
  return TYPE_META[n.relatedType || ''] || TYPE_META[n.type] || TYPE_META.INFO
}

/** 学科徽标：反馈类通知按学科显示字符徽标（数/英/物/化…），配色贴合学科 */
const SUBJECT_META: Record<string, { label: string; gradient: string; bg: string; color: string }> = {
  数学: { label: '数', gradient: 'linear-gradient(135deg, #2E6B50, #1E4D3A)', bg: '#E8F2EC', color: '#1E4D3A' },
  语文: { label: '语', gradient: 'linear-gradient(135deg, #C0665A, #A84B3F)', bg: '#FBEAE6', color: '#A84B3F' },
  英语: { label: '英', gradient: 'linear-gradient(135deg, #5B8DB0, #3E6B8C)', bg: '#EAF1F6', color: '#3E6B8C' },
  物理: { label: '物', gradient: 'linear-gradient(135deg, #6A7BC8, #4A5FB0)', bg: '#ECEFFB', color: '#4A5FB0' },
  化学: { label: '化', gradient: 'linear-gradient(135deg, #9677C4, #7A5AA8)', bg: '#F1EBF9', color: '#7A5AA8' },
  生物: { label: '生', gradient: 'linear-gradient(135deg, #3FA07E, #2E8B6A)', bg: '#E7F5EF', color: '#2E8B6A' },
  历史: { label: '史', gradient: 'linear-gradient(135deg, #A98A5A, #8A6A3B)', bg: '#F7F0E2', color: '#8A6A3B' },
  地理: { label: '地', gradient: 'linear-gradient(135deg, #5F9DC0, #3E7BA8)', bg: '#E9F3F9', color: '#3E7BA8' },
  政治: { label: '政', gradient: 'linear-gradient(135deg, #C9A45C, #A6781F)', bg: '#F7EED8', color: '#A6781F' },
  道德与法治: { label: '政', gradient: 'linear-gradient(135deg, #C9A45C, #A6781F)', bg: '#F7EED8', color: '#A6781F' },
}

/** 反馈类通知类型（包含随堂互动） */
const FEEDBACK_TYPES = new Set(['CLASSROOM_FEEDBACK', 'PERFORMANCE_FEEDBACK', 'PERFORMANCE_UPDATE', 'CLASSROOM_PICK'])

/** 分类 → 相关类型集合（用于按分类批量已读） */
const CATEGORY_RELATED_TYPES: Record<'feedback' | 'notice', string[]> = {
  feedback: ['CLASSROOM_FEEDBACK', 'PERFORMANCE_FEEDBACK', 'PERFORMANCE_UPDATE', 'CLASSROOM_PICK'],
  notice: [
    'ATTENDANCE',
    'leave',
    'PAPER_PUBLISHED',
    'EXAM_PAPER',
    'STUDY_HALL_HOMEWORK',
    'COURSE_CHANGE_EVENT',
    'SCHEDULE_CHANGE',
    'SYSTEM',
    'INFO',
    'PARENT_MESSAGE',
    'PARENT_MESSAGE_REPLY',
  ],
}

export type TeacherThemeStyle = {
  badgeBg: string
  badgeFg: string
  badgeBorder: string
  avatarBorder: string
  avatarRing: string
  calloutBg: string
  calloutBorder: string
  calloutText: string
  tagBg: string
  tagFg: string
  tagBorder: string
  btnBg: string
  btnFg: string
  btnBorder: string
}

export const TIER_THEME_STYLE: Record<TeacherTier, TeacherThemeStyle> = {
  ELITE: {
    // 牧哲学堂专属教师（墨绿 + 璀璨金）
    badgeBg: 'linear-gradient(135deg, #12433A 0%, #0A2E27 100%)',
    badgeFg: '#FCE7B8',
    badgeBorder: '1px solid rgba(217, 179, 106, 0.75)',
    avatarBorder: '2px solid #C9A45C',
    avatarRing: '0 0 0 2px rgba(201, 164, 92, 0.3)',
    calloutBg: '#F3FAF7',
    calloutBorder: '#14574D',
    calloutText: '#14382F',
    tagBg: '#EAF6F2',
    tagFg: '#14574D',
    tagBorder: 'rgba(20, 87, 77, 0.2)',
    btnBg: 'linear-gradient(135deg, #14574D, #0E423A)',
    btnFg: '#FFFFFF',
    btnBorder: '#14574D',
  },
  MANAGER: {
    // 管理教师（典雅紫 + 皇家金）
    badgeBg: 'linear-gradient(135deg, #3C2E8A 0%, #2A1F6E 100%)',
    badgeFg: '#F8EEFF',
    badgeBorder: '1px solid rgba(167, 139, 250, 0.75)',
    avatarBorder: '2px solid #7C6BC4',
    avatarRing: '0 0 0 2px rgba(124, 107, 196, 0.3)',
    calloutBg: '#F7F5FC',
    calloutBorder: '#5E4DB2',
    calloutText: '#231B4D',
    tagBg: '#F0ECF9',
    tagFg: '#5E4DB2',
    tagBorder: 'rgba(94, 77, 178, 0.2)',
    btnBg: 'linear-gradient(135deg, #4C3FA8, #3A2F88)',
    btnFg: '#FFFFFF',
    btnBorder: '#4C3FA8',
  },
  SENIOR: {
    // 高级教师（深海蓝 + 耀金）
    badgeBg: 'linear-gradient(135deg, #164264 0%, #0E2C44 100%)',
    badgeFg: '#E0F2FE',
    badgeBorder: '1px solid rgba(125, 211, 252, 0.75)',
    avatarBorder: '2px solid #38BDF8',
    avatarRing: '0 0 0 2px rgba(56, 189, 248, 0.3)',
    calloutBg: '#F2F8FC',
    calloutBorder: '#1A6494',
    calloutText: '#103750',
    tagBg: '#E6F3FA',
    tagFg: '#1A6494',
    tagBorder: 'rgba(26, 100, 148, 0.2)',
    btnBg: 'linear-gradient(135deg, #1B5780, #134262)',
    btnFg: '#FFFFFF',
    btnBorder: '#1B5780',
  },
  EXPERIENCED: {
    // 骨干教师（暖枫橙 + 琥珀金）
    badgeBg: 'linear-gradient(135deg, #BA4A1D 0%, #8C3411 100%)',
    badgeFg: '#FFF1E8',
    badgeBorder: '1px solid rgba(251, 146, 60, 0.75)',
    avatarBorder: '2px solid #E8784A',
    avatarRing: '0 0 0 2px rgba(232, 120, 74, 0.3)',
    calloutBg: '#FCF7F3',
    calloutBorder: '#C85725',
    calloutText: '#461E0D',
    tagBg: '#FBECE4',
    tagFg: '#C85725',
    tagBorder: 'rgba(200, 87, 37, 0.2)',
    btnBg: 'linear-gradient(135deg, #C85725, #9E3E13)',
    btnFg: '#FFFFFF',
    btnBorder: '#C85725',
  },
  NEW: {
    // 新晋教师（活力碧玉 + 嫩竹绿）
    badgeBg: 'linear-gradient(135deg, #1B6E4E 0%, #114D36 100%)',
    badgeFg: '#E8FAF2',
    badgeBorder: '1px solid rgba(74, 222, 128, 0.75)',
    avatarBorder: '2px solid #34D399',
    avatarRing: '0 0 0 2px rgba(52, 211, 153, 0.3)',
    calloutBg: '#F2FBF6',
    calloutBorder: '#238E66',
    calloutText: '#103E2C',
    tagBg: '#E7F7EF',
    tagFg: '#238E66',
    tagBorder: 'rgba(35, 142, 102, 0.2)',
    btnBg: 'linear-gradient(135deg, #1F835E, #146044)',
    btnFg: '#FFFFFF',
    btnBorder: '#1F835E',
  },
}

/** 通知头像：严格根据匹配到的教师真实档案与主题配色渲染 */
function NotificationAvatar({ n, isMobile }: { n: ParentNotification; isMobile: boolean }) {
  const meta = getNotificationMeta(n)
  const isFeedback = FEEDBACK_TYPES.has(n.relatedType || '')
  const tier = resolveTier(n.teacherTier)
  const tierStyle = TIER_THEME_STYLE[tier]
  const size = isMobile ? 46 : 50

  // 老师真实照片（带有等级主题金环与投影）
  if (isFeedback && n.teacherName) {
    const avatarSrc = getTeacherAvatarUrl(n.teacherAvatar, n.teacherGender, n.teacherName)
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 14,
          flexShrink: 0,
          overflow: 'hidden',
          position: 'relative',
          background: '#F5EFE6',
          boxShadow: n.read ? '0 2px 6px rgba(0,0,0,0.06)' : '0 4px 14px rgba(20,87,77,0.18)',
          border: tierStyle.avatarBorder,
          outline: tierStyle.avatarRing,
        }}
      >
        <CachedAvatarImage
          src={avatarSrc}
          fallbackSrc={getTeacherAvatarUrl(null, n.teacherGender, n.teacherName)}
          alt={n.teacherName}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    )
  }

  // 学科徽标
  const subject = n.subject ? SUBJECT_META[n.subject] : undefined
  if (isFeedback && subject) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 14,
          flexShrink: 0,
          background: subject.gradient,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          fontWeight: 800,
          boxShadow: `0 3px 10px ${subject.color}40`,
        }}
      >
        {subject.label}
      </div>
    )
  }

  // 类型图标（作业、通知、考勤等：采用阳光明朗的暖橙底托，彻底告别灰暗）
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        flexShrink: 0,
        background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)',
        color: '#D97706',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 19,
        boxShadow: '0 2px 8px rgba(217, 119, 6, 0.12)',
      }}
    >
      {meta.icon}
    </div>
  )
}

/** 老师等级标签：按教师标签定制主题，保持鲜亮明朗，不再暗淡褪色 */
export function TeacherTierBadge({ tier }: { tier?: string | null; read?: boolean }) {
  const resolved: TeacherTier = resolveTier(tier)
  const theme = TIER_THEME[resolved]
  const tierStyle = TIER_THEME_STYLE[resolved]
  return (
    <span
      style={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '3px 10px',
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        letterSpacing: 0.3,
        color: tierStyle.badgeFg,
        background: tierStyle.badgeBg,
        border: tierStyle.badgeBorder,
        boxShadow: '0 2px 6px rgba(0,0,0,0.14)',
      }}
    >
      {theme.label}
    </span>
  )
}

const FILTER_TABS: { key: 'all' | 'feedback' | 'notice'; label: string; dot?: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'feedback', label: '课堂反馈' },
  { key: 'notice', label: '通知' },
]

export function ParentNotificationsClient({
  notifications: initialNotifications,
  unreadCount: initialUnread,
  archived = false,
}: {
  notifications: ParentNotification[]
  unreadCount: number
  userId: string
  archived?: boolean
}) {
  const router = useRouter()
  const { mutate } = useSWRConfig()
  const isMobile = useIsMobile() ?? false
  const [notifications, setNotifications] = useState(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(initialUnread)
  const [filter, setFilter] = useState<'all' | 'feedback' | 'notice'>('all')
  const [visibleCount, setVisibleCount] = useState(20)

  useEffect(() => {
    setNotifications(initialNotifications)
    setUnreadCount(initialUnread)
    setVisibleCount(20)
  }, [initialNotifications, initialUnread])

  const filtered = useMemo(() => {
    if (filter === 'all') return notifications
    // 表现反馈也归到课堂反馈里，不单独显示
    if (filter === 'feedback') {
      return notifications.filter((n) => getNotificationMeta(n).category === 'feedback' || getNotificationMeta(n).category === 'growth')
    }
    return notifications.filter((n) => getNotificationMeta(n).category === filter)
  }, [notifications, filter])

  const filteredUnread = useMemo(() => filtered.filter((n) => !n.read).length, [filtered])

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch('/api/parent/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!response.ok) throw new Error('通知标记失败')
      const result = (await response.json()) as { unreadCount?: number }
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      if (!archived && typeof result.unreadCount === 'number') setUnreadCount(result.unreadCount)
      void mutate(isParentUnreadCountsCacheKey)
    } catch {
      toast.error('操作失败')
    }
  }

  const markAllRead = async () => {
    try {
      const response = await fetch(archived
        ? '/api/parent/notifications/mark-read'
        : '/api/parent/unread-counts/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        ...(archived ? { body: JSON.stringify({ all: true, archived: true }) } : {}),
      })
      if (!response.ok) throw new Error('全部已读操作失败')
      const result = (await response.json()) as { unreadCount?: number }
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      if (archived) {
        if (typeof result.unreadCount === 'number') setUnreadCount(result.unreadCount)
      } else {
        setUnreadCount(0)
      }
      void mutate(isParentUnreadCountsCacheKey)
      toast.success('已全部标记为已读')
    } catch {
      toast.error('操作失败')
    }
  }

  const markCategoryRead = async (category: 'feedback' | 'notice') => {
    const relatedTypes = CATEGORY_RELATED_TYPES[category]
    try {
      const response = await fetch('/api/parent/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relatedTypes, archived }),
      })
      if (!response.ok) throw new Error('分类已读操作失败')
      const result = (await response.json()) as { unreadCount?: number }
      const matchesCategory = (n: ParentNotification) => relatedTypes.includes(n.relatedType || n.type)
      setNotifications((prev) => prev.map((n) => (matchesCategory(n) ? { ...n, read: true } : n)))
      if (typeof result.unreadCount === 'number') setUnreadCount(result.unreadCount)
      void mutate(isParentUnreadCountsCacheKey)
      toast.success('已将该分类全部标记为已读')
    } catch {
      toast.error('操作失败')
    }
  }

  const handleClick = (n: ParentNotification) => {
    if (!n.read) markAsRead(n.id)
    const relatedType = (n.relatedType || n.type || '').toUpperCase()
    if (['EXAM_PAPER', 'PAPER_PUBLISHED'].includes(relatedType) && n.relatedId) {
      router.push(`/parent/archive/${encodeURIComponent(n.relatedId)}`)
      return
    }
    const targetHref = n.href || `/parent/notifications/${n.id}`
    if (!targetHref.startsWith('/parent/notifications/')) {
      router.push(targetHref)
      return
    }
    const transitionName = getArchiveEntryTransitionName(n.relatedType || n.type, n.relatedId || n.id, n.title, n.createdAt)
    const navigate = () => router.push(targetHref)
    let navigationStarted = false
    const transitioned = runDocumentViewTransition(async () => {
      navigationStarted = true
      navigate()
      let frames = 0
      while (frames < 120) {
        if (document.querySelector(`[data-notification-entry-transition-ready="${transitionName}"]`)) return
        frames += 1
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
      }
    })
    if (!transitioned && !navigationStarted) navigate()
  }

  return (
    <PullToRefresh onRefresh={async () => { router.refresh(); await new Promise((resolve) => setTimeout(resolve, 500)) }}>
      <div className="parent-notifications-page">
        {/* ===== 头部 Hero ===== */}
        <div
          className="stagger-item"
          style={{
            borderRadius: isMobile ? 20 : 24,
            padding: isMobile ? '20px 18px' : '28px 32px',
            background: 'linear-gradient(135deg, #16392A 0%, #1E4D3A 55%, #2E6B50 100%)',
            color: '#fff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(22, 57, 42, 0.28)',
            marginBottom: 14,
          }}
        >
          {/* 装饰圆 */}
          <div style={{ position: 'absolute', right: -40, top: -50, width: 170, height: 170, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 34, bottom: -58, width: 120, height: 120, borderRadius: '50%', background: 'rgba(217,179,106,0.12)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, position: 'relative' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <BellOutlined style={{ color: '#D9B36A', fontSize: 14 }} />
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, letterSpacing: 1.5, fontWeight: 600 }}>NOTIFICATIONS · 家长端</Text>
              </div>
              <div style={{ color: '#FFFFFF', margin: 0, fontSize: isMobile ? 24 : 28, fontWeight: 800, letterSpacing: 0.5, textShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                {archived ? '历史通知' : '最新通知'}
              </div>
            </div>
            {archived ? (
              <Button
                icon={<ArrowRightOutlined style={{ transform: 'rotate(180deg)' }} />}
                onClick={() => router.push('/parent/notifications')}
                style={{
                  borderRadius: 9999,
                  minHeight: 38,
                  paddingInline: 14,
                  background: 'rgba(217,179,106,0.2)',
                  border: '1px solid rgba(217,179,106,0.45)',
                  color: '#FCE7B8',
                  fontWeight: 700,
                  fontSize: 12.5,
                  flexShrink: 0,
                  backdropFilter: 'blur(8px)',
                }}
              >
                返回最新
              </Button>
            ) : unreadCount > 0 ? (
              <Button
                icon={<CheckOutlined style={{ fontSize: 12 }} />}
                onClick={markAllRead}
                style={{
                  borderRadius: 9999,
                  minHeight: 38,
                  paddingInline: 14,
                  background: 'rgba(217,179,106,0.2)',
                  border: '1px solid rgba(217,179,106,0.45)',
                  color: '#FCE7B8',
                  fontWeight: 700,
                  fontSize: 12.5,
                  flexShrink: 0,
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
              >
                全部已读
              </Button>
            ) : (
              <Button
                icon={<FileTextOutlined style={{ fontSize: 12 }} />}
                onClick={() => router.push('/parent/notifications?archived=1')}
                style={{
                  borderRadius: 9999,
                  minHeight: 38,
                  paddingInline: 14,
                  background: 'rgba(217,179,106,0.15)',
                  border: '1px solid rgba(217,179,106,0.35)',
                  color: '#FCE7B8',
                  fontWeight: 700,
                  fontSize: 12.5,
                  flexShrink: 0,
                  backdropFilter: 'blur(8px)',
                }}
              >
                历史通知
              </Button>
            )}
          </div>

          {/* 统计胶囊 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, position: 'relative', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 9999, padding: '4px 12px', backdropFilter: 'blur(4px)' }}>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11.5, fontWeight: 500 }}>
                共 {notifications.length} 条{archived ? '（已归档）' : ''}
              </Text>
            </div>
            {!archived && unreadCount > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #F3E3BC, #E9CD8F)', borderRadius: 9999, padding: '4px 12px', boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#B8862D' }} />
                <Text style={{ color: '#68450A', fontSize: 11.5, fontWeight: 700 }}>
                  <AnimatedNumber value={unreadCount} /> 条未读
                </Text>
              </div>
            )}
          </div>
        </div>

        {/* ===== 类型筛选 ===== */}
        {notifications.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 12, scrollbarWidth: 'none' }} className="notif-filter-bar">
            {FILTER_TABS.map((tab) => {
              const count = tab.key === 'all' ? notifications.length : notifications.filter((n) => getNotificationMeta(n).category === tab.key).length
              const active = filter === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => { setFilter(tab.key); setVisibleCount(20) }}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 9999,
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? '#ffffff' : '#5A4E3A',
                    background: active ? '#14574D' : '#ffffff',
                    border: active ? '1px solid #14574D' : '1px solid rgba(20,87,77,0.12)',
                    boxShadow: active ? '0 2px 8px rgba(20,87,77,0.2)' : '0 1px 3px rgba(0,0,0,0.02)',
                    transition: 'all .2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  }}
                >
                  {tab.label}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: 999,
                      background: active ? 'rgba(255,255,255,0.22)' : 'rgba(20,87,77,0.08)',
                      color: active ? '#ffffff' : '#14574D',
                    }}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* ===== 分类批量已读（非"全部"且有未读时） ===== */}
        {filter !== 'all' && !archived && filteredUnread > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => void markCategoryRead(filter === 'feedback' ? 'feedback' : 'notice')}
              style={{
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 9999,
                fontSize: 12.5,
                fontWeight: 600,
                color: '#7A5310',
                background: 'linear-gradient(135deg, #F3E3BC, #E9CD8F)',
                border: '1px solid rgba(217,179,106,0.4)',
                boxShadow: '0 2px 8px rgba(217,179,106,0.25)',
              }}
            >
              <CheckOutlined style={{ fontSize: 11 }} />
              将该分类 {filteredUnread} 条未读全部标为已读
            </button>
          </div>
        )}

        {/* ===== 列表 ===== */}
        {filtered.length === 0 ? (
          <div style={{ borderRadius: 20, minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.85)', border: '1px dashed #E2D8C8' }}>
            <BrandEmpty
              title={filter === 'all' ? '还没有通知' : '该分类下暂无通知'}
              hint="新的课堂反馈、晚托作业、试卷和系统提醒会显示在这里，方便你及时了解孩子的学习动态。"
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.slice(0, visibleCount).map((n) => {
              const meta = getNotificationMeta(n)
              const isFeedback = FEEDBACK_TYPES.has(n.relatedType || '') && !!n.teacherName
              const tier = resolveTier(n.teacherTier)
              const tierStyle = TIER_THEME_STYLE[tier]
              const actionText = ACTION_TEXT[n.relatedType || ''] || null
              const transitionName = getArchiveEntryTransitionName(n.relatedType || n.type, n.relatedId || n.id, n.title, n.createdAt)
              return (
                <div
                  key={n.id}
                  className="pressable"
                  role="button"
                  tabIndex={0}
                  aria-label={`${n.title || meta.label}，${n.read ? '已读' : '未读'}，打开通知详情`}
                  data-notification-entry-source={transitionName}
                  onClick={() => handleClick(n)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    handleClick(n)
                  }}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    gap: 14,
                    alignItems: 'flex-start',
                    background: '#FFFFFF',
                    borderRadius: 18,
                    padding: isMobile ? '16px 14px' : '18px 22px',
                    cursor: 'pointer',
                    boxShadow: n.read
                      ? '0 2px 10px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.02)'
                      : '0 6px 24px rgba(20, 87, 77, 0.08), 0 2px 6px rgba(201, 164, 92, 0.15)',
                    border: n.read
                      ? '1px solid rgba(0, 0, 0, 0.07)'
                      : '1.5px solid rgba(201, 164, 92, 0.65)',
                    overflow: 'hidden',
                    viewTransitionName: transitionName,
                    transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  } as React.CSSProperties}
                >
                  {/* 未读金色描边条 */}
                  {!n.read && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: 14,
                        bottom: 14,
                        width: 4,
                        borderRadius: '0 4px 4px 0',
                        background: 'linear-gradient(180deg, #E5C07B 0%, #C9A45C 100%)',
                        boxShadow: '0 0 8px rgba(201, 164, 92, 0.5)',
                      }}
                    />
                  )}

                  {/* 头像（老师真实照片 / 类型图标） */}
                  <NotificationAvatar n={n} isMobile={isMobile} />

                  {/* 正文 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isFeedback ? (
                      <>
                        {/* 老师名片行 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                          <Text strong style={{ fontSize: isMobile ? 15.5 : 16.5, color: '#17352F', letterSpacing: -0.2 }}>
                            {n.teacherName}老师
                          </Text>
                          <TeacherTierBadge tier={n.teacherTier} />
                        </div>

                        {/* 学科与互动标签 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                              fontSize: 11.5,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 999,
                              background: tierStyle.tagBg,
                              color: tierStyle.tagFg,
                              border: `1px solid ${tierStyle.tagBorder}`,
                            }}
                          >
                            {n.subject ? `${n.subject} · ` : ''}{meta.label}
                          </span>
                          {!n.read && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                fontSize: 10.5,
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: 999,
                                background: 'linear-gradient(135deg, #FDE68A, #F59E0B)',
                                color: '#78350F',
                              }}
                            >
                              未读
                            </span>
                          )}
                        </div>

                        {/* 引导文案 */}
                        {actionText && (
                          <Text style={{ display: 'block', fontSize: isMobile ? 14 : 14.5, color: '#263B34', marginTop: 10, fontWeight: 600 }}>
                            {actionText}
                          </Text>
                        )}

                        {/* 内容引用卡片（按照老师专属标签主题配色，告别死灰） */}
                        {n.content && (
                          <div
                            style={{
                              marginTop: 9,
                              padding: '10px 14px',
                              borderRadius: 12,
                              background: tierStyle.calloutBg,
                              borderLeft: `4px solid ${tierStyle.calloutBorder}`,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                            }}
                          >
                            <Paragraph
                              ellipsis={{ rows: isMobile ? 2 : 2 }}
                              style={{
                                fontSize: 13.5,
                                color: tierStyle.calloutText,
                                margin: 0,
                                lineHeight: 1.6,
                                fontWeight: 500,
                              }}
                            >
                              {n.content}
                            </Paragraph>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* 非反馈类通知（作业、课程调整、考勤等） */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <Text
                            strong
                            style={{
                              fontSize: isMobile ? 15 : 15.5,
                              color: '#17352F',
                              lineHeight: 1.45,
                              flex: 1,
                              minWidth: 0,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {n.title}
                          </Text>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, marginTop: 2 }}>
                            <span
                              style={{
                                borderRadius: 9999,
                                fontSize: 11,
                                lineHeight: 1,
                                padding: '3px 8px',
                                color: '#C2410C',
                                background: '#FFF4E5',
                                border: '1px solid rgba(232, 120, 74, 0.25)',
                                fontWeight: 700,
                              }}
                            >
                              {meta.label}
                            </span>
                            {!n.read && (
                              <span
                                style={{
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 999,
                                  background: 'linear-gradient(135deg, #FDE68A, #F59E0B)',
                                  color: '#78350F',
                                }}
                              >
                                未读
                              </span>
                            )}
                          </div>
                        </div>

                        {n.content && (
                          <div
                            style={{
                              marginTop: 9,
                              padding: '10px 14px',
                              borderRadius: 12,
                              background: '#FFF9F2',
                              borderLeft: '4px solid #E8784A',
                              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                            }}
                          >
                            <Paragraph
                              ellipsis={{ rows: isMobile ? 2 : 2 }}
                              style={{
                                fontSize: 13.5,
                                color: '#462312',
                                margin: 0,
                                lineHeight: 1.6,
                                fontWeight: 500,
                              }}
                            >
                              {n.content}
                            </Paragraph>
                          </div>
                        )}
                      </>
                    )}

                    {/* 底部：时间 + 查看详情 */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 10,
                        marginTop: 12,
                        borderTop: '1px solid rgba(20, 87, 77, 0.06)',
                        paddingTop: 10,
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#7A6E5D', fontWeight: 500 }}>
                        <ClockCircleOutlined style={{ fontSize: 11, color: '#A09482' }} />
                        {formatFriendlyTime(n.createdAt)}
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 9999,
                          padding: '5px 13px',
                          color: n.read ? (isFeedback ? tierStyle.tagFg : '#14574D') : '#FFFFFF',
                          background: n.read ? '#FAF8F5' : (isFeedback ? tierStyle.btnBg : 'linear-gradient(135deg, #14574D, #0E423A)'),
                          border: `1px solid ${n.read ? 'rgba(20, 87, 77, 0.18)' : 'transparent'}`,
                          boxShadow: n.read ? 'none' : '0 2px 8px rgba(20, 87, 77, 0.22)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        查看详情
                        <ArrowRightOutlined style={{ fontSize: 10 }} />
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
            {filtered.length > visibleCount && (
              <Button
                block
                onClick={() => setVisibleCount((count) => count + 20)}
                style={{ marginTop: 2, borderRadius: 12, minHeight: 44, borderColor: '#D8CDBB', color: '#14574D', fontWeight: 600 }}
              >
                加载更多（剩余 {filtered.length - visibleCount} 条）
              </Button>
            )}
          </div>
        )}
      </div>
    </PullToRefresh>
  )
}
