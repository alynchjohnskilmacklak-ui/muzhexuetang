'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  ArrowRightOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  CloudOutlined,
  DownOutlined,
  FileTextOutlined,
  MessageOutlined,
  ReloadOutlined,
  SwapOutlined,
  UpOutlined,
} from '@ant-design/icons'
import { MEMBERSHIP_THEME, resolveMembership } from '@/constants/membership'
import { TIER_THEME, resolveTier } from '@/constants/teacher-tier'
import styles from './AssistantBriefing.module.css'

export type AssistantRole = 'admin' | 'teacher' | 'parent'
export type MascotActionId = 'received' | 'thanks' | 'classStart' | 'leaveApproved' | 'greatJob' | 'confirm' | 'keepGoing'

const MASCOT_ACTIONS: Record<MascotActionId, { label: string; src: string; poster: string }> = {
  received: {
    label: '收到',
    src: '/images/assistant-mascot/received.webp',
    poster: '/images/assistant-mascot/received-poster.webp',
  },
  thanks: {
    label: '谢谢家长',
    src: '/images/assistant-mascot/thanks.webp',
    poster: '/images/assistant-mascot/thanks-poster.webp',
  },
  classStart: {
    label: '上课啦',
    src: '/images/assistant-mascot/classStart.webp',
    poster: '/images/assistant-mascot/classStart-poster.webp',
  },
  leaveApproved: {
    label: '请假已批',
    src: '/images/assistant-mascot/leaveApproved.webp',
    poster: '/images/assistant-mascot/leaveApproved-poster.webp',
  },
  greatJob: {
    label: '表现真棒',
    src: '/images/assistant-mascot/greatJob.webp',
    poster: '/images/assistant-mascot/greatJob-poster.webp',
  },
  confirm: {
    label: '请确认',
    src: '/images/assistant-mascot/confirm.webp',
    poster: '/images/assistant-mascot/confirm-poster.webp',
  },
  keepGoing: {
    label: '加油冲刺',
    src: '/images/assistant-mascot/keepGoing.webp',
    poster: '/images/assistant-mascot/keepGoing-poster.webp',
  },
}

const ROLE_ACTIONS: Record<AssistantRole, MascotActionId[]> = {
  parent: ['classStart', 'received', 'greatJob', 'thanks', 'keepGoing', 'leaveApproved'],
  teacher: ['classStart', 'confirm', 'keepGoing', 'received', 'greatJob', 'thanks'],
  admin: ['confirm', 'received', 'keepGoing', 'greatJob', 'thanks', 'classStart'],
}

type BriefingAlert = {
  key?: string
  notificationId?: string
  type?: string
  title?: string
  snippet?: string
  href?: string
}

type ParentSchedule = {
  id?: string
  courseName?: string
  subject?: string
  teacherName?: string
  roomName?: string
  startTime?: string
  endTime?: string
}

type ParentStudentToday = {
  student?: {
    id?: string
    name?: string
    grade?: string | null
    membershipLevel?: string | null
    mainTeacherName?: string
  }
  todaySchedules?: ParentSchedule[]
  attendance?: Array<{ status?: string; createdAt?: string }>
  unreadNotifications?: number
  leaveThisWeek?: number
}

type ParentTodayData = {
  today?: string
  students?: ParentStudentToday[]
}

type TeacherLesson = {
  id?: string
  startTime?: string
  endTime?: string
  courseName?: string
  groupName?: string
  room?: string
  studentCount?: number
  statusLabel?: string
}

type TeacherCompletionProgress = {
  done?: number
  total?: number
  percent?: number
}

type TeacherDashboardData = {
  teacher?: { name?: string; tierLevel?: string | null }
  todayLessons?: TeacherLesson[]
  heroStats?: {
    pendingFeedback?: number
  }
  pendingTasks?: Record<string, unknown>
  feedbackTasks?: Array<{ id?: string; type?: string; title?: string; description?: string; href?: string }>
  weekCompletion?: {
    attendance?: TeacherCompletionProgress
    classroomFeedback?: TeacherCompletionProgress
    parentMessages?: TeacherCompletionProgress
  }
}

type AdminDashboardData = {
  metrics?: Record<string, unknown>
  teacherCompliance?: Array<{
    teacherId?: string
    name?: string
    todayLessons?: number
    attendanceDone?: number
    pendingAttendance?: number
    feedbackDone?: number
    pendingFeedback?: number
  }>
}

type WeatherData = {
  available?: boolean
  city?: string
  days?: Array<{ date?: string; condition?: string; minTemp?: number; maxTemp?: number }>
  tips?: Partial<Record<AssistantRole, string>>
}

type WeeklyReportData = {
  reports?: Array<{
    stats?: {
      totalSchedules?: number
      presentCount?: number
      absentCount?: number
      lateCount?: number
      leaveCount?: number
      attendanceRate?: number | null
      notificationCount?: number
      feedbackCount?: number
    }
    comment?: string
  }>
}

/** 家长端周摘要（简化为面板展示所需字段） */
export type ParentWeeklySummary = {
  comment: string
  stats: {
    totalSchedules: number
    presentCount: number
    absentCount: number
    attendanceRate: number | null
    feedbackCount: number
  }
}

export interface AssistantBriefingData {
  loading: boolean
  loaded: boolean
  available: boolean
  weather: WeatherData | null
  alerts: BriefingAlert[]
  parentToday: ParentTodayData | null
  weeklyReport: ParentWeeklySummary | null
  teacherDashboard: TeacherDashboardData | null
  teacherMessageCount: number | null
  adminDashboard: AdminDashboardData | null
}

type BriefingTask = {
  id: string
  title: string
  detail: string
  href: string
  count?: number
  kind: 'action' | 'schedule' | 'message'
}

type BriefingContent = {
  title: string
  summary: string
  tasks: BriefingTask[]
  complete: boolean
  pendingCount: number
  recommendedAction: MascotActionId
}

const EMPTY_DATA: AssistantBriefingData = {
  loading: true,
  loaded: false,
  available: false,
  weather: null,
  alerts: [],
  parentToday: null,
  weeklyReport: null,
  teacherDashboard: null,
  teacherMessageCount: null,
  adminDashboard: null,
}

const briefingRequestCache = new Map<string, { promise: Promise<unknown>; time: number }>()

async function fetchJson<T>(url: string, signal?: AbortSignal, ttl = 15_000): Promise<T | null> {
  const cached = briefingRequestCache.get(url)
  if (cached && Date.now() - cached.time < ttl) {
    return cached.promise as Promise<T | null>
  }
  const promise = (async () => {
    try {
      const response = await fetch(url, { signal })
      if (!response.ok) return null
      return await response.json() as T
    } catch {
      return null
    }
  })()
  briefingRequestCache.set(url, { promise, time: Date.now() })
  return promise
}

