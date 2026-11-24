'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AccountBookOutlined,
  BankOutlined,
  BellOutlined,
  BookOutlined,
  BranchesOutlined,
  BulbOutlined,
  CalculatorOutlined,
  CalendarOutlined,
  CarryOutOutlined,
  CheckCircleOutlined,
  CrownFilled,
  ExperimentOutlined,
  FileTextOutlined,
  GlobalOutlined,
  HeartOutlined,
  AimOutlined,
  BarChartOutlined,
  CompassOutlined,
  CrownOutlined,
  GiftOutlined,
  MessageOutlined,
  PhoneOutlined,
  PrinterOutlined,
  ReadOutlined,
  RightOutlined,
  SafetyCertificateOutlined,
  StarOutlined,
  ThunderboltOutlined,
  TranslationOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { Tag, Typography } from 'antd'
import { format } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { toast } from 'sonner'
import { fillName, MEMBERSHIP_BENEFITS, MEMBERSHIP_HERO_THEME, MEMBERSHIP_THEME, MEMBERSHIP_UPGRADE, MEMBERSHIP_WELCOME, resolveMembership } from '@/constants/membership'
import { rememberParentChild, rememberParentChildGender } from '@/lib/parent-child-preference'
import { resolveParentChildId } from '@/lib/parent-child-selection'
import { getDailyQuote } from '@/data/daily-quotes'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'
import { MessageWorkflowNotice } from '@/components/MessageWorkflowNotice'
import { WeatherHeroStrip } from '@/components/Common/WeatherHeroStrip'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'
import { getTeacherAvatarUrl, DEFAULT_TEACHER_AVATAR } from '@/lib/teacher-avatars'
import { parseStoredKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { ParentTodayPanel } from '@/components/Parent/ParentTodayPanel'
import { WeeklyReport } from '@/components/Parent/WeeklyReport'
import { ParentLessonPreview } from '@/components/Parent/ParentLessonPreview'
import { StudentAvatar } from '@/components/Common/StudentAvatar'
import { AnimatedNumber } from '@/components/Common/AnimatedNumber'
import { PullToRefresh } from '@/components/PullToRefresh'
import type { getParentDashboardData } from '@/lib/parent-dashboard'

const { Text } = Typography
const fetcher = ([url]: readonly [string, string]) => fetch(url).then((response) => {
  if (!response.ok) throw new Error('未读数据加载失败')
  return response.json()
})

type JsonValue<T> = T extends Date
  ? string
  : T extends readonly (infer Item)[]
    ? JsonValue<Item>[]
    : T extends object
      ? { [Key in keyof T]: JsonValue<T[Key]> }
      : T
type DashboardData = JsonValue<Awaited<ReturnType<typeof getParentDashboardData>>>
type DashboardProps = DashboardData & { initialActiveChildId?: string }
type DashboardNotification = DashboardProps['notifications'][number]

type SubjectVisualMeta = {
  label: string
  icon: React.ReactNode
  color: string
  bg: string
  border: string
}

function resolveSubjectMeta(subject?: string | null, teacherName?: string | null, content?: string | null): SubjectVisualMeta {
  const norm = (subject || '').trim()
  if (norm.includes('数') || content?.includes('圆的概念') || content?.includes('几何') || content?.includes('函数') || content?.includes('方程')) {
    return {
      label: '数学',
      icon: <CalculatorOutlined />,
      color: '#1A538C',
      bg: 'linear-gradient(135deg, #E6F1FB 0%, #D5E7FA 100%)',
      border: '1px solid rgba(26, 83, 140, 0.22)',
    }
  }
  if (norm.includes('语') || content?.includes('文言') || content?.includes('作文') || content?.includes('现代文')) {
    return {
      label: '语文',
      icon: <ReadOutlined />,
      color: '#993C1D',
      bg: 'linear-gradient(135deg, #FAECE7 0%, #F6DDD5 100%)',
      border: '1px solid rgba(153, 60, 29, 0.22)',
    }
  }
  if (norm.includes('英') || content?.includes('单词') || content?.includes('词汇') || content?.includes('语法') || content?.includes('阅读理解')) {
    return {
      label: '英语',
      icon: <TranslationOutlined />,
      color: '#8A5A14',
      bg: 'linear-gradient(135deg, #FCF5EC 0%, #F5E6CE 100%)',
      border: '1px solid rgba(138, 90, 20, 0.22)',
    }
  }
  if (norm.includes('物') || content?.includes('电路') || content?.includes('浮力') || content?.includes('力学')) {
    return {
      label: '物理',
      icon: <ThunderboltOutlined />,
      color: '#3C3489',
      bg: 'linear-gradient(135deg, #EEEDFE 0%, #DFDCFC 100%)',
      border: '1px solid rgba(60, 52, 137, 0.22)',
    }
  }
  if (norm.includes('化') || content?.includes('化学') || content?.includes('分子') || content?.includes('反应')) {
    return {
      label: '化学',
      icon: <ExperimentOutlined />,
      color: '#085041',
      bg: 'linear-gradient(135deg, #E1F5EE 0%, #CEEEDF 100%)',
      border: '1px solid rgba(8, 80, 65, 0.22)',
    }
  }
  if (norm.includes('生') || content?.includes('生物') || content?.includes('细胞') || content?.includes('光合')) {
    return {
      label: '生物',
      icon: <BranchesOutlined />,
      color: '#27500A',
      bg: 'linear-gradient(135deg, #EAF3DE 0%, #D8EAC2 100%)',
      border: '1px solid rgba(39, 80, 10, 0.22)',
    }
  }
  if (norm.includes('历')) {
    return {
      label: '历史',
      icon: <BankOutlined />,
      color: '#8C5528',
      bg: 'linear-gradient(135deg, #FCEBEB 0%, #F7D7D7 100%)',
      border: '1px solid rgba(140, 85, 40, 0.22)',
    }
  }
  if (norm.includes('地')) {
    return {
      label: '地理',
      icon: <GlobalOutlined />,
      color: '#0C447C',
      bg: 'linear-gradient(135deg, #E6F1FB 0%, #CFE4FA 100%)',
      border: '1px solid rgba(12, 68, 124, 0.22)',
    }
  }
  if (norm.includes('道') || norm.includes('法') || norm.includes('政')) {
    return {
      label: '道法',
      icon: <SafetyCertificateOutlined />,
      color: '#444441',
      bg: 'linear-gradient(135deg, #F1EFE8 0%, #E3E0D4 100%)',
      border: '1px solid rgba(68, 68, 65, 0.22)',
    }
  }
  return {
    label: norm || '综合',
    icon: <BookOutlined />,
    color: '#14574D',
    bg: 'linear-gradient(135deg, #EAF5F0 0%, #D4EFE3 100%)',
    border: '1px solid rgba(20, 87, 77, 0.22)',
  }
}

type FeedbackTypeMeta = {
  key: 'feedback' | 'question' | 'notice' | 'performance'
  label: string
  icon: React.ReactNode
  color: string
  bg: string
  border: string
  actionLabel: string
}

function resolveFeedbackTypeMeta(type?: string | null, content?: string | null): FeedbackTypeMeta {
  const norm = (type || '').trim()
  const text = (content || '').trim()

  if (norm.includes('提问') || text.includes('提问') || text.includes('随堂互动')) {
    return {
      key: 'question',
      label: '随堂提问',
      icon: <AimOutlined style={{ fontSize: 11 }} />,
      color: '#1A538C',
      bg: 'rgba(26, 83, 140, 0.09)',
      border: '1px solid rgba(26, 83, 140, 0.22)',
      actionLabel: '查看提问详情',
    }
  }

  if (norm.includes('通知') || norm.includes('公告') || text.includes('通知')) {
    return {
      key: 'notice',
      label: '老师通知',
      icon: <BellOutlined style={{ fontSize: 11 }} />,
      color: '#8A6517',
      bg: 'rgba(138, 101, 23, 0.11)',
      border: '1px solid rgba(138, 101, 23, 0.24)',
      actionLabel: '查看通知详情',
    }
  }

  if (norm.includes('在校表现') || norm.includes('表现') || text.includes('表扬')) {
    return {
      key: 'performance',
      label: '在校表现',
      icon: <StarOutlined style={{ fontSize: 11 }} />,
      color: '#C45724',
      bg: 'rgba(196, 87, 36, 0.1)',
      border: '1px solid rgba(196, 87, 36, 0.22)',
      actionLabel: '查看表现详情',
    }
  }

  // 默认：课堂反馈
  return {
    key: 'feedback',
    label: '课堂反馈',
    icon: <BookOutlined style={{ fontSize: 11 }} />,
    color: '#14574D',
    bg: 'rgba(20, 87, 77, 0.08)',
    border: '1px solid rgba(20, 87, 77, 0.2)',
    actionLabel: '查看完整学情',
  }
}

type NotificationVisualMeta = {
  icon: React.ReactNode
  color: string
  bg: string
  border: string
}

function resolveNotificationMeta(notification: {
  title: string
  type: string
  relatedType?: string | null
}): NotificationVisualMeta {
  const rel = (notification.relatedType || '').toUpperCase()
  const typ = (notification.type || '').toUpperCase()
  const title = notification.title || ''

  // 1. 作业通知（新作业 / 提交 / 批改）
  if (rel === 'HOMEWORK' || typ === 'HOMEWORK' || title.includes('作业')) {
    return {
      icon: <CarryOutOutlined />,
      color: '#C45724',
      bg: 'linear-gradient(135deg, #FFF3EC 0%, #FFE2D1 100%)',
      border: '1px solid rgba(196, 87, 36, 0.24)',
    }
  }

  // 2. 随堂提问 / 课堂互动点评通知
  if (
    rel === 'CLASSROOM_PICK' ||
    typ === 'CLASSROOM_PICK' ||
    title.includes('提问') ||
    title.includes('随堂互动')
  ) {
    return {
      icon: <AimOutlined />,
      color: '#14574D',
      bg: 'linear-gradient(135deg, #EAF5F0 0%, #D4EFE3 100%)',
      border: '1px solid rgba(20, 87, 77, 0.22)',
    }
  }

  // 3. 课程变动 / 课程安排更新
  if (
    title.includes('课程安排') ||
    title.includes('排课') ||
    title.includes('课表') ||
    rel === 'SCHEDULE_CHANGE' ||
    typ === 'SCHEDULE_CHANGE'
  ) {
    return {
      icon: <CalendarOutlined />,
      color: '#1A538C',
      bg: 'linear-gradient(135deg, #EBF4FC 0%, #D5E7FA 100%)',
      border: '1px solid rgba(26, 83, 140, 0.22)',
    }
  }

  // 4. 课堂反馈通知
  if (rel === 'CLASSROOM_FEEDBACK' || typ === 'CLASSROOM_FEEDBACK' || title.includes('课堂反馈') || title.includes('学情反馈')) {
    return {
      icon: <BookOutlined />,
      color: '#14574D',
      bg: 'linear-gradient(135deg, #EAF5F0 0%, #D4EFE3 100%)',
      border: '1px solid rgba(20, 87, 77, 0.22)',
    }
  }

  // 3. 老师回复 / 家校沟通
  if (
    rel === 'PARENT_MESSAGE' ||
    rel === 'PARENT_MESSAGE_REPLY' ||
    typ === 'PARENT_MESSAGE' ||
    typ === 'PARENT_MESSAGE_REPLY' ||
    title.includes('回复') ||
    title.includes('消息')
  ) {
    return {
      icon: <MessageOutlined />,
      color: '#8A6517',
      bg: 'linear-gradient(135deg, #FCF5EC 0%, #F5E6CE 100%)',
      border: '1px solid rgba(138, 101, 23, 0.24)',
    }
  }

  // 4. 试卷 / 测评
  if (
    rel === 'EXAM_PAPER' ||
    rel === 'PAPER_PUBLISHED' ||
    typ === 'EXAM_PAPER' ||
    title.includes('试卷') ||
    title.includes('测评') ||
    title.includes('成长档案')
  ) {
    return {
      icon: <FileTextOutlined />,
      color: '#185FA5',
      bg: 'linear-gradient(135deg, #EBF3FC 0%, #D5E7FA 100%)',
      border: '1px solid rgba(24, 95, 165, 0.22)',
    }
  }

  // 5. 表现反馈 / 老师点赞
  if (rel === 'PERFORMANCE_FEEDBACK' || typ === 'PERFORMANCE_FEEDBACK' || title.includes('表扬') || title.includes('积分')) {
    return {
      icon: <StarOutlined />,
      color: '#C97D18',
      bg: 'linear-gradient(135deg, #FFF8EB 0%, #FFE8BF 100%)',
      border: '1px solid rgba(201, 125, 24, 0.24)',
    }
  }

  // 6. 考勤 / 请假 / 调课
  if (title.includes('考勤') || title.includes('请假') || title.includes('调课') || title.includes('课次')) {
    return {
      icon: <CalendarOutlined />,
      color: '#2E7D32',
      bg: 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)',
      border: '1px solid rgba(46, 125, 50, 0.22)',
    }
  }

  // 7. 缴费 / 账单
  if (title.includes('缴费') || title.includes('账单') || title.includes('续费')) {
    return {
      icon: <AccountBookOutlined />,
      color: '#6A1B9A',
      bg: 'linear-gradient(135deg, #F3E5F5 0%, #E1BEE7 100%)',
      border: '1px solid rgba(106, 27, 154, 0.22)',
    }
  }

  // 8. 默认系统提醒
  return {
    icon: <BellOutlined />,
    color: '#6B5B45',
    bg: 'linear-gradient(135deg, #F4EFE6 0%, #E8DFD0 100%)',
    border: '1px solid rgba(107, 91, 69, 0.2)',
  }
}

