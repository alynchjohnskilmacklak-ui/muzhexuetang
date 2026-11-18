'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button, Typography } from 'antd'
import {
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
import { useIsMobile } from '@/hooks/useIsMobile'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { PullToRefresh } from '@/components/PullToRefresh'
import { resolveTier, TIER_THEME, type TeacherTier } from '@/constants/teacher-tier'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'

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
}

/** 反馈类通知的引导文案 */
const ACTION_TEXT: Record<string, string> = {
  CLASSROOM_FEEDBACK: '发布了课堂反馈，请您点击查看',
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

/** 反馈类通知类型 */
const FEEDBACK_TYPES = new Set(['CLASSROOM_FEEDBACK', 'PERFORMANCE_FEEDBACK', 'PERFORMANCE_UPDATE'])

/** 分类 → 相关类型集合（用于按分类批量已读） */
const CATEGORY_RELATED_TYPES: Record<'feedback' | 'notice', string[]> = {
  feedback: ['CLASSROOM_FEEDBACK', 'PERFORMANCE_FEEDBACK', 'PERFORMANCE_UPDATE'],
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

/** 通知头像：反馈类优先显示老师照片，其次学科徽标，最后类型图标 */
function NotificationAvatar({ n, isMobile }: { n: ParentNotification; isMobile: boolean }) {
  const meta = getNotificationMeta(n)
  const isFeedback = FEEDBACK_TYPES.has(n.relatedType || '')
  const subject = n.subject ? SUBJECT_META[n.subject] : undefined
  const size = isMobile ? 44 : 48

  // 老师照片
  if (isFeedback && n.teacherName) {
    const avatarSrc = getTeacherAvatarUrl(n.teacherAvatar, n.teacherGender, n.teacherName)
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 15,
          flexShrink: 0,
          overflow: 'hidden',
          position: 'relative',
          background: '#EDE6D8',
          boxShadow: n.read ? 'none' : `0 4px 10px rgba(30,77,58,0.16)`,
          border: n.read ? '1px solid #F0E9DD' : '2px solid rgba(201,164,92,0.55)',
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
  if (isFeedback && subject) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 15,
          flexShrink: 0,
          background: n.read ? subject.bg : subject.gradient,
          color: n.read ? subject.color : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: n.read ? 17 : 18,
          fontWeight: 700,
          boxShadow: n.read ? 'none' : `0 4px 10px ${subject.color}33`,
        }}
      >
        {subject.label}
      </div>
    )
  }

  // 类型图标
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 15,
        flexShrink: 0,
        background: n.read ? meta.bg : meta.gradient,
        color: n.read ? meta.color : '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        boxShadow: n.read ? 'none' : `0 4px 10px ${meta.color}33`,
      }}
    >
      {meta.icon}
    </div>
  )
}

/** 等级标签：深色主题底 + 主题色文字（与教师信息卡同款：ELITE=深墨绿底金字，突出醒目） */
const TIER_BADGE_THEME: Record<string, { bg: string; fg: string; border: string }> = {
  MANAGER: { bg: '#3C2F8C', fg: '#D9CDF7', border: '#7C6BC4' },
  ELITE: { bg: '#0E2E2A', fg: '#C9A45C', border: '#C9A45C' },
  SENIOR: { bg: '#123C35', fg: '#C9A45C', border: '#C9A45C' },
  EXPERIENCED: { bg: '#A84A22', fg: '#FFE8D9', border: '#E8784A' },
  NEW: { bg: '#1F5C44', fg: '#D9EFE3', border: '#3E8E6E' },
}