function asCount(value: unknown): number {
  const count = Number(value)
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
}

function taskHref(value: string): string {
  return value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

export function useAssistantBriefing(role: AssistantRole) {
  const [data, setData] = useState<AssistantBriefingData>(EMPTY_DATA)
  const controllerRef = useRef<AbortController | null>(null)
  const initialLoadStartedRef = useRef(false)

  const refresh = useCallback(async () => {
    initialLoadStartedRef.current = true
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setData((current) => ({ ...current, loading: true }))

    const weatherRequest = fetchJson<WeatherData>('/api/weather/xinle', controller.signal)
    let roleRequests: Promise<unknown>[]

    if (role === 'parent') {
      roleRequests = [
        fetchJson<ParentTodayData>('/api/parent/today', controller.signal),
        fetchJson<{ alerts?: BriefingAlert[] }>('/api/ai/recent-alerts', controller.signal),
        fetchJson<WeeklyReportData>('/api/parent/weekly-report', controller.signal),
      ]
    } else if (role === 'teacher') {
      roleRequests = [
        fetchJson<TeacherDashboardData>('/api/teacher/dashboard', controller.signal),
        fetchJson<{ messages?: unknown[] }>('/api/teacher/messages', controller.signal),
      ]
    } else {
      const division = typeof window === 'undefined'
        ? ''
        : new URLSearchParams(window.location.search).get('division') || ''
      const dashboardUrl = division ? '/api/dashboard?division=' + encodeURIComponent(division) : '/api/dashboard'
      roleRequests = [
        fetchJson<AdminDashboardData>(dashboardUrl, controller.signal),
        fetchJson<{ alerts?: BriefingAlert[] }>('/api/ai/recent-alerts', controller.signal),
      ]
    }

    const [weatherResult, ...roleResults] = await Promise.allSettled([weatherRequest, ...roleRequests])
    if (controller.signal.aborted) return

    const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null
    const roleValue = (index: number) => roleResults[index]?.status === 'fulfilled'
      ? roleResults[index].value
      : null

    if (role === 'parent') {
      const parentToday = roleValue(0) as ParentTodayData | null
      const alertsData = roleValue(1) as { alerts?: BriefingAlert[] } | null
      const weeklyData = roleValue(2) as WeeklyReportData | null
      const weeklyReport: ParentWeeklySummary | null = weeklyData?.reports?.[0]
        ? {
            comment: weeklyData.reports[0].comment || '',
            stats: {
              totalSchedules: weeklyData.reports[0].stats?.totalSchedules ?? 0,
              presentCount: weeklyData.reports[0].stats?.presentCount ?? 0,
              absentCount: weeklyData.reports[0].stats?.absentCount ?? 0,
              attendanceRate: weeklyData.reports[0].stats?.attendanceRate ?? null,
              feedbackCount: weeklyData.reports[0].stats?.feedbackCount ?? 0,
            },
          }
        : null
      setData({
        loading: false,
        loaded: true,
        available: Boolean(parentToday && Array.isArray(parentToday.students) && alertsData && Array.isArray(alertsData.alerts)),
        weather,
        parentToday,
        weeklyReport,
        alerts: Array.isArray(alertsData?.alerts) ? alertsData.alerts : [],
        teacherDashboard: null,
        teacherMessageCount: null,
        adminDashboard: null,
      })
      return
    }

    if (role === 'teacher') {
      const teacherDashboard = roleValue(0) as TeacherDashboardData | null
      const messagesData = roleValue(1) as { messages?: unknown[] } | null
      setData({
        loading: false,
        loaded: true,
        available: Boolean(
          teacherDashboard
          && Array.isArray(teacherDashboard.todayLessons)
          && teacherDashboard.pendingTasks
          && Array.isArray(teacherDashboard.feedbackTasks)
          && messagesData
          && Array.isArray(messagesData.messages),
        ),
        weather,
        parentToday: null,
        weeklyReport: null,
        alerts: [],
        teacherDashboard,
        teacherMessageCount: Array.isArray(messagesData?.messages) ? messagesData.messages.length : null,
        adminDashboard: null,
      })
      return
    }

    const adminDashboard = roleValue(0) as AdminDashboardData | null
    const alertsData = roleValue(1) as { alerts?: BriefingAlert[] } | null
    setData({
      loading: false,
      loaded: true,
      available: Boolean(
        adminDashboard
        && adminDashboard.metrics
        && typeof adminDashboard.metrics.pendingTasks === 'number'
        && alertsData
        && Array.isArray(alertsData.alerts),
      ),
      weather,
      parentToday: null,
      weeklyReport: null,
      alerts: Array.isArray(alertsData?.alerts) ? alertsData.alerts : [],
      teacherDashboard: null,
      teacherMessageCount: null,
      adminDashboard,
    })
  }, [role])

  useEffect(() => {
    initialLoadStartedRef.current = false
    const startInitialLoad = () => {
      if (!initialLoadStartedRef.current) void refresh()
    }
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
      cancelIdleCallback?: (handle: number) => void
    }
    const idleHandle = idleWindow.requestIdleCallback?.(startInitialLoad, { timeout: 1_500 })
    const fallbackTimer = idleHandle === undefined
      ? window.setTimeout(startInitialLoad, 900)
      : undefined
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, 180_000)
    const handleFocus = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    window.addEventListener('focus', handleFocus)
    return () => {
      if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle)
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer)
      window.clearInterval(timer)
      window.removeEventListener('focus', handleFocus)
      controllerRef.current?.abort()
    }
  }, [refresh])

  return { data, refresh }
}

function formatTime(value?: string | null): string {
  if (!value) return ''
  if (/^\d{1,2}:\d{2}$/.test(value)) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function useShanghaiNow() {
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    const update = () => setNow(new Date())
    update()
    const timer = window.setInterval(update, 30_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])
  return reduced
}

export function AssistantMascotImage({
  actionId,
  size,
  crop = false,
}: {
  actionId: MascotActionId
  size: number
  crop?: boolean
}) {
  const reducedMotion = useReducedMotion()
  const action = MASCOT_ACTIONS[actionId]
  return (
    <Image
      src={reducedMotion ? action.poster : action.src}
      alt=""
      width={size}
      height={size}
      loading="eager"
      unoptimized
      draggable={false}
      sizes={size + 'px'}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        objectFit: crop ? 'cover' : 'contain',
        objectPosition: crop ? '50% 15%' : 'center',
        pointerEvents: 'none',
      }}
    />
  )
}