function resolveBenefitVisual(title: string, rawIcon: string) {
  if (title.includes('问题优先') || title.includes('优先跟进') || rawIcon === '👑') {
    return {
      icon: <CrownOutlined />,
      color: '#FFFFFF',
      bg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      shadow: '0 3px 8px rgba(217, 119, 6, 0.35)',
    }
  }
  if (title.includes('试卷分析') || rawIcon === '📊' || rawIcon === '📄') {
    return {
      icon: <BarChartOutlined />,
      color: '#FFFFFF',
      bg: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
      shadow: '0 3px 8px rgba(37, 99, 235, 0.35)',
    }
  }
  if (title.includes('建议') || title.includes('个性化') || rawIcon === '🧭') {
    return {
      icon: <CompassOutlined />,
      color: '#FFFFFF',
      bg: 'linear-gradient(135deg, #10B981 0%, #047857 100%)',
      shadow: '0 3px 8px rgba(5, 150, 105, 0.35)',
    }
  }
  if (title.includes('志愿填报') || rawIcon === '🎯') {
    return {
      icon: <AimOutlined />,
      color: '#FFFFFF',
      bg: 'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
      shadow: '0 3px 8px rgba(236, 72, 153, 0.35)',
    }
  }
  if (title.includes('提醒') || title.includes('节点') || rawIcon === '🔔') {
    return {
      icon: <BellOutlined />,
      color: '#FFFFFF',
      bg: 'linear-gradient(135deg, #EAB308 0%, #B45309 100%)',
      shadow: '0 3px 8px rgba(234, 179, 8, 0.35)',
    }
  }
  if (title.includes('打印') || rawIcon === '🖨️') {
    return {
      icon: <PrinterOutlined />,
      color: '#FFFFFF',
      bg: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)',
      shadow: '0 3px 8px rgba(99, 102, 241, 0.35)',
    }
  }
  if (title.includes('辅导') || rawIcon === '🎁') {
    return {
      icon: <GiftOutlined />,
      color: '#FFFFFF',
      bg: 'linear-gradient(135deg, #F97316 0%, #C2410C 100%)',
      shadow: '0 3px 8px rgba(249, 115, 22, 0.35)',
    }
  }
  if (title.includes('电话') || title.includes('热线') || rawIcon === '☎️') {
    return {
      icon: <PhoneOutlined />,
      color: '#FFFFFF',
      bg: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
      shadow: '0 3px 8px rgba(6, 182, 212, 0.35)',
    }
  }
  if (title.includes('优先') || rawIcon === '⚡') {
    return {
      icon: <ThunderboltOutlined />,
      color: '#FFFFFF',
      bg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      shadow: '0 3px 8px rgba(217, 119, 6, 0.35)',
    }
  }
  if (title.includes('重点关注') || rawIcon === '🔍') {
    return {
      icon: <TrophyOutlined />,
      color: '#FFFFFF',
      bg: 'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
      shadow: '0 3px 8px rgba(139, 92, 246, 0.35)',
    }
  }
  return {
    icon: <FileTextOutlined />,
    color: '#FFFFFF',
    bg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    shadow: '0 3px 8px rgba(5, 150, 105, 0.35)',
  }
}