/** 老师等级标签：深底 + 主题色突出文字 */
function TeacherTierBadge({ tier, read }: { tier?: string | null; read: boolean }) {
  const resolved: TeacherTier = resolveTier(tier)
  const theme = TIER_THEME[resolved]
  const badge = TIER_BADGE_THEME[resolved]
  return (
    <span
      style={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        padding: '3px 9px',
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
        letterSpacing: 0.3,
        color: badge.fg,
        background: badge.bg,
        border: `1px solid ${badge.border}`,
        boxShadow: read ? 'none' : '0 2px 6px rgba(0,0,0,0.22)',
        opacity: read ? 0.55 : 1,
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

  useEffect(() => {
    setNotifications(initialNotifications)
    setUnreadCount(initialUnread)
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
      void mutate('/api/parent/unread-counts')
    } catch {
      toast.error('操作失败')
    }
  }

  const markAllRead = async () => {
    try {
      const response = await fetch('/api/parent/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      if (!response.ok) throw new Error('全部已读操作失败')
      const result = (await response.json()) as { unreadCount?: number }
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      if (typeof result.unreadCount === 'number') setUnreadCount(result.unreadCount)
      void mutate('/api/parent/unread-counts')
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
        body: JSON.stringify({ relatedTypes }),
      })
      if (!response.ok) throw new Error('分类已读操作失败')
      const result = (await response.json()) as { unreadCount?: number }
      const matchesCategory = (n: ParentNotification) => relatedTypes.includes(n.relatedType || n.type)
      setNotifications((prev) => prev.map((n) => (matchesCategory(n) ? { ...n, read: true } : n)))
      if (typeof result.unreadCount === 'number') setUnreadCount(result.unreadCount)
      void mutate('/api/parent/unread-counts')
      toast.success('已将该分类全部标记为已读')
    } catch {
      toast.error('操作失败')
    }
  }

  const handleClick = (n: ParentNotification) => {
    if (!n.read) markAsRead(n.id)
    if (n.relatedType === 'EXAM_PAPER' && n.relatedId) {
      router.push(`/parent/archive?paperId=${n.relatedId}`)
      return
    }
    router.push(n.href || `/parent/notifications/${n.id}`)
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
                <BellOutlined style={{ color: '#D9B36A', fontSize: 15 }} />
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, letterSpacing: 2 }}>NOTIFICATIONS · 家长端</Text>
              </div>
              <div style={{ color: '#F3D98F', margin: 0, fontSize: isMobile ? 26 : 30, fontWeight: 800, letterSpacing: 1.5, textShadow: '0 2px 8px rgba(0,0,0,0.25)' }}>
                {archived ? '历史通知' : '最新通知'}
              </div>
            </div>
            {archived ? (
              <Button
                icon={<ArrowRightOutlined style={{ transform: 'rotate(180deg)' }} />}
                onClick={() => router.push('/parent/notifications')}
                style={{
                  borderRadius: 9999,
                  minHeight: 34,
                  paddingInline: 14,
                  background: 'rgba(217,179,106,0.18)',
                  border: '1px solid rgba(217,179,106,0.45)',
                  color: '#F0D9A8',
                  fontWeight: 600,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                返回最新
              </Button>
            ) : unreadCount > 0 ? (
              <Button
                icon={<CheckOutlined />}
                onClick={markAllRead}
                style={{
                  borderRadius: 9999,
                  minHeight: 34,
                  paddingInline: 14,
                  background: 'rgba(217,179,106,0.18)',
                  border: '1px solid rgba(217,179,106,0.45)',
                  color: '#F0D9A8',
                  fontWeight: 600,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                全部已读
              </Button>
            ) : (
              <Button
                icon={<FileTextOutlined />}
                onClick={() => router.push('/parent/notifications?archived=1')}
                style={{
                  borderRadius: 9999,
                  minHeight: 34,
                  paddingInline: 14,
                  background: 'rgba(217,179,106,0.14)',
                  border: '1px solid rgba(217,179,106,0.35)',
                  color: '#F0D9A8',
                  fontWeight: 600,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                历史通知
              </Button>
            )}
          </div>

          {/* 统计胶囊 */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, position: 'relative', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 9999, padding: '6px 14px', backdropFilter: 'blur(4px)' }}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>共 {notifications.length} 条{archived ? '（已归档）' : ''}</Text>
            </div>
            {!archived && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: unreadCount > 0 ? '#D9B36A' : 'rgba(255,255,255,0.1)', borderRadius: 9999, padding: '6px 14px' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: unreadCount > 0 ? '#7A5310' : 'rgba(255,255,255,0.4)' }} />
                <Text style={{ color: unreadCount > 0 ? '#7A5310' : 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: unreadCount > 0 ? 700 : 500 }}>
                  {unreadCount} 条未读
                </Text>
              </div>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 9999, padding: '6px 12px' }}>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>按时间倒序</Text>
            </div>
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
                  onClick={() => setFilter(tab.key)}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 16px',
                    borderRadius: 9999,
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    color: active ? '#fff' : '#6B5D4F',
                    background: active ? 'linear-gradient(135deg, #1E4D3A, #2E6B50)' : 'rgba(255,255,255,0.8)',
                    border: active ? 'none' : '1px solid #EDE5DA',
                    boxShadow: active ? '0 4px 12px rgba(30,77,58,0.25)' : 'none',
                    transition: 'all .18s ease',
                  }}
                >
                  {tab.label}
                  <span style={{ fontSize: 11, opacity: 0.7 }}>{count}</span>
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
            {filtered.map((n, index: number) => {
              const meta = getNotificationMeta(n)
              const isFeedback = FEEDBACK_TYPES.has(n.relatedType || '') && !!n.teacherName
              const subjectMeta = n.subject ? SUBJECT_META[n.subject] : undefined
              const accent = isFeedback && subjectMeta ? subjectMeta.color : meta.color
              const actionText = ACTION_TEXT[n.relatedType || ''] || null
              return (
                <div
                  key={n.id}
                  className="stagger-item pressable"
                  onClick={() => handleClick(n)}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    background: n.read ? 'rgba(255,255,255,0.92)' : '#FFFDF8',
                    borderRadius: 18,
                    padding: isMobile ? '14px 14px 14px 16px' : '16px 20px 16px 22px',
                    cursor: 'pointer',
                    boxShadow: n.read ? '0 1px 0 rgba(0,0,0,0.02)' : '0 4px 16px rgba(30,77,58,0.08)',
                    border: n.read ? '1px solid #F0E9DD' : '1px solid rgba(217,179,106,0.35)',
                    animationDelay: `${Math.min(index, 8) * 40}ms`,
                    overflow: 'hidden',
                  }}
                >
                  {/* 未读金色描边条 */}
                  {!n.read && (
                    <div style={{ position: 'absolute', left: 0, top: 14, bottom: 14, width: 3.5, borderRadius: 9999, background: 'linear-gradient(180deg, #D9B36A, #B8862D)' }} />
                  )}

                  {/* 头像（学科徽标 / 类型图标） */}
                  <NotificationAvatar n={n} isMobile={isMobile} />

                  {/* 正文 */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isFeedback ? (
                      <>
                        {/* 老师名片行 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text strong style={{ fontSize: isMobile ? 15 : 16, color: n.read ? '#111111' : '#000000' }}>
                            {n.teacherName}老师
                          </Text>
                          <TeacherTierBadge tier={n.teacherTier} read={n.read} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                          {subjectMeta && (
                            <span style={{ fontSize: 12, color: subjectMeta.color, fontWeight: 700 }}>
                              {n.subject}
                            </span>
                          )}
                          <span style={{ fontSize: 12, color: '#4B5563', fontWeight: 500 }}>{meta.label}</span>
                          {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D9B36A', marginLeft: 2 }} />}
                        </div>

                        {/* 引导文案 */}
                        {actionText && (
                          <Text style={{ display: 'block', fontSize: isMobile ? 14 : 15, color: n.read ? '#1F2937' : '#111827', marginTop: 10, fontWeight: n.read ? 600 : 600 }}>
                            {actionText}
                          </Text>
                        )}

                        {/* 内容引用 */}
                        {n.content && (
                          <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: `3px solid ${accent}${n.read ? '88' : 'AA'}` }}>
                            <Paragraph
                              ellipsis={{ rows: isMobile ? 2 : 2 }}
                              style={{ fontSize: 13.5, color: '#374151', margin: 0, lineHeight: 1.6, fontWeight: 500 }}
                            >
                              {n.content}
                            </Paragraph>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Text
                            strong
                            style={{
                              fontSize: isMobile ? 15 : 16,
                              color: n.read ? '#111111' : '#000000',
                              flex: '1 1 auto',
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {n.title}
                          </Text>
                          <span
                            style={{
                              flexShrink: 0,
                              borderRadius: 9999,
                              fontSize: 10,
                              lineHeight: 1,
                              padding: '4px 8px',
                              color: meta.color,
                              background: meta.bg,
                              fontWeight: 600,
                            }}
                          >
                            {meta.label}
                          </span>
                          {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D9B36A', flexShrink: 0 }} />}
                        </div>

                        {n.content && (
                          <Paragraph
                            ellipsis={{ rows: isMobile ? 2 : 2 }}
                            style={{ fontSize: 13.5, color: '#374151', margin: '8px 0 0', lineHeight: 1.6, fontWeight: 500 }}
                          >
                            {n.content}
                          </Paragraph>
                        )}
                      </>
                    )}

                    {/* 底部：时间 + 查看详情 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: isFeedback ? 10 : 8, borderTop: '1px solid #F3EDE3', paddingTop: 9 }}>
                      <Text style={{ fontSize: 12, color: '#4B5563', fontWeight: 500 }}>
                        {formatFriendlyTime(n.createdAt)}
                      </Text>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 9999,
                          padding: '5px 11px',
                          color: n.read ? '#8A7C6C' : '#7A5310',
                          background: n.read ? '#F5F1EA' : 'linear-gradient(135deg, #F3E3BC, #E9CD8F)',
                          border: `1px solid ${n.read ? 'transparent' : 'rgba(217,179,106,0.4)'}`,
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
          </div>
        )}
      </div>
    </PullToRefresh>
  )
}