function greeting(now: Date | null): string {
  if (!now) return '你好，今天的安排已经为你准备好'
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    hour12: false,
  }).format(now))
  if (hour < 11) return '早上好，今天的安排已经为你准备好'
  if (hour < 14) return '中午好，记得给自己留一点休息时间'
  if (hour < 18) return '下午好，一起把今天安排得更从容'
  return '晚上好，先看看今天还有哪些重要事项'
}

function dateAndTime(now: Date | null): { date: string; time: string } {
  if (!now) return { date: '正在读取日期', time: '--:--' }
  return {
    date: new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }).format(now),
    time: new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      minute: '2-digit',
    }).format(now),
  }
}

function buildContent(role: AssistantRole, data: AssistantBriefingData): BriefingContent {
  const tasks: BriefingTask[] = []

  if (!data.available) {
    return {
      title: role === 'parent' ? '家长今日安排' : role === 'teacher' ? '教师教学任务' : '校区运营任务',
      summary: data.loading ? '小牧正在整理今天的安排…' : '任务信息暂时没有同步完整，刷新后再试一次。',
      tasks: [],
      complete: false,
      pendingCount: 0,
      recommendedAction: role === 'teacher' || role === 'admin' ? 'confirm' : 'received',
    }
  }

  if (role === 'parent') {
    const students = data.parentToday?.students || []
    if (!students.length) {
      tasks.push({ id: 'parent-account', title: '学员账号待关联', detail: '联系校区确认家长账号与学员的关联', href: '/parent/profile', count: 1, kind: 'action' })
    }
    const schedules = students.flatMap((entry) => (entry.todaySchedules || []).map((schedule) => ({
      ...schedule,
      studentName: entry.student?.name || '孩子',
      studentLevel: resolveMembership(entry.student?.membershipLevel),
    }))).sort((a, b) => {
      const aTime = new Date(a.startTime || '').getTime()
      const bTime = new Date(b.startTime || '').getTime()
      return (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0)
    })
    const feedbackAlerts = data.alerts.filter((alert) => /FEEDBACK/.test((alert.type || '').toUpperCase()))
    const messageAlerts = data.alerts.filter((alert) => (alert.type || '').toUpperCase() === 'MESSAGE')
    const otherAlerts = data.alerts.filter((alert) => !/FEEDBACK/.test((alert.type || '').toUpperCase()) && (alert.type || '').toUpperCase() !== 'MESSAGE')

    if (schedules.length) {
      const first = schedules[0]
      const time = formatTime(first.startTime)
      const detail = schedules.length === 1
        ? [time, first.courseName || first.subject, first.teacherName].filter(Boolean).join(' · ')
        : '最近一节 ' + [time, first.studentName, first.courseName || first.subject].filter(Boolean).join(' · ') + '，今天共 ' + schedules.length + ' 节'
      tasks.push({ id: 'parent-schedule', title: '今日课程安排', detail, href: '/parent/schedule', count: schedules.length, kind: 'schedule' })
    }
    if (feedbackAlerts.length) {
      tasks.push({ id: 'parent-feedback', title: '老师反馈待查看', detail: feedbackAlerts[0].title || '有新的课堂反馈', href: '/parent/class-feedback', count: feedbackAlerts.length, kind: 'action' })
    }
    if (messageAlerts.length) {
      tasks.push({ id: 'parent-messages', title: '老师留言有新回复', detail: messageAlerts[0].snippet || '打开留言查看老师回复', href: '/parent/messages', count: messageAlerts.length, kind: 'message' })
    }
    if (otherAlerts.length) {
      tasks.push({ id: 'parent-notices', title: '未读通知', detail: otherAlerts[0].title || '打开通知中心查看', href: '/parent/notifications', count: otherAlerts.length, kind: 'action' })
    }

    const pending = feedbackAlerts.length + messageAlerts.length + otherAlerts.length + (students.length ? 0 : 1)
    const nextStart = schedules[0]?.startTime ? new Date(schedules[0].startTime).getTime() : NaN
    const minutesToClass = Number.isFinite(nextStart) ? Math.round((nextStart - Date.now()) / 60_000) : null
    const summary = !students.length
      ? '当前账号还没有关联学员，联系校区完成关联后，就能查看课程和老师反馈。'
      : schedules.length && minutesToClass !== null && minutesToClass >= 0 && minutesToClass <= 60
        ? '孩子 ' + formatTime(schedules[0].startTime) + ' 有课，课程信息和老师反馈都在这里。'
        : feedbackAlerts.length
          ? '老师刚更新了 ' + feedbackAlerts.length + ' 条课堂反馈，点开就能了解孩子今天的学习情况。'
          : messageAlerts.length
            ? '老师回复了你的留言，打开家校沟通继续交流。'
            : otherAlerts.length
              ? '你有 ' + otherAlerts.length + ' 条通知待查看，打开通知中心了解详情。'
              : schedules.length
                ? '今天为孩子安排了 ' + schedules.length + ' 节课，课表已经整理好了。'
                : '今天没有课程安排，反馈和留言也都已查看。辛苦陪伴，今天可以轻松一些。'
    const complete = students.length > 0 && schedules.length === 0 && pending === 0
    const recommendedAction: MascotActionId = schedules.length && minutesToClass !== null && minutesToClass >= 0 && minutesToClass <= 60
      ? 'classStart'
      : messageAlerts.length
        ? 'received'
        : feedbackAlerts.length
          ? 'greatJob'
          : !students.length
            ? 'received'
            : complete
              ? 'thanks'
              : otherAlerts.length
                ? 'confirm'
                : 'keepGoing'
    return {
      title: '家长今日安排',
      summary,
      tasks,
      complete,
      pendingCount: pending,
      recommendedAction,
    }
  }

  if (role === 'teacher') {
    const dashboard = data.teacherDashboard
    const lessons = dashboard?.todayLessons || []
    const pending = dashboard?.pendingTasks || {}
    const feedbackTasks = dashboard?.feedbackTasks || []
    const feedbackCount = asCount(dashboard?.heroStats?.pendingFeedback ?? feedbackTasks.filter((task) => task.type === '课堂反馈').length)
    const studentFollowUps = feedbackTasks.filter((task) => task.type === '学员跟进')
    const studentFollowUpCount = studentFollowUps.length
    const lessonInProgress = lessons.find((lesson) => lesson.statusLabel === '上课中')
    const upcomingLesson = lessons.find((lesson) => lesson.statusLabel === '待上课')
    const attendanceCount = asCount(pending.unsubmittedAttendance)
    const paperCount = asCount(pending.unpublishedPapers)
    const commentsCount = asCount(pending.unreadParentComments)
    const leaveCount = asCount(pending.pendingLeave)
    const studyHallCount = asCount(pending.pendingStudyHallAttendance) + asCount(pending.pendingStudyHallHomework)
    const messageCount = data.teacherMessageCount || 0
    const actionableCount = feedbackCount + studentFollowUpCount + attendanceCount + paperCount + commentsCount + leaveCount + studyHallCount + messageCount

    if (lessons.length) {
      const current = lessonInProgress || upcomingLesson || lessons[0]
      tasks.push({
        id: 'teacher-schedule',
        title: lessonInProgress ? '正在进行的课程' : '今日课程安排',
        detail: [current.startTime, current.courseName || current.groupName, current.statusLabel].filter(Boolean).join(' · ') + (lessons.length > 1 ? ' · 共 ' + lessons.length + ' 节' : ''),
        href: '/teacher/today-lessons',
        count: lessons.length,
        kind: 'schedule',
      })
    }
    if (attendanceCount) tasks.push({ id: 'teacher-attendance', title: '考勤待提交', detail: '课后完成考勤，保持课次记录完整', href: '/teacher/attendance', count: attendanceCount, kind: 'action' })
    if (feedbackCount) tasks.push({ id: 'teacher-feedback', title: '课堂反馈待发布', detail: feedbackTasks.find((task) => task.type === '课堂反馈')?.description || '把今天的课堂表现及时同步给家长', href: '/teacher/feedback', count: feedbackCount, kind: 'action' })
    if (studentFollowUpCount) {
      const firstFollowUp = studentFollowUps[0]
      tasks.push({
        id: 'teacher-student-follow-up',
        title: '学员反馈跟进',
        detail: firstFollowUp?.title
          ? `${firstFollowUp.title} 最近 7 天没有课堂反馈，建议查看学员档案。`
          : '有学员近期没有课堂反馈，建议查看学员档案。',
        href: firstFollowUp?.href || '/teacher/students',
        count: studentFollowUpCount,
        kind: 'action',
      })
    }
    if (messageCount) tasks.push({ id: 'teacher-messages', title: '家长留言待查看', detail: '打开留言，及时回应家长关心的问题', href: '/teacher/messages', count: messageCount, kind: 'message' })
    if (paperCount) tasks.push({ id: 'teacher-papers', title: '试卷待推送', detail: '检查内容后推送给对应家长', href: '/teacher/papers', count: paperCount, kind: 'action' })
    if (studyHallCount) tasks.push({ id: 'teacher-study-hall', title: '晚托任务待处理', detail: '考勤与作业记录还有待完成项', href: '/teacher/study-hall', count: studyHallCount, kind: 'action' })
    if (commentsCount) tasks.push({ id: 'teacher-comments', title: '学员互动有新内容', detail: '查看已关注的课堂讨论和表现留言', href: '/teacher/performance', count: commentsCount, kind: 'message' })
    if (leaveCount) tasks.push({ id: 'teacher-leave', title: '请假申请待处理', detail: '查看并处理学员请假申请', href: '/teacher/leave', count: leaveCount, kind: 'action' })

    const complete = actionableCount === 0 && !upcomingLesson && !lessonInProgress
    const summary = lessonInProgress
      ? '课程正在进行，结束后记得补齐考勤与课堂反馈。'
      : feedbackCount && studentFollowUpCount
        ? `今天有 ${feedbackCount} 节课次待发布反馈，另有 ${studentFollowUpCount} 位学员需要关注近期反馈记录。`
        : feedbackCount
          ? '还有 ' + feedbackCount + ' 节今日课次待发布反馈，完成后家长就能及时了解课堂情况。'
          : studentFollowUpCount
            ? `有 ${studentFollowUpCount} 位学员最近 7 天没有课堂反馈，建议查看学员档案并安排跟进。`
        : messageCount
          ? '有 ' + messageCount + ' 条家长留言待查看，及时回应能让沟通更顺畅。'
          : upcomingLesson
            ? '下一节 ' + (upcomingLesson.startTime || '') + ' 开始，今天共安排 ' + lessons.length + ' 节课程。'
            : complete
              ? '今天的教学任务都已完成，辛苦了。给自己留一点休息时间。'
              : '今天还有 ' + actionableCount + ' 项教学事项待处理，按顺序完成就好。'
    const recommendedAction: MascotActionId = lessonInProgress || upcomingLesson
      ? 'classStart'
      : actionableCount > 0
        ? 'confirm'
        : 'greatJob'
    return {
      title: '教师教学任务',
      summary,
      tasks,
      complete,
      pendingCount: actionableCount,
      recommendedAction,
    }
  }

  const metrics = data.adminDashboard?.metrics || {}
  const count = (key: string) => asCount(metrics[key])
  const dashboardPending = count('pendingTasks')
  const baseItems = [
    { id: 'admin-attendance', title: '考勤待审核', detail: '核对今日课次考勤', href: '/attendance', count: count('todayLessonsPendingAttendance'), kind: 'action' as const },
    { id: 'admin-replies', title: '家长留言待回复', detail: '优先回应家长发来的留言', href: '/communications', count: count('pendingTeacherReplies'), kind: 'message' as const },
    { id: 'admin-parent-reads', title: '留言待查看', detail: '查看尚未读过的家校沟通', href: '/communications', count: count('pendingParentReads'), kind: 'message' as const },
    { id: 'admin-feedback', title: '试卷待推送', detail: '检查未推送的学习资料', href: '/grades', count: count('unpublishedPapers'), kind: 'action' as const },
    { id: 'admin-intensive', title: '专项服务待处理', detail: '复核预约与专项审核', href: '/schedule/intensive', count: count('pendingIntensiveAppointments') + count('pendingIntensiveReviews'), kind: 'action' as const },
    { id: 'admin-makeup', title: '补课与续费跟进', detail: '查看待安排补课和续费提醒', href: '/schedule', count: count('pendingMakeups') + count('renewalWarnings'), kind: 'action' as const },
  ]
  tasks.push(...baseItems
    .filter((item) => item.count > 0)
    .map((item) => ({ ...item, kind: item.kind })))
  const unreadComments = count('unreadComments')
  if (unreadComments) {
    tasks.push({ id: 'admin-interactions', title: '家校互动有新内容', detail: '查看家长反馈与学员表现讨论', href: '/communications', count: unreadComments, kind: 'message' })
  }
  if (data.alerts.length) {
    const firstNotificationId = data.alerts.find((alert) => alert.notificationId)?.notificationId
    const notificationHref = firstNotificationId
      ? `/communications?notificationId=${encodeURIComponent(firstNotificationId)}`
      : '/communications'
    tasks.push({ id: 'admin-notices', title: '系统通知待查看', detail: data.alerts[0].title || '打开沟通中心查看', href: notificationHref, count: data.alerts.length, kind: 'message' })
  }
  const knownPendingCount = baseItems.reduce((total, item) => total + item.count, 0)
  const remainingCount = Math.max(0, dashboardPending - knownPendingCount)
  if (remainingCount) tasks.push({ id: 'admin-other', title: '其他运营事项', detail: '查看运营看板中的任务明细', href: '/dashboard', count: remainingCount, kind: 'action' })
  const pendingCount = dashboardPending + unreadComments + data.alerts.length
  const complete = pendingCount === 0 && data.alerts.length === 0

  return {
    title: '校区运营任务',
    summary: complete
      ? '校区今天暂无待处理事项，待办已经清零。辛苦了，可以稍作休息。'
      : '校区目前有 ' + pendingCount + ' 项待处理，建议先完成考勤审核和家长沟通。',
    tasks,
    complete,
    pendingCount,
    recommendedAction: complete ? 'greatJob' : 'confirm',
  }
}