function formatNotificationNaturalTime(dateStr: string) {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const isToday = now.toDateString() === date.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const isYesterday = yesterday.toDateString() === date.toDateString()

    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')

    if (isToday) {
      return `今天 ${hours}:${minutes}`
    }
    if (isYesterday) {
      return `昨天 ${hours}:${minutes}`
    }
    const month = date.getMonth() + 1
    const day = date.getDate()
    if (now.getFullYear() === date.getFullYear()) {
      return `${month}月${day}日 ${hours}:${minutes}`
    }
    return `${date.getFullYear()}/${month}/${day}`
  } catch {
    return dateStr
  }
}

function todayKey() {
  return format(new Date(), 'yyyy-MM-dd')
}

function hasShownToday(key: string) {
  try {
    if (window.localStorage.getItem(key)) return true
    window.localStorage.setItem(key, '1')
    return false
  } catch {
    return false
  }
}

function lessonStatus(lesson: { startTimeRaw?: string | null; endTimeRaw?: string | null; attendanceSubmittedAt?: string | null }) {
  if (lesson.attendanceSubmittedAt) return '已结束'
  if (!lesson.startTimeRaw || !lesson.endTimeRaw) return '待老师确认'
  const now = Date.now()
  const start = new Date(lesson.startTimeRaw).getTime()
  const end = new Date(lesson.endTimeRaw).getTime()
  if (now < start) return '待上课'
  if (now <= end) return '上课中'
  return '待老师确认'
}

function humanizeParentNoticeTitle(title: string): string {
  if (!title) return ''
  // 优化机械的课堂提问文案："胡思同在课堂上提问了马紫晨" -> "胡思同老师随堂提问了马紫晨"
  const pickMatch = title.match(/^(.+?)在课堂上提问了(.+)$/)
  if (pickMatch) {
    const [, teacher, student] = pickMatch
    const t = teacher.endsWith('老师') ? teacher : `${teacher}老师`
    return `${t}随堂提问了${student}`
  }
  return title
}