function weatherLabel(weather: WeatherData | null): string {
  const today = weather?.days?.[0]
  if (!weather?.available || !today) return '新乐市天气暂不可用'
  return (weather.city || '新乐市') + ' · ' + (today.condition || '天气已更新')
    + (Number.isFinite(today.minTemp) && Number.isFinite(today.maxTemp) ? ' · ' + today.minTemp + '°～' + today.maxTemp + '°C' : '')
}

function compactWeatherLabel(weather: WeatherData | null): string {
  const today = weather?.days?.[0]
  const city = (weather?.city || '新乐市').replace(/市$/, '')
  if (!weather?.available || !today) return city + ' · 天气暂不可用'
  const temperature = Number.isFinite(today.minTemp) && Number.isFinite(today.maxTemp)
    ? ' ' + today.minTemp + '°～' + today.maxTemp + '°'
    : ''
  return city + ' · ' + (today.condition || '天气已更新') + temperature
}

function taskIcon(kind: BriefingTask['kind']) {
  if (kind === 'schedule') return <CalendarOutlined />
  if (kind === 'message') return <MessageOutlined />
  return <FileTextOutlined />
}

function displayTier(role: AssistantRole, data: AssistantBriefingData) {
  if (role === 'teacher') {
    const tier = resolveTier(data.teacherDashboard?.teacher?.tierLevel)
    return { label: TIER_THEME[tier].label, style: { background: TIER_THEME[tier].bg, borderColor: TIER_THEME[tier].border, color: TIER_THEME[tier].accent } }
  }
  return null
}

function ParentLevelBadges({ data }: { data: AssistantBriefingData }) {
  const students = (data.parentToday?.students || []).slice(0, 3)
  if (!students.length) return null
  return (
    <div className={styles.levelList} aria-label="关联学员等级">
      {students.map((entry, index) => {
        const student = entry.student
        if (!student?.id) return null
        const level = resolveMembership(student.membershipLevel)
        const theme = MEMBERSHIP_THEME[level]
        return (
          <span
            className={styles.levelBadge}
            key={student.id}
            title={(student.name || '学员') + ' · ' + theme.label}
            style={{ background: theme.bg, borderColor: theme.border, color: theme.text }}
          >
            {student.name || '学员'}{theme.badge ? ' · ' + theme.badge : ' · 普通'}
            {index === 2 && (data.parentToday?.students?.length || 0) > 3 ? ' +' + ((data.parentToday?.students?.length || 0) - 3) : ''}
          </span>
        )
      })}
    </div>
  )
}

function roleLabel(role: AssistantRole) {
  if (role === 'parent') return '家庭服务'
  if (role === 'teacher') return '教学工作台'
  return '管理中枢'
}

export function AssistantBriefingPreview({
  role,
  userName,
  data,
  actionId,
  attachmentSide,
  attachmentPosition,
  onCycleAction,
  onOpen,
  onNavigate,
  onDismiss,
}: {
  role: AssistantRole
  userName: string
  data: AssistantBriefingData
  actionId: MascotActionId
  attachmentSide: 'left' | 'right'
  attachmentPosition: 'top' | 'bottom'
  onCycleAction: () => void
  onOpen: () => void
  onNavigate: (href: string) => void
  onDismiss: () => void
}) {
  const now = useShanghaiNow()
  const content = useMemo(() => buildContent(role, data), [role, data])
  const clock = dateAndTime(now)
  const actionLabel = MASCOT_ACTIONS[actionId].label
  const primaryTask = data.available ? content.tasks[0] : undefined

  return (
    <section
      className={styles.preview}
      data-role={role}
      data-attachment-side={attachmentSide}
      data-attachment-position={attachmentPosition}
      aria-label="小牧今日提示"
    >
      <span className={styles.previewTail} aria-hidden="true" />
      <button
        type="button"
        className={styles.previewMascot}
        aria-label={'小牧正在做' + actionLabel + '动作，点击切换动作'}
        title="点小羊切换动作"
        onClick={onCycleAction}
      >
          <AssistantMascotImage actionId={actionId} size={54} crop />
      </button>
      <div className={styles.previewContent}>
        <div className={styles.previewHeading}>
          <strong>{userName || '小牧'}</strong>
          <span className={styles.previewRole}>{roleLabel(role)}</span>
          <button type="button" className={styles.dismiss} aria-label="收起今日提示" onClick={onDismiss} style={{ width: 32, height: 32, minHeight: 0, fontSize: 17 }}>×</button>
        </div>
        <p className={styles.previewSummary}>{content.summary}</p>
        <div className={styles.previewMeta}>
          <span>{clock.date.replace(/\d{4}年/, '')} {clock.time}</span>
          <span className={styles.metaDivider} />
          <span><CloudOutlined /> {compactWeatherLabel(data.weather)}</span>
        </div>
        <button
          type="button"
          className={styles.previewOpen}
          onClick={() => primaryTask ? onNavigate(taskHref(primaryTask.href)) : onOpen()}
          aria-label={primaryTask ? '打开' + primaryTask.title : '打开今日安排'}
        >
          <span>{primaryTask ? '处理优先事项' : data.loading ? '查看安排' : '打开今日安排'}</span>
          <ArrowRightOutlined />
        </button>
      </div>
    </section>
  )
}