export function ParentDashboardClient({
  parentUserId,
  students,
  initialActiveChildId,
  studentTopTeacher,
  todayClassLessons,
  nextUpcomingLessons = [],
  notifications,
  latestPost,
  latestClassroomFeedback,
  latestFeedbackByStudent = {},
  attendanceRate,
  studentStats = {},
  todayAttendances = [],
  todayFeedbacks = [],
  lessonPreviews = [],
}: DashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dailyQuote = getDailyQuote()
  const childIdFromUrl = searchParams.get('childId') || ''
  const [activeChildId, setActiveChildId] = useState(() =>
    resolveParentChildId(students, [childIdFromUrl, initialActiveChildId]),
  )
  const [welcomeMounted, setWelcomeMounted] = useState(false)
  const [welcomeVisible, setWelcomeVisible] = useState(false)
  const welcomeTriggeredRef = useRef(false)
  const [weeklyReady, setWeeklyReady] = useState(false)
  const weeklyReportAnchorRef = useRef<HTMLDivElement | null>(null)
  const [locallyReadNotificationIds, setLocallyReadNotificationIds] = useState<Set<string>>(() => new Set())
  const unreadKey = parentUserId ? ['/api/parent/unread-counts', parentUserId] as const : null
  const { data: unreadData, error: unreadError, mutate: mutateUnread } = useSWR(unreadKey, fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })

  useEffect(() => {
    const anchor = weeklyReportAnchorRef.current
    if (!anchor) return
    if (typeof IntersectionObserver === 'undefined') {
      const timer = window.setTimeout(() => setWeeklyReady(true), 1_400)
      return () => window.clearTimeout(timer)
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setWeeklyReady(true)
        observer.disconnect()
      }
    }, { rootMargin: '280px 0px' })
    observer.observe(anchor)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const resolvedId = resolveParentChildId(students, [childIdFromUrl, initialActiveChildId, activeChildId])
    if (resolvedId && resolvedId !== activeChildId) setActiveChildId(resolvedId)
  }, [activeChildId, childIdFromUrl, initialActiveChildId, students])

  const activeStudent = useMemo(
    () => students.find(student => student.id === activeChildId) || students[0],
    [activeChildId, students],
  )
  const membershipLevel = resolveMembership(activeStudent?.membershipLevel)
  const heroTheme = MEMBERSHIP_HERO_THEME[membershipLevel]

  useEffect(() => {
    if (!activeStudent?.id || welcomeTriggeredRef.current) return
    welcomeTriggeredRef.current = true
    const storageKey = `mz_welcome_${parentUserId || activeStudent.id}_${todayKey()}`
    if (hasShownToday(storageKey)) return
    setWelcomeMounted(true)
    const showTimer = window.setTimeout(() => setWelcomeVisible(true), 30)
    const fadeTimer = window.setTimeout(() => setWelcomeVisible(false), 1_800)
    const unmountTimer = window.setTimeout(() => setWelcomeMounted(false), 2_200)
    return () => {
      window.clearTimeout(showTimer)
      window.clearTimeout(fadeTimer)
      window.clearTimeout(unmountTimer)
    }
  }, [activeStudent?.id, parentUserId])

  const topTeacher = activeStudent?.id ? studentTopTeacher?.[activeStudent.id] : null
  const topTier = topTeacher?.tierLevel ? resolveTier(topTeacher.tierLevel) : null
  const topTierLabel = topTier ? TIER_THEME[topTier].label : ''
  const activeStats = activeChildId ? studentStats[activeChildId] : null
  const activeAttendanceRate = activeStats?.attendanceRate ?? attendanceRate

  const rawTodayLessons = todayClassLessons.map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      startTime: lesson.startTime || '',
      endTime: lesson.endTime || '',
      teacherName: lesson.teacherName,
      roomName: lesson.roomName,
      studentIds: lesson.studentIds || [],
      startTimeRaw: lesson.startTimeRaw,
      endTimeRaw: lesson.endTimeRaw,
      attendanceSubmittedAt: lesson.attendanceSubmittedAt,
    })).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const todayLessons = rawTodayLessons.filter(lesson => students.length <= 1 || !activeChildId || lesson.studentIds.includes(activeChildId))
  // 今天无课时的"下一次课程"：从未来课程中取当前孩子的最近一节
  const activeNextLessons = students.length <= 1 || !activeChildId
    ? nextUpcomingLessons
    : nextUpcomingLessons.filter(lesson => lesson.studentIds.includes(activeChildId))
  const activeNotifications = students.length <= 1 || !activeChildId
    ? notifications
    : notifications.filter(notification => !notification.studentId || notification.studentId === activeChildId)
  const activeTodayFeedbacks = students.length <= 1 || !activeChildId
    ? todayFeedbacks
    : todayFeedbacks.filter(feedback => feedback.studentIds?.includes(activeChildId))
  const visibleUnreadCount = activeNotifications.filter(notification =>
    !notification.read && !locallyReadNotificationIds.has(notification.id),
  ).length
  const unreadCount = Number(unreadData?.notifications ?? visibleUnreadCount)
  // 使用服务端去重后的总数，通知记录与对应的试卷/表现/反馈不重复计数。
  const serverTotalUnread = Number(unreadData?.total)
  const totalUnread = Number.isFinite(serverTotalUnread) && serverTotalUnread >= 0 ? serverTotalUnread : unreadCount
  const activeLesson = todayLessons.find(lesson => lessonStatus(lesson) === '上课中')
  const pendingLesson = todayLessons.find(lesson => lessonStatus(lesson) === '待老师确认')
  const nextLesson = todayLessons.find(lesson => lessonStatus(lesson) === '待上课')
  const todayStatus = !todayLessons.length ? '今日暂无课程' : activeLesson ? '上课中' : pendingLesson ? '待老师确认' : nextLesson ? '待上课' : '今日课程已完成'

  // 课程展示逻辑：
  // 1. 今天有课 → 显示今天的全天课程列表
  // 2. 今天没课 → 找到最近的一个有课日期，显示那一天的全天课程列表
  // 3. 都没有 → 空状态
  let displayLessons: typeof todayLessons = todayLessons
  let displayLessonDate: string | null = null

  if (todayLessons.length === 0 && activeNextLessons.length > 0) {
    // 找到最近的一个有课日期
    const nextDate = activeNextLessons[0].lessonDate
    if (nextDate) {
      // 筛选出那一天的所有课程
      const sameDayLessons = activeNextLessons.filter(l => l.lessonDate === nextDate)
      displayLessonDate = nextDate
      // 结合日期和时间构造完整时间戳，用于状态判断
      displayLessons = sameDayLessons.map(l => {
        const dateBase = l.lessonDate ? new Date(l.lessonDate) : null
        const [sh, sm] = (l.startTime || '00:00').split(':').map(Number)
        const [eh, em] = (l.endTime || '00:00').split(':').map(Number)
        const startRaw = dateBase ? new Date(dateBase.getFullYear(), dateBase.getMonth(), dateBase.getDate(), sh || 0, sm || 0).toISOString() : null
        const endRaw = dateBase ? new Date(dateBase.getFullYear(), dateBase.getMonth(), dateBase.getDate(), eh || 0, em || 0).toISOString() : null
        return {
          id: l.id,
          title: l.title,
          startTime: l.startTime || '',
          endTime: l.endTime || '',
          teacherName: l.teacherName,
          roomName: l.roomName,
          studentIds: l.studentIds || [],
          startTimeRaw: startRaw,
          endTimeRaw: endRaw,
          attendanceSubmittedAt: null,
          lessonDate: l.lessonDate,
        }
      })
    }
  }
  const activeTodayAttendances = students.length <= 1 || !activeChildId
    ? todayAttendances
    : todayAttendances.filter(attendance => attendance.studentId === activeChildId)
  const latestTimes = [latestPost?.createdAt, latestClassroomFeedback?.createdAt, activeNotifications[0]?.createdAt, ...activeTodayAttendances.map(item => item.createdAt)]
    .filter((value): value is string => Boolean(value)).map(value => new Date(value).getTime())
  const latestUpdate = latestTimes.length ? new Date(Math.max(...latestTimes)).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '暂无更新'

  const activeLatestPost = students.length <= 1 || !activeChildId || latestPost?.studentId === activeChildId ? latestPost : null
  // 课堂反馈按当前孩子取"最近一条有效反馈"（服务端已按孩子分组，切换孩子不再变空）
  const activeLatestClassroomFeedback = students.length <= 1 || !activeChildId
    ? (latestFeedbackByStudent[students[0]?.id || ''] || null)
    : (latestFeedbackByStudent[activeChildId] || null)
  const seenIds = new Set<string>()
  if (activeLatestPost) seenIds.add(activeLatestPost.id)
  const feedbackItems: Array<{
    type: string
    teacherName: string
    teacherAvatar?: string | null
    teacherGender?: string | null
    studentName: string
    content: string
    date: Date
    lessonDate?: string | null
    subject?: string | null
    topic?: string | null
    tags?: string[]
    id: string
  }> = []
  if (activeLatestPost) {
    feedbackItems.push({
      type: '在校表现',
      teacherName: activeLatestPost.teacher?.name || '老师',
      teacherAvatar: (activeLatestPost.teacher as { avatar?: string | null })?.avatar || null,
      teacherGender: (activeLatestPost.teacher as { gender?: string | null })?.gender || null,
      studentName: activeLatestPost.student?.name || '',
      content: activeLatestPost.content,
      date: new Date(activeLatestPost.createdAt),
      id: activeLatestPost.id,
    })
  }
  if (activeLatestClassroomFeedback && !seenIds.has(activeLatestClassroomFeedback.id)) {
    seenIds.add(activeLatestClassroomFeedback.id)
    const topic = (activeLatestClassroomFeedback as { topic?: string | null }).topic || null
    const tags = (activeLatestClassroomFeedback as { tags?: string[] }).tags || []
    feedbackItems.push({
      type: '课堂成长反馈',
      teacherName: activeLatestClassroomFeedback.teacherName || '老师',
      teacherAvatar: (activeLatestClassroomFeedback as { teacherAvatar?: string | null }).teacherAvatar || null,
      teacherGender: (activeLatestClassroomFeedback as { teacherGender?: string | null }).teacherGender || null,
      studentName: activeStudent?.name || '',
      content: activeLatestClassroomFeedback.summary || (topic ? `本节课围绕「${topic}」开展教学与针对练习，点击查看学情详情。` : '已更新本节课学情反馈，点击查看详细评语与作业安排。'),
      date: new Date(activeLatestClassroomFeedback.createdAt),
      lessonDate: activeLatestClassroomFeedback.lessonDate || null,
      subject: activeLatestClassroomFeedback.subject || null,
      topic,
      tags,
      id: activeLatestClassroomFeedback.id,
    })
  }
  activeTodayFeedbacks.forEach(feedback => {
    if (seenIds.has(feedback.id)) return
    seenIds.add(feedback.id)
    const fbTopic = feedback.topic || null
    feedbackItems.push({
      type: '课堂成长反馈',
      teacherName: feedback.teacherName || '老师',
      studentName: activeStudent?.name || '',
      content: feedback.summary || (fbTopic ? `本节课围绕「${fbTopic}」展开学习与练习，点击查看学情详情。` : '已更新本节课学情反馈，点击查看详细评语与作业安排。'),
      date: new Date(feedback.createdAt),
      subject: (feedback as { subject?: string | null }).subject || null,
      topic: fbTopic,
      id: feedback.id,
    })
  })
  feedbackItems.sort((a, b) => b.date.getTime() - a.date.getTime())
  const latestFeedback = feedbackItems[0] || null

  // 待办与通知去重：当"老师最新关注"已置顶展示该课堂反馈时，待办列表中过滤掉完全相同的课堂反馈通知，避免信息重复冗余
  const displayNotifications = useMemo(() => {
    return activeNotifications.filter((n) => {
      if (latestFeedback) {
        const rel = (n.relatedType || n.type || '').toUpperCase()
        if (rel === 'CLASSROOM_FEEDBACK' && (n.relatedId === latestFeedback.id || n.id === latestFeedback.id)) {
          return false
        }
        if (
          n.title.includes('课堂反馈') &&
          latestFeedback.teacherName &&
          n.title.includes(latestFeedback.teacherName)
        ) {
          return false
        }
      }
      return true
    })
  }, [activeNotifications, latestFeedback])

  const selectStudent = (studentId: string) => {
    setActiveChildId(studentId)
    const picked = students.find(st => st.id === studentId)
    if (picked) {
      rememberParentChild(picked.id, resolveMembership(picked.membershipLevel))
      // 存当前学生性别到 cookie，供右上角头像使用
      rememberParentChildGender(picked.gender)
    }
    const params = new URLSearchParams(window.location.search)
    params.set('childId', studentId)
    window.history.replaceState({}, '', `?${params.toString()}`)
  }
  const openNotification = (notification: DashboardNotification) => {
    const relatedType = (notification.relatedType || notification.type || '').toUpperCase()
    const target = ['EXAM_PAPER', 'PAPER_PUBLISHED'].includes(relatedType) && notification.relatedId
      ? `/parent/archive/${encodeURIComponent(notification.relatedId)}`
      : notification.href || `/parent/notifications/${notification.id}`
    const shouldMarkRead = !notification.read && !locallyReadNotificationIds.has(notification.id)
    if (shouldMarkRead) {
      setLocallyReadNotificationIds(current => new Set(current).add(notification.id))
    }
    router.push(target)

    if (shouldMarkRead) {
      void fetch('/api/parent/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notification.id }),
      }).then(async (response) => {
        const data = await response.json().catch(() => null) as { error?: string } | null
        if (!response.ok) throw new Error(data?.error || '通知已打开，但已读状态同步失败')
        await mutateUnread()
      }).catch((error: unknown) => {
        setLocallyReadNotificationIds(current => {
          const next = new Set(current)
          next.delete(notification.id)
          return next
        })
        toast.error(error instanceof Error ? error.message : '通知已打开，但已读状态同步失败')
      })
    }
  }

  useEffect(() => {
    if (!activeStudent?.id) return
    const timer = window.setTimeout(() => rememberParentChild(activeStudent.id, membershipLevel), 0)
    return () => window.clearTimeout(timer)
  }, [activeStudent?.id, membershipLevel])

  return (
    <PullToRefresh onRefresh={async () => {
      await mutateUnread()
      router.refresh()
      await new Promise((resolve) => setTimeout(resolve, 500))
    }}>
      <div className={`parent-dashboard-home parent-dashboard-home--${membershipLevel.toLowerCase()}`}>
      <MessageWorkflowNotice audience="parent" deferMs={1_400} />

      {welcomeMounted && <div className={`parent-dashboard-welcome${welcomeVisible ? ' is-visible' : ''}`}><div><strong>{fillName(MEMBERSHIP_WELCOME[membershipLevel].title, activeStudent?.name || '牧哲学堂')}</strong><span>{MEMBERSHIP_WELCOME[membershipLevel].body}</span><small>牧哲学堂 · 把每一个孩子，当成自己的孩子来教</small></div></div>}

      <section className="parent-dashboard-hero" style={{ background: heroTheme.background, border: heroTheme.border, boxShadow: heroTheme.shadow, position: 'relative', overflow: 'hidden' }}>
        {/* 东方雅致背景暗纹与柔光 */}
        <div style={{ position: 'absolute', top: '-40%', right: '-15%', width: 240, height: 280, background: `radial-gradient(circle, ${heroTheme.glowColor}, transparent 70%)`, pointerEvents: 'none' }} />
        {heroTheme.patternType === 'svip' ? (
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, pointerEvents: 'none' }} aria-hidden="true">
            <defs>
              <pattern id="hero-pattern-svip" width="28" height="28" patternUnits="userSpaceOnUse">
                <path d="M14 0 L28 14 L14 28 L0 14 Z" fill="none" stroke="#F6E9C8" strokeWidth="0.8" />
                <circle cx="14" cy="14" r="3.5" fill="none" stroke="#C9A45C" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-pattern-svip)" />
          </svg>
        ) : heroTheme.patternType === 'vip' ? (
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07, pointerEvents: 'none' }} aria-hidden="true">
            <defs>
              <pattern id="hero-pattern-vip" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M0 16 Q16 0 32 16 Q16 32 0 16 Z" fill="none" stroke="#FFA26B" strokeWidth="0.85" />
                <circle cx="16" cy="16" r="2.5" fill="#FFA26B" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-pattern-vip)" />
          </svg>
        ) : (
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, pointerEvents: 'none' }} aria-hidden="true">
            <defs>
              <pattern id="hero-pattern-normal" width="32" height="22" patternUnits="userSpaceOnUse">
                <path d="M0 11 Q8 0 16 11 T32 11" fill="none" stroke="#A7F3D0" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hero-pattern-normal)" />
          </svg>
        )}

        {/* 学生身份与今日状态条 */}
        <div className="parent-dashboard-hero__identity" style={{ position: 'relative', zIndex: 1 }}>
          <div className="parent-dashboard-hero__identity-main">
            <div className="parent-hero-avatar-box" style={{ boxShadow: heroTheme.avatarHalo }}>
              <StudentAvatar
                name={activeStudent?.name || '牧'}
                gender={activeStudent?.gender}
                size={52}
              />
            </div>
            <div className="parent-dashboard-hero__identity-body">
              <div className="parent-dashboard-hero__student-title">
                <strong>{activeStudent?.name || '牧哲学堂同学'}</strong>
                {membershipLevel !== 'NORMAL' && (
                  <span
                    className={`parent-hero-membership-badge parent-hero-membership-badge--${membershipLevel.toLowerCase()}`}
                  >
                    <CrownFilled style={{ fontSize: 11 }} />
                    <span>{membershipLevel === 'SVIP' ? 'SVIP 尊享' : 'VIP 专属'}</span>
                  </span>
                )}
              </div>
              <div className="parent-hero-teacher-line">
                <span className="parent-hero-teacher-prefix">{activeStudent?.grade || '未填写年级'} · 负责老师</span>
                <span className="parent-hero-teacher-name-row">
                  <span className="parent-hero-teacher-name">{topTeacher?.name || '待分配'}</span>
                  {topTierLabel && <span className={`parent-hero-teacher-tag parent-hero-teacher-tag--${String(topTier).toLowerCase()}`}>{topTierLabel}</span>}
                </span>
              </div>
            </div>
          </div>
          <div className="parent-hero-status-pill">
            <span className="parent-hero-status-dot" />
            <span>{todayStatus}</span>
          </div>
        </div>

        {/* 1. 优先展示：今日天气与出行接送雨具提醒 */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <WeatherHeroStrip audience="parent" compact variant="dark" />
        </div>

        {/* 2. 关键指标看板 */}
        <div className="parent-dashboard-hero__stats" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ background: heroTheme.statBg, border: heroTheme.statBorder, boxShadow: heroTheme.statHighlight }}>
            <CalendarOutlined className="parent-hero-stat-watermark" style={{ color: heroTheme.statWatermarkColor }} aria-hidden="true" />
            <strong className="parent-hero-stat-value">
              <AnimatedNumber value={todayLessons.length} />
            </strong>
            <span>今日课次</span>
          </div>
          <div style={{ background: heroTheme.statBg, border: heroTheme.statBorder, boxShadow: heroTheme.statHighlight }}>
            <CheckCircleOutlined className="parent-hero-stat-watermark" style={{ color: heroTheme.statWatermarkColor }} aria-hidden="true" />
            <strong className="parent-hero-stat-value">
              {activeAttendanceRate == null ? '暂无' : <><AnimatedNumber value={activeAttendanceRate} />%</>}
            </strong>
            <span>本月出勤</span>
          </div>
          <div style={{ background: heroTheme.statBg, border: heroTheme.statBorder, boxShadow: heroTheme.statHighlight }}>
            <BellOutlined className="parent-hero-stat-watermark" style={{ color: heroTheme.statWatermarkColor }} aria-hidden="true" />
            <strong className="parent-hero-stat-value">
              <AnimatedNumber value={totalUnread} />
            </strong>
            <span>待处理通知</span>
          </div>
        </div>

        {/* 3. 学堂立志名言金句 */}
        <div className="parent-dashboard-hero__quote" style={{ background: heroTheme.quoteBg, border: heroTheme.quoteBorder, position: 'relative', zIndex: 1 }}>
          <span className="parent-hero-seal-badge" aria-hidden="true">学思</span>
          <div className="parent-dashboard-hero__quote-body">
            <span className="parent-dashboard-hero__quote-text">「{dailyQuote.text}」</span>
            <span className="parent-dashboard-hero__quote-source">· · · {dailyQuote.source}</span>
          </div>
        </div>

        {/* 4. 学情诊断与成长报告尊享通道条 */}
        <button
          type="button"
          className="parent-hero-report-bar"
          onClick={() => router.push(activeStudent?.id ? `/parent/archive?childId=${activeStudent.id}` : '/parent/archive')}
          style={{
            background: heroTheme.reportBarBg,
            border: heroTheme.reportBarBorder,
            boxShadow: heroTheme.reportBarShadow,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div className="parent-hero-report-bar__left">
            <span
              className="parent-hero-report-bar__icon-wrap"
              style={{
                background: heroTheme.reportIconBg,
                color: heroTheme.reportIconColor,
              }}
            >
              <FileTextOutlined />
            </span>
            <div className="parent-hero-report-bar__text">
              <strong>学情诊断与成长报告</strong>
              <small>综合素养分析 · 课堂成长雷达 · 学情档案</small>
            </div>
          </div>
          <span
            className="parent-hero-report-bar__btn"
            style={{
              background: heroTheme.reportBtnBg,
              color: heroTheme.reportBtnColor,
              boxShadow: heroTheme.reportBtnShadow,
            }}
          >
            <span>查看报告</span>
            <RightOutlined style={{ fontSize: 9 }} />
          </span>
        </button>
      </section>

      {/* 4 大核心快捷入口 + 今日/最近课程安排 */}
      <ParentTodayPanel lessons={displayLessons} nextLesson={null} lessonDate={displayLessonDate} activeChildId={activeChildId} studentName={activeStudent?.name || '孩子'} />

      {/* 老师最新关注：名师手札卡，通透去盒化 */}
      <section className="parent-feedback-section" aria-labelledby="parent-latest-feedback-title">
        <div className="parent-feedback-section__head">
          <h2 id="parent-latest-feedback-title">老师最新关注</h2>
          {latestFeedback && (
            <button
              type="button"
              className="parent-dashboard-see-all-btn"
              onClick={() => router.push('/parent/class-feedback')}
            >
              <span>查看全部</span>
              <RightOutlined style={{ fontSize: 9 }} />
            </button>
          )}
        </div>
        {feedbackItems.length ? (
          <div className="parent-latest-feedback-list">
            {feedbackItems.slice(0, 1).map((item, index) => {
              const subjectMeta = resolveSubjectMeta(item.subject, item.teacherName, item.content)
              const typeMeta = resolveFeedbackTypeMeta(item.type, item.content)
              // 检查知识点是否与内容重复，若重复则不冗余显示知识点标签
              const hasDistinctTopic = item.topic && !item.content.includes(item.topic)

              return (
                <button
                  type="button"
                  key={item.id}
                  className="parent-latest-feedback stagger-item"
                  style={{ animationDelay: `${index * 40}ms` }}
                  onClick={() => router.push(`/parent/class-feedback/${item.id}${activeStudent?.id ? `?childId=${activeStudent.id}` : ''}`)}
                >
                  <div className="parent-feedback-top-row">
                    <div className="parent-feedback-author">
                      <div className="parent-feedback-avatar-wrap">
                        <CachedAvatarImage
                          src={getTeacherAvatarUrl(item.teacherAvatar, item.teacherGender, item.teacherName)}
                          fallbackSrc={getTeacherAvatarUrl(null, item.teacherGender, item.teacherName) || DEFAULT_TEACHER_AVATAR}
                          alt={`${item.teacherName}老师`}
                          className="parent-feedback-avatar-img"
                        />
                        <span
                          className="parent-feedback-subject-badge-mini"
                          style={{
                            color: subjectMeta.color,
                            background: subjectMeta.bg,
                            border: subjectMeta.border,
                          }}
                          title={subjectMeta.label || '学科'}
                        >
                          {subjectMeta.icon}
                        </span>
                      </div>
                      <div className="parent-feedback-author-info">
                        <div className="parent-feedback-name-row">
                          <strong className="parent-feedback-teacher-name">
                            {item.teacherName}老师
                          </strong>
                          {subjectMeta.label && (
                            <span className="parent-feedback-subject-pill">
                              {subjectMeta.label}
                            </span>
                          )}
                          <span
                            className="parent-feedback-type-badge"
                            style={{
                              color: typeMeta.color,
                              background: typeMeta.bg,
                              border: typeMeta.border,
                            }}
                          >
                            {typeMeta.icon}
                            <span>{typeMeta.label}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <small className="parent-feedback-time">
                      {formatNotificationNaturalTime(item.date.toISOString())}
                    </small>
                  </div>

                  {/* 知识点与课堂表现高光微标（仅在非重复时精简展示） */}
                  {(hasDistinctTopic || (item.tags && item.tags.length > 0)) && (
                    <div className="parent-feedback-highlight-tags">
                      {hasDistinctTopic && (
                        <span className="parent-feedback-topic-tag">
                          🎯 {item.topic}
                        </span>
                      )}
                      {item.tags?.slice(0, 2).map((tag) => (
                        <span key={tag} className="parent-feedback-behavior-tag">
                          ✨ {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="parent-feedback-quote-card">
                    <span className="parent-feedback-quote-mark" aria-hidden="true">“</span>
                    <p className="parent-feedback-quote-text">{item.content}</p>
                  </div>

                  <div className="parent-feedback-footer-row">
                    <span className="parent-feedback-action-btn">
                      <span>{typeMeta.actionLabel}</span>
                      <RightOutlined style={{ fontSize: 9 }} />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <Text type="secondary" className="parent-dashboard-empty-text">
            暂无反馈，老师会在课后更新学习情况。
          </Text>
        )}
      </section>

      {/* 待办与通知：通透列表，人文化文案与清晰业务图标 */}
      <section className="parent-notice-section" aria-labelledby="parent-notifications-title">
        <div className="parent-notice-section__head">
          <h2 id="parent-notifications-title">待办与通知</h2>
          <button
            type="button"
            className="parent-dashboard-see-all-btn"
            onClick={() => router.push('/parent/notifications')}
          >
            <span>查看全部</span>
            <RightOutlined style={{ fontSize: 9 }} />
          </button>
        </div>
        {unreadError && (
          <Text type="secondary" role="status">
            {unreadData ? '未读统计更新失败，数字可能滞后' : '未读统计暂不可用，当前数字按已加载通知显示'}
          </Text>
        )}
        {displayNotifications.length ? (
          <div className="parent-notice-list">
            {displayNotifications.slice(0, 3).map((notification, index) => {
              const isRead = notification.read || locallyReadNotificationIds.has(notification.id)
              const meta = resolveNotificationMeta(notification)
              const displayTitle = humanizeParentNoticeTitle(notification.title)

              return (
                <button
                  type="button"
                  key={notification.id}
                  className={`parent-notice-item stagger-item ${!isRead ? 'parent-notice-item--unread' : ''}`}
                  style={{ animationDelay: `${index * 40}ms` }}
                  onClick={() => openNotification(notification)}
                >
                  {!isRead && <span className="parent-notice-unread-dot" aria-hidden="true" />}
                  <span
                    className="parent-notice-icon-box"
                    style={{
                      color: meta.color,
                      background: meta.bg,
                      border: meta.border,
                      boxShadow: isRead ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.04)',
                      opacity: isRead ? 0.82 : 1,
                    }}
                  >
                    {meta.icon}
                  </span>
                  <div className="parent-notice-content">
                    <div className="parent-notice-title-row">
                      <strong
                        className="parent-notice-title"
                        style={{ color: isRead ? '#73695B' : '#1A1201' }}
                      >
                        {displayTitle}
                      </strong>
                      {!isRead && (
                        <span className="parent-notice-badge" aria-label="未读新通知">
                          未读
                        </span>
                      )}
                    </div>
                    <small className="parent-notice-time">
                      {formatNotificationNaturalTime(notification.createdAt)}
                    </small>
                  </div>
                  <RightOutlined className="parent-notice-arrow" />
                </button>
              )
            })}
          </div>
        ) : (
          <Text type="secondary" className="parent-dashboard-empty-text">
            暂无待办通知
          </Text>
        )}
      </section>

      <ParentLessonPreview items={lessonPreviews} activeChildId={activeChildId} />

      <div ref={weeklyReportAnchorRef} aria-hidden="true" style={{ height: 1 }} />
      {weeklyReady && <WeeklyReport activeChildId={activeChildId} />}

      {/* 会员专属特权与服务承诺（东方雅韵宋锦暗纹 + 3D 琉璃微拟物彩色图标） */}
      {(() => {
        const benefits = MEMBERSHIP_BENEFITS[membershipLevel]
        const upgrade = MEMBERSHIP_UPGRADE[membershipLevel]
        return (
          <section
            className={`parent-dashboard-section parent-membership-benefits parent-membership-benefits--${membershipLevel.toLowerCase()}`}
            style={{ position: 'relative', overflow: 'hidden' }}
          >
            {/* SVIP 专属东方宋锦回纹与暖金漫射光晕 */}
            {membershipLevel === 'SVIP' && (
              <>
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.055, pointerEvents: 'none' }} aria-hidden="true">
                  <defs>
                    <pattern id="parent-svip-benefit-pattern" width="28" height="28" patternUnits="userSpaceOnUse">
                      <path d="M14 0 L28 14 L14 28 L0 14 Z" fill="none" stroke="#F6E9C8" strokeWidth="0.8" />
                      <circle cx="14" cy="14" r="3.5" fill="none" stroke="#C9A45C" strokeWidth="0.8" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#parent-svip-benefit-pattern)" />
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    top: '-35%',
                    right: '-15%',
                    width: 240,
                    height: 240,
                    background: 'radial-gradient(circle, rgba(201, 164, 92, 0.22), transparent 70%)',
                    pointerEvents: 'none',
                  }}
                />
              </>
            )}

            {/* VIP 专属琥珀光晕与麦穗纹 */}
            {membershipLevel === 'VIP' && (
              <div
                style={{
                  position: 'absolute',
                  top: '-35%',
                  right: '-15%',
                  width: 240,
                  height: 240,
                  background: 'radial-gradient(circle, rgba(255, 255, 255, 0.2), transparent 70%)',
                  pointerEvents: 'none',
                }}
              />
            )}

            <div className="parent-membership-benefits__head" style={{ position: 'relative', zIndex: 1 }}>
              <h2>
                {benefits.title}
              </h2>
              {membershipLevel !== 'NORMAL' && (
                <span className="parent-membership-badge">
                  {membershipLevel === 'SVIP' ? '👑✨' : '👑'} {MEMBERSHIP_THEME[membershipLevel].label} 尊享用户
                </span>
              )}
            </div>

            <div className="parent-membership-benefits__grid" style={{ position: 'relative', zIndex: 1 }}>
              {benefits.items.map((item) => {
                const visual = resolveBenefitVisual(item.title, item.icon)
                return (
                  <div key={item.title} className="parent-membership-benefit">
                    <span
                      className="parent-membership-benefit__icon"
                      style={{
                        background: visual.bg,
                        color: visual.color,
                        boxShadow: visual.shadow,
                      }}
                    >
                      {visual.icon}
                    </span>
                    <div className="parent-membership-benefit__text">
                      <strong>{item.title}</strong>
                      <small>{item.desc}</small>
                    </div>
                  </div>
                )
              })}
            </div>

            {membershipLevel === 'SVIP' && (
              <button
                type="button"
                className="parent-membership-upgrade"
                style={{ position: 'relative', zIndex: 1 }}
                onClick={() => router.push(upgrade.href)}
              >
                <span>{upgrade.text}</span>
                <RightOutlined style={{ fontSize: 10 }} />
              </button>
            )}
          </section>
        )
      })()}
    </div>
    </PullToRefresh>
  )
}