export function AssistantBriefingPanel({
  role,
  userName,
  data,
  actionId,
  compact = false,
  onToggleCompact,
  onCycleAction,
  onNavigate,
  onRefresh,
}: {
  role: AssistantRole
  userName: string
  data: AssistantBriefingData
  actionId: MascotActionId
  compact?: boolean
  onToggleCompact?: () => void
  onCycleAction: () => void
  onNavigate: (href: string) => void
  onRefresh: () => void
}) {
  const now = useShanghaiNow()
  const content = useMemo(() => buildContent(role, data), [role, data])
  const clock = dateAndTime(now)
  const tier = displayTier(role, data)
  const weather = data.weather
  const weatherTip = weather?.available ? weather.tips?.[role] : ''
  const title = role === 'parent'
    ? '家长今日安排'
    : role === 'teacher'
      ? '教师教学任务'
      : '校区运营任务'

  // 四指标卡（家长端）：今日课次 / 本周出勤 / 待办动态 / 本周反馈
  const parentMetrics = (() => {
    if (role !== 'parent') return []
    const todayLessonCount = (data.parentToday?.students || [])
      .reduce((sum, student) => sum + (student.todaySchedules?.length || 0), 0)
    const weeklyStats = data.weeklyReport?.stats
    const attendanceRate = weeklyStats?.attendanceRate
    const pending = content.pendingCount
    const feedbackCount = weeklyStats?.feedbackCount ?? 0
    const totalSchedules = weeklyStats?.totalSchedules ?? 0
    return [
      { value: todayLessonCount, label: '今日课次', hint: todayLessonCount > 0 ? '今天' : '暂无课' },
      {
        value: attendanceRate != null ? attendanceRate + '%' : '—',
        label: '本周出勤',
        hint: attendanceRate != null ? (weeklyStats?.presentCount ?? 0) + '/' + totalSchedules : '待更新',
      },
      { value: pending, label: '待办动态', hint: pending > 0 ? '未读' : '已清零' },
      { value: feedbackCount, label: '本周反馈', hint: totalSchedules > 0 ? '共 ' + totalSchedules + ' 课' : '本周' },
    ]
  })()
  const teacherDashboard = role === 'teacher' ? data.teacherDashboard : null
  const teacherLessons = teacherDashboard?.todayLessons || []
  const teacherMetrics = teacherDashboard ? [
    { label: '今日课程', value: teacherLessons.length, hint: '节' },
    { label: '待考勤', value: asCount(teacherDashboard.pendingTasks?.unsubmittedAttendance), hint: '待提交' },
    { label: '待反馈', value: asCount(teacherDashboard.heroStats?.pendingFeedback ?? teacherDashboard.feedbackTasks?.filter((task) => (task.type || '').includes('反馈')).length), hint: '待发布' },
    { label: '家长留言', value: data.teacherMessageCount ?? 0, hint: '待查看' },
  ] : []
  const teacherWeeklyProgress = teacherDashboard?.weekCompletion
    ? [
        { label: '考勤', progress: teacherDashboard.weekCompletion.attendance },
        { label: '课堂反馈', progress: teacherDashboard.weekCompletion.classroomFeedback },
        { label: '家长沟通', progress: teacherDashboard.weekCompletion.parentMessages },
      ].filter((item) => item.progress)
    : []
  const parentStudents = role === 'parent' ? data.parentToday?.students || [] : []
  const parentFeedbackCount = role === 'parent'
    ? data.alerts.filter((alert) => /FEEDBACK/.test((alert.type || '').toUpperCase())).length
    : 0
  const parentMessageCount = role === 'parent'
    ? data.alerts.filter((alert) => (alert.type || '').toUpperCase() === 'MESSAGE').length
    : 0
  const adminDashboard = role === 'admin' ? data.adminDashboard : null
  const adminMetrics = adminDashboard?.metrics || {}
  const adminCount = (key: string) => asCount(adminMetrics[key])
  const adminMetricCards = adminDashboard ? [
    { label: '在读学员', value: adminCount('activeStudents'), hint: '当前在读' },
    { label: '今日课次', value: adminCount('todayLessons'), hint: `已完成 ${adminCount('todayLessonsCompleted')} 节` },
    { label: '待考勤', value: adminCount('todayLessonsPendingAttendance'), hint: '待审核课次' },
    { label: '待回复家长', value: adminCount('pendingTeacherReplies'), hint: '沟通待处理' },
  ] : []
  const adminTeacherFollowUps = (adminDashboard?.teacherCompliance || [])
    .filter((teacher) => asCount(teacher.pendingAttendance) + asCount(teacher.pendingFeedback) > 0)
    .sort((a, b) => asCount(b.pendingAttendance) + asCount(b.pendingFeedback) - asCount(a.pendingAttendance) - asCount(a.pendingFeedback))
    .slice(0, 3)

  return (
    <section
      className={[styles.panel, compact ? styles.panelCompact : ''].filter(Boolean).join(' ')}
      data-role={role}
      data-compact={compact || undefined}
    >
      <div className={styles.panelTop}>
        <div className={styles.panelHeading}>
          <span className={styles.roleLabel}>{roleLabel(role)}</span>
          <h2>{title}</h2>
          <p className={styles.greeting}>{userName && role !== 'parent' ? userName + '，' : ''}{greeting(now)}</p>
        </div>
        <button
          type="button"
          className={styles.panelMascot}
          aria-label={'小牧正在做' + MASCOT_ACTIONS[actionId].label + '动作，点击切换动作'}
          title="点小羊切换动作"
          onClick={onCycleAction}
        >
          <AssistantMascotImage actionId={actionId} size={74} />
          <span className={styles.actionHint}><SwapOutlined /> 换动作</span>
        </button>
      </div>

      <div className={styles.contextRow}>
        <span className={styles.contextDate}>{clock.date}</span>
        <span className={styles.contextTime}>{clock.time}</span>
        {tier && <span className={styles.tierBadge} style={tier.style}>{tier.label}</span>}
      </div>
      {role === 'parent' && <ParentLevelBadges data={data} />}
      <div className={styles.weatherRow}>
        <CloudOutlined />
        <span>{compact ? compactWeatherLabel(weather) : weatherLabel(weather)}</span>
        {weatherTip && <span className={styles.weatherTip}>{weatherTip}</span>}
      </div>

      {!data.loaded && (
        <div className={styles.loadingLine} role="status">正在读取今天的安排…</div>
      )}
      {data.loaded && !data.available && (
        <div className={styles.syncNotice} role="status">
          <span>任务信息没有同步完整，当前不能判断是否已完成。</span>
          <button type="button" onClick={onRefresh} disabled={data.loading}>
            <ReloadOutlined /> {data.loading ? '同步中' : '重新同步'}
          </button>
        </div>
      )}
      {data.loaded && data.available && (
        <>
          {parentMetrics.length > 0 && (
            <div className={styles.metricRow} aria-label="今日与本周汇总指标">
              {parentMetrics.map((metric) => (
                <div className={styles.metric} key={metric.label}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                  <em>{metric.hint}</em>
                </div>
              ))}
            </div>
          )}
          <p className={styles.summary}>{content.summary}</p>
          <div id="assistant-briefing-details" hidden={compact}>
            {content.complete ? (
              <div className={styles.completeState}>
                <CheckCircleFilled />
                <div>
                  <strong>今天的待办已完成</strong>
                  <span>{role === 'parent' ? '今天安排已看过，安心陪伴孩子。' : role === 'teacher' ? '辛苦了，给自己留一点休息时间。' : '校区待办已清零，辛苦了。'}</span>
                </div>
              </div>
            ) : (
              <div className={styles.taskList}>
                {content.tasks.length ? content.tasks.slice(0, 4).map((task) => (
                  <button
                    type="button"
                    className={styles.taskRow}
                    key={task.id}
                    onClick={() => onNavigate(taskHref(task.href))}
                  >
                    <span className={styles.taskIcon}>{taskIcon(task.kind)}</span>
                    <span className={styles.taskCopy}>
                      <strong>{task.title}</strong>
                      <span>{task.detail}</span>
                    </span>
                    {task.count !== undefined && <span className={styles.taskCount}>{task.count}</span>}
                    <ArrowRightOutlined className={styles.taskArrow} />
                  </button>
                )) : (
                  <div className={styles.loadingLine}>今天的安排已同步。</div>
                )}
              </div>
            )}
            {role === 'parent' && data.weeklyReport?.comment && (
              <div className={styles.weekSummary}>
                <strong><CalendarOutlined /> 本周小结</strong>
                <p>{data.weeklyReport.comment}</p>
              </div>
            )}
            {role === 'parent' && data.parentToday && (
              <section className={styles.parentWorkbench} aria-label="家庭今日学习安排">
                <div className={styles.teacherWorkbenchHeader}>
                  <div>
                    <strong>孩子今天的学习安排</strong>
                    <span>课程、任课老师与家校动态</span>
                  </div>
                  <button type="button" onClick={() => onNavigate('/parent/schedule')}>
                    查看课表 <ArrowRightOutlined />
                  </button>
                </div>

                {parentStudents.length ? (
                  <div className={styles.parentStudentList}>
                    {parentStudents.slice(0, 3).map((entry, index) => {
                      const student = entry.student
                      const schedules = entry.todaySchedules || []
                      const attendanceCount = entry.attendance?.length || 0
                      const membership = MEMBERSHIP_THEME[resolveMembership(student?.membershipLevel)]
                      return (
                        <article className={styles.parentStudentCard} key={student?.id || `${student?.name || 'student'}-${index}`}>
                          <div className={styles.parentStudentHeader}>
                            <div>
                              <strong>{student?.name || '孩子'}</strong>
                              <span>{[student?.grade || '年级未填写', student?.mainTeacherName ? `主带老师 ${student.mainTeacherName}` : ''].filter(Boolean).join(' · ')}</span>
                            </div>
                            <span className={styles.parentMembership} style={{ color: membership.accent, background: membership.bg, borderColor: membership.border }}>
                              {membership.badge || membership.label}
                            </span>
                          </div>

                          <div className={styles.parentStudentSignals}>
                            <span>{schedules.length ? `今日 ${schedules.length} 节课` : '今日无排课'}</span>
                            <span>{attendanceCount ? `${attendanceCount} 条考勤记录` : schedules.length ? '考勤尚未登记' : '学习安排已同步'}</span>
                            {asCount(entry.unreadNotifications) > 0 && <span className={styles.parentUnreadSignal}>{entry.unreadNotifications} 条未读通知</span>}
                            {asCount(entry.leaveThisWeek) > 0 && <span>{entry.leaveThisWeek} 次本周请假</span>}
                          </div>

                          {schedules.length ? (
                            <div className={styles.parentScheduleList}>
                              {schedules.slice(0, 2).map((schedule, scheduleIndex) => (
                                <button
                                  className={styles.parentScheduleRow}
                                  key={schedule.id || `${schedule.startTime}-${scheduleIndex}`}
                                  type="button"
                                  onClick={() => onNavigate('/parent/schedule')}
                                >
                                  <span className={styles.parentScheduleTime}>{formatTime(schedule.startTime) || '--:--'}</span>
                                  <span className={styles.parentScheduleCopy}>
                                    <strong>{schedule.courseName || schedule.subject || '课程安排'}</strong>
                                    <small>{[schedule.teacherName, schedule.roomName].filter(Boolean).join(' · ') || '课程详情'}</small>
                                  </span>
                                  <ArrowRightOutlined />
                                </button>
                              ))}
                              {schedules.length > 2 && <span className={styles.parentMoreSchedules}>另有 {schedules.length - 2} 节课程 · 查看完整课表</span>}
                            </div>
                          ) : (
                            <div className={styles.parentNoSchedule}>
                              <CalendarOutlined />
                              <span>今天没有排课，老师反馈或新通知会在更新后显示。</span>
                            </div>
                          )}
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <div className={styles.parentEmptyState}>
                    <span><strong>还没有关联学员</strong><small>绑定孩子后即可查看课程、考勤和老师反馈。</small></span>
                    <button type="button" onClick={() => onNavigate('/parent/bind')}>去绑定 <ArrowRightOutlined /></button>
                  </div>
                )}

                <div className={styles.parentFollowUpGrid}>
                  <button type="button" onClick={() => onNavigate('/parent/class-feedback')}>
                    <span>老师课堂反馈</span><strong>{parentFeedbackCount ? `${parentFeedbackCount} 条待查看` : '查看学习反馈'}</strong>
                  </button>
                  <button type="button" onClick={() => onNavigate('/parent/messages')}>
                    <span>家校沟通</span><strong>{parentMessageCount ? `${parentMessageCount} 条新回复` : '联系任课老师'}</strong>
                  </button>
                </div>
              </section>
            )}
            {teacherDashboard && (
              <section className={styles.teacherWorkbench} aria-label="教师今日工作台">
                <div className={styles.teacherWorkbenchHeader}>
                  <div>
                    <strong>今日教学工作台</strong>
                    <span>课程安排与课后闭环</span>
                  </div>
                  <button type="button" onClick={() => onNavigate('/teacher/schedule')}>
                    查看课表 <ArrowRightOutlined />
                  </button>
                </div>

                <div className={styles.teacherMetricRow} aria-label="教师今日任务汇总">
                  {teacherMetrics.map((metric) => (
                    <div className={styles.teacherMetric} key={metric.label}>
                      <strong>{metric.value}</strong>
                      <span>{metric.label}</span>
                      <em>{metric.hint}</em>
                    </div>
                  ))}
                </div>

                <div className={styles.teacherScheduleSection}>
                  <div className={styles.teacherSectionHeading}>
                    <strong>今日课程</strong>
                    <span>{teacherLessons.length ? `共 ${teacherLessons.length} 节` : '课表实时同步'}</span>
                  </div>
                  {teacherLessons.length ? (
                    <div className={styles.teacherLessonList}>
                      {teacherLessons.slice(0, 3).map((lesson, index) => (
                        <button
                          className={styles.teacherLessonRow}
                          key={lesson.id || `${lesson.startTime}-${index}`}
                          type="button"
                          onClick={() => onNavigate('/teacher/today-lessons')}
                        >
                          <span className={styles.teacherLessonTime}>{formatTime(lesson.startTime) || '--:--'}</span>
                          <span className={styles.teacherLessonCopy}>
                            <strong>{lesson.courseName || lesson.groupName || '课程安排'}</strong>
                            <span>{[lesson.groupName, lesson.room, lesson.studentCount ? `${lesson.studentCount} 位学员` : ''].filter(Boolean).join(' · ') || '查看课程详情'}</span>
                          </span>
                          <span className={styles.teacherLessonStatus}>{lesson.statusLabel || '今日课程'}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.teacherScheduleEmpty}>
                      <CalendarOutlined />
                      <span><strong>今天暂时没有排课</strong><small>可先整理反馈，课前查看本周课表。</small></span>
                    </div>
                  )}
                </div>

                {teacherWeeklyProgress.length > 0 && (
                  <div className={styles.teacherProgressSection}>
                    <div className={styles.teacherSectionHeading}>
                      <strong>本周教学进度</strong>
                      <span>持续完成教学闭环</span>
                    </div>
                    <div className={styles.teacherProgressGrid}>
                      {teacherWeeklyProgress.map(({ label, progress }) => {
                        const total = asCount(progress?.total)
                        const done = Math.min(total, asCount(progress?.done))
                        const percent = total > 0
                          ? Math.max(0, Math.min(100, Number(progress?.percent) || Math.round((done / total) * 100)))
                          : 0
                        return (
                          <div className={styles.teacherProgressCard} key={label}>
                            <div><span>{label}</span><strong>{total ? `${percent}%` : '—'}</strong></div>
                            <span className={styles.teacherProgressTrack} aria-hidden="true"><i style={{ width: `${percent}%` }} /></span>
                            <small>{total ? `${done}/${total} 项完成` : '暂无记录'}</small>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className={styles.teacherFeedbackTip}>
                  <span aria-hidden="true">✦</span>
                  <div><strong>课后反馈小技巧</strong><p>按“课堂重点 · 学员表现 · 下一步建议”记录，家长更容易理解和配合。</p></div>
                </div>
              </section>
            )}
            {adminDashboard && (
              <section className={styles.adminWorkbench} aria-label="校区运营今日工作台">
                <div className={styles.teacherWorkbenchHeader}>
                  <div>
                    <strong>校区运营 · 今日重点</strong>
                    <span>教学进度、家长沟通与跟进提醒</span>
                  </div>
                  <button type="button" onClick={() => onNavigate('/dashboard')}>
                    运营看板 <ArrowRightOutlined />
                  </button>
                </div>

                <div className={styles.adminMetricRow} aria-label="校区运营核心指标">
                  {adminMetricCards.map((metric) => (
                    <div className={styles.teacherMetric} key={metric.label}>
                      <strong>{metric.value}</strong>
                      <span>{metric.label}</span>
                      <em>{metric.hint}</em>
                    </div>
                  ))}
                </div>

                <div className={styles.teacherScheduleSection}>
                  <div className={styles.teacherSectionHeading}>
                    <strong>教师课次跟进</strong>
                    <span>{adminTeacherFollowUps.length ? '优先查看待办教师' : '今日记录状态'}</span>
                  </div>
                  {adminTeacherFollowUps.length ? (
                    <div className={styles.adminTeacherList}>
                      {adminTeacherFollowUps.map((teacher, index) => (
                        <button className={styles.adminTeacherRow} key={teacher.teacherId || `${teacher.name || 'teacher'}-${index}`} type="button" onClick={() => onNavigate('/daily-class')}>
                          <span className={styles.adminTeacherAvatar}>{(teacher.name || '师').slice(0, 1)}</span>
                          <span className={styles.adminTeacherCopy}>
                            <strong>{teacher.name || '任课教师'}</strong>
                            <small>今日 {asCount(teacher.todayLessons)} 节课 · 考勤待办 {asCount(teacher.pendingAttendance)} · 反馈待办 {asCount(teacher.pendingFeedback)}</small>
                          </span>
                          <ArrowRightOutlined />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.teacherScheduleEmpty}>
                      <CheckCircleFilled />
                      <span><strong>教师课次记录正常</strong><small>暂时没有待跟进的考勤或课堂反馈。</small></span>
                    </div>
                  )}
                </div>

                <div className={styles.adminActionGrid}>
                  <button type="button" onClick={() => onNavigate('/communications')}>
                    <span>家长留言待回复</span><strong>{adminCount('pendingTeacherReplies')} 条待回复</strong>
                  </button>
                  <button type="button" onClick={() => onNavigate('/schedule')}>
                    <span>补课与续费</span><strong>补课 {adminCount('pendingMakeups')} · 续费提醒 {adminCount('renewalWarnings')}</strong>
                  </button>
                </div>
              </section>
            )}
          </div>
        </>
      )}
      <div className={styles.panelFooter}>
        <span>{content.pendingCount > 0 ? '待处理 ' + content.pendingCount + ' 项' : data.available ? '状态已同步' : '等待同步'}</span>
        <div className={styles.footerActions}>
          {onToggleCompact && (
            <button
              type="button"
              onClick={onToggleCompact}
              aria-expanded={!compact}
              aria-controls={data.loaded && data.available ? 'assistant-briefing-details' : undefined}
              aria-label={compact ? '展开今日任务详情' : '收起今日任务详情'}
            >
              {compact ? <DownOutlined /> : <UpOutlined />}
              {compact ? '展开详情' : '收起详情'}
            </button>
          )}
          <button type="button" onClick={onRefresh} disabled={data.loading} aria-label="刷新今日任务">
            <ReloadOutlined /> {data.loading ? '同步中' : '刷新'}
          </button>
        </div>
      </div>
    </section>
  )
}

export function useAssistantMascotAction(role: AssistantRole, data: AssistantBriefingData) {
  const content = useMemo(() => buildContent(role, data), [role, data])
  const [manualAction, setManualAction] = useState<MascotActionId | null>(null)
  const actionId = manualAction || content.recommendedAction
  const cycleAction = useCallback(() => {
    const actions = ROLE_ACTIONS[role]
    const currentIndex = actions.indexOf(actionId)
    setManualAction(actions[(currentIndex + 1) % actions.length])
  }, [actionId, role])
  useEffect(() => setManualAction(null), [role])
  return { actionId, cycleAction, resetAction: () => setManualAction(null) }
}
