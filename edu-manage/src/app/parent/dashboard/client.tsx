'use client'

import { useEffect, useMemo, useState } from 'react'
import { BellOutlined, BookOutlined, BulbOutlined, FileTextOutlined, HeartOutlined, RiseOutlined, SmileOutlined, StarOutlined } from '@ant-design/icons'
import { Button, Tag, Typography } from 'antd'
import { format } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import { fillName, MEMBERSHIP_SERVICE_CARD, MEMBERSHIP_WELCOME, resolveMembership } from '@/constants/membership'
import { getDailyQuote } from '@/data/daily-quotes'
import { MessageWorkflowNotice } from '@/components/MessageWorkflowNotice'
import { ParentTodayTimeline } from '@/components/Parent/ParentTodayTimeline'
import { ParentUsageGuide } from '@/components/Parent/ParentUsageGuide'
import { WeeklyReport } from '@/components/Parent/WeeklyReport'
import { buildParentTodayTimeline } from '@/lib/dashboard-workflows'
import type { getParentDashboardData } from '@/lib/parent-dashboard'

const { Text } = Typography

type JsonValue<T> = T extends Date
  ? string
  : T extends readonly (infer Item)[]
    ? JsonValue<Item>[]
    : T extends object
      ? { [Key in keyof T]: JsonValue<T[Key]> }
      : T
type DashboardData = JsonValue<Awaited<ReturnType<typeof getParentDashboardData>>>
type LegacySchedule = {
  id: string
  title: string
  startTime: string
  endTime: string
  teacherName?: string | null
  roomName?: string | null
  studentIds?: string[]
  studentNames?: string[]
  attendanceSubmittedAt?: string | null
}
type DashboardProps = Omit<DashboardData, 'todaySchedules'> & { todaySchedules: LegacySchedule[] }
type DashboardNotification = DashboardProps['notifications'][number]

const MOOD_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  GREAT: { bg: 'var(--color-success-bg)', color: 'var(--color-success)', label: '棒' },
  GOOD: { bg: '#EEEDFE', color: 'var(--color-brand-secure)', label: '好' },
  OKAY: { bg: '#FAEEDA', color: 'var(--color-warning-text)', label: '一般' },
  NEEDS_ATTENTION: { bg: '#FCEBEB', color: 'var(--color-error)', label: '关注' },
}

const NOTIFICATION_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  EXAM_PAPER: { icon: <FileTextOutlined />, color: '#185FA5', bg: '#eaf1f9' },
  PAPER_PUBLISHED: { icon: <FileTextOutlined />, color: '#185FA5', bg: '#eaf1f9' },
  CLASSROOM_FEEDBACK: { icon: <BookOutlined />, color: 'var(--color-brand-secure)', bg: '#f0eeff' },
  PARENT_MESSAGE: { icon: <BellOutlined />, color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
  PARENT_MESSAGE_REPLY: { icon: <BellOutlined />, color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
  PERFORMANCE_FEEDBACK: { icon: <StarOutlined />, color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
  SYSTEM: { icon: <BellOutlined />, color: 'var(--color-ink-muted)', bg: 'var(--color-surface-3)' },
}

const MEMBERSHIP_HERO_THEME = {
  NORMAL: { background: 'var(--color-primary)', badgeBg: 'rgba(255,255,255,.22)', statBg: 'rgba(255,255,255,.14)', quoteBg: 'rgba(255,255,255,.14)' },
  VIP: { background: '#C96D3E', badgeBg: 'rgba(255,255,255,.24)', statBg: 'rgba(255,255,255,.16)', quoteBg: 'rgba(255,255,255,.16)' },
  SVIP: { background: '#123C35', badgeBg: 'rgba(255,255,255,.16)', statBg: 'rgba(255,255,255,.12)', quoteBg: 'rgba(255,255,255,.12)' },
} as const

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

export function ParentDashboardClient({
  parentUserId,
  students,
  studentTeachers,
  todaySchedules,
  todayClassLessons,
  notifications,
  latestPost,
  latestClassroomFeedback,
  monthMoods,
  monthClassroomFeedbacks,
  attendanceRate,
  studentStats = {},
  todayAttendances = [],
  todayFeedbacks = [],
}: DashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const today = new Date()
  const dailyQuote = getDailyQuote()
  const childIdFromUrl = searchParams.get('childId') || ''
  const [activeChildId, setActiveChildId] = useState(childIdFromUrl || students[0]?.id || '')
  const [welcomeMounted, setWelcomeMounted] = useState(false)
  const [welcomeVisible, setWelcomeVisible] = useState(false)
  const [weeklyReady, setWeeklyReady] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setWeeklyReady(true), 1_400)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (childIdFromUrl) setActiveChildId(childIdFromUrl)
    else if (!activeChildId && students[0]?.id) setActiveChildId(students[0].id)
  }, [activeChildId, childIdFromUrl, students])

  const activeStudent = useMemo(
    () => students.find(student => student.id === activeChildId) || students[0],
    [activeChildId, students],
  )
  const membershipLevel = resolveMembership(activeStudent?.membershipLevel)
  const heroTheme = MEMBERSHIP_HERO_THEME[membershipLevel]

  useEffect(() => {
    if (!activeStudent?.id) return
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

  const activeTeacherNames = activeStudent?.id ? studentTeachers[activeStudent.id] || [] : []
  const teacherDisplay = activeTeacherNames.length ? activeTeacherNames.join('、') : '待分配'
  const activeStats = activeChildId ? studentStats[activeChildId] : null
  const activeAttendanceRate = activeStats?.attendanceRate ?? attendanceRate

  const rawTodayLessons = [
    ...todaySchedules.map(schedule => ({
      id: schedule.id,
      title: schedule.title,
      startTime: schedule.startTime ? new Date(schedule.startTime).toTimeString().slice(0, 5) : '',
      endTime: schedule.endTime ? new Date(schedule.endTime).toTimeString().slice(0, 5) : '',
      teacherName: schedule.teacherName,
      roomName: schedule.roomName,
      studentIds: schedule.studentIds || [],
      studentNames: schedule.studentNames || [],
      startTimeRaw: schedule.startTime,
      endTimeRaw: schedule.endTime,
      attendanceSubmittedAt: schedule.attendanceSubmittedAt,
    })),
    ...todayClassLessons.map(lesson => ({
      id: lesson.id,
      title: lesson.title,
      startTime: lesson.startTime || '',
      endTime: lesson.endTime || '',
      teacherName: lesson.teacherName,
      roomName: lesson.roomName,
      studentIds: lesson.studentIds || [],
      studentNames: lesson.studentNames || [],
      startTimeRaw: lesson.startTimeRaw,
      endTimeRaw: lesson.endTimeRaw,
      attendanceSubmittedAt: lesson.attendanceSubmittedAt,
    })),
  ].sort((a, b) => a.startTime.localeCompare(b.startTime))
  const todayLessons = rawTodayLessons.filter(lesson => students.length <= 1 || !activeChildId || lesson.studentIds.includes(activeChildId))
  const activeNotifications = students.length <= 1 || !activeChildId
    ? notifications
    : notifications.filter(notification => !notification.studentId || notification.studentId === activeChildId)
  const activeTodayFeedbacks = students.length <= 1 || !activeChildId
    ? todayFeedbacks
    : todayFeedbacks.filter(feedback => feedback.studentIds?.includes(activeChildId))
  const unreadCount = activeNotifications.filter(notification => !notification.read).length
  const timeline = buildParentTodayTimeline({ lessons: todayLessons, feedbacks: activeTodayFeedbacks, notifications: activeNotifications, now: today })
  const activeLesson = todayLessons.find(lesson => lessonStatus(lesson) === '上课中')
  const pendingLesson = todayLessons.find(lesson => lessonStatus(lesson) === '待老师确认')
  const nextLesson = todayLessons.find(lesson => lessonStatus(lesson) === '待上课')
  const todayStatus = !todayLessons.length ? '今日暂无课程' : activeLesson ? '上课中' : pendingLesson ? '待老师确认' : nextLesson ? '待上课' : '今日课程已完成'
  const activeTodayAttendances = students.length <= 1 || !activeChildId
    ? todayAttendances
    : todayAttendances.filter(attendance => attendance.studentId === activeChildId)
  const latestTimes = [latestPost?.createdAt, latestClassroomFeedback?.createdAt, activeNotifications[0]?.createdAt, ...activeTodayAttendances.map(item => item.createdAt)]
    .filter((value): value is string => Boolean(value)).map(value => new Date(value).getTime())
  const latestUpdate = latestTimes.length ? new Date(Math.max(...latestTimes)).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '暂无更新'

  const moodMap: Record<number, { mood: string; ids: string[] }> = {}
  monthMoods.forEach(mood => {
    const day = new Date(mood.createdAt).getDate()
    if (!moodMap[day]) moodMap[day] = { mood: mood.mood, ids: [] }
    moodMap[day].ids.push(mood.id)
  })
  monthClassroomFeedbacks.forEach(feedback => {
    const day = new Date(feedback.createdAt).getDate()
    if (!moodMap[day]) moodMap[day] = { mood: 'GOOD', ids: [] }
    moodMap[day].ids.push(feedback.id)
  })
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const emptyDays = (new Date(today.getFullYear(), today.getMonth(), 1).getDay() || 7) - 1

  const activeLatestPost = students.length <= 1 || !activeChildId || latestPost?.studentId === activeChildId ? latestPost : null
  const activeLatestClassroomFeedback = students.length <= 1 || !activeChildId || latestClassroomFeedback?.studentIds?.includes?.(activeChildId) ? latestClassroomFeedback : null
  const feedbackItems: Array<{ type: string; teacherName: string; studentName: string; content: string; date: Date; mood?: string; id: string }> = []
  if (activeLatestPost) feedbackItems.push({ type: '表现反馈', teacherName: activeLatestPost.teacher?.name || '老师', studentName: activeLatestPost.student?.name || '', content: activeLatestPost.content, date: new Date(activeLatestPost.createdAt), mood: activeLatestPost.mood, id: activeLatestPost.id })
  if (activeLatestClassroomFeedback) feedbackItems.push({ type: '课堂反馈', teacherName: activeLatestClassroomFeedback.teacher?.name || '老师', studentName: '', content: activeLatestClassroomFeedback.overallComment || activeLatestClassroomFeedback.summary || activeLatestClassroomFeedback.lessonContent || '课堂反馈已更新', date: new Date(activeLatestClassroomFeedback.createdAt), id: activeLatestClassroomFeedback.id })
  feedbackItems.sort((a, b) => b.date.getTime() - a.date.getTime())
  const latestFeedback = feedbackItems[0] || null

  const selectStudent = (studentId: string) => {
    setActiveChildId(studentId)
    const params = new URLSearchParams(window.location.search)
    params.set('childId', studentId)
    window.history.replaceState({}, '', `?${params.toString()}`)
  }
  const goCalendarDay = (day: number) => {
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    router.push(`/parent/archive?date=${date}`)
  }
  const openNotification = (notification: DashboardNotification) => {
    if (notification.relatedType === 'EXAM_PAPER' && notification.relatedId) return router.push(`/parent/archive?paperId=${notification.relatedId}`)
    router.push(notification.href || `/parent/notifications/${notification.id}`)
  }

  return (
    <div className="parent-dashboard-home">
      <MessageWorkflowNotice audience="parent" deferMs={1_400} />
      <ParentUsageGuide parentUserId={parentUserId} />

      {welcomeMounted && <div className={`parent-dashboard-welcome${welcomeVisible ? ' is-visible' : ''}`}><div><strong>{fillName(MEMBERSHIP_WELCOME[membershipLevel].title, activeStudent?.name || '牧哲学堂')}</strong><span>{MEMBERSHIP_WELCOME[membershipLevel].body}</span><small>牧哲学堂 · 把每一个孩子，当成自己的孩子来教</small></div></div>}

      {students.length > 1 && <div className="parent-child-switcher">{students.map(student => <button type="button" key={student.id} className={student.id === activeChildId ? 'is-active' : ''} onClick={() => selectStudent(student.id)}>{student.name}{student.grade ? ` · ${student.grade}` : ''}</button>)}</div>}

      <section className="parent-dashboard-hero" style={{ background: heroTheme.background }}>
        <div className="parent-dashboard-hero__identity"><div style={{ background: heroTheme.badgeBg }}>{(activeStudent?.name || '牧')[0]}</div><span><strong>{activeStudent?.name || '牧哲学堂同学'}</strong><small>{activeStudent?.grade || '未填写年级'} · 负责老师 {teacherDisplay}</small></span></div>
        <div className="parent-dashboard-hero__quote" style={{ background: heroTheme.quoteBg }}><BulbOutlined />「{dailyQuote.text}」</div>
        <div className="parent-dashboard-hero__stats">{[
          { value: todayLessons.length, label: '今日课次' },
          { value: `${Number(activeAttendanceRate) || 0}%`, label: '本月出勤' },
          { value: unreadCount, label: '待处理通知' },
        ].map(item => <div key={item.label} style={{ background: heroTheme.statBg }}><strong>{item.value}</strong><span>{item.label}</span></div>)}</div>
        <div className="parent-dashboard-hero__status"><span>今日状态：<strong>{todayStatus}</strong></span><span>更新于 {latestUpdate}</span></div>
        {activeStudent?.id && <Button icon={<RiseOutlined />} onClick={() => router.push(`/parent/students/${activeStudent.id}/growth-report`)}>查看成长档案</Button>}
      </section>

      <ParentTodayTimeline events={timeline} studentName={activeStudent?.name || '孩子'} />

      {(membershipLevel === 'VIP' || membershipLevel === 'SVIP') && (() => { const service = MEMBERSHIP_SERVICE_CARD[membershipLevel]; return <section className="parent-dashboard-section parent-membership-service"><h2>{service.title}</h2><p>{service.body}</p><p>{service.hotlineLabel}：<strong>{service.hotline}</strong></p><small>{service.footer}</small></section> })()}

      {weeklyReady && <WeeklyReport activeChildId={activeChildId} />}

      <section className="parent-dashboard-section" aria-labelledby="parent-mood-title">
        <div className="parent-dashboard-section__head"><h2 id="parent-mood-title"><SmileOutlined /> 本月情绪日历</h2></div>
        <div className="parent-mood-grid">{['一', '二', '三', '四', '五', '六', '日'].map(day => <div key={day} className="is-heading">{day}</div>)}{Array.from({ length: emptyDays }, (_, index) => <div key={`empty-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => index + 1).map(day => { const mood = moodMap[day]; const colors = mood ? MOOD_COLORS[mood.mood] : null; return <button type="button" key={day} disabled={!mood} className={day === today.getDate() ? 'is-today' : ''} style={{ background: colors?.bg, color: colors?.color }} onClick={() => goCalendarDay(day)}>{day}</button> })}</div>
        <div className="parent-mood-legend">{Object.entries(MOOD_COLORS).map(([key, colors]) => <span key={key}><i style={{ background: colors.bg }} />{colors.label}</span>)}<span><i />无记录</span></div>
      </section>

      <section className="parent-dashboard-section" aria-labelledby="parent-latest-feedback-title">
        <div className="parent-dashboard-section__head"><h2 id="parent-latest-feedback-title">老师最新关注</h2>{latestFeedback && <button type="button" onClick={() => router.push('/parent/archive')}>查看全部</button>}</div>
        {latestFeedback ? <button type="button" className="parent-latest-feedback" onClick={() => router.push(`/parent/archive?feedbackId=${latestFeedback.id}`)}><span>{latestFeedback.type === '课堂反馈' ? <BookOutlined /> : <HeartOutlined />}</span><div><div><strong>{latestFeedback.teacherName}</strong><Tag>{latestFeedback.type}</Tag><small>{latestFeedback.date.toLocaleString('zh-CN')}</small></div>{latestFeedback.studentName && <small>学员：{latestFeedback.studentName}</small>}<p>{latestFeedback.content}</p></div></button> : <Text type="secondary">暂无反馈，老师会在课后更新学习情况。</Text>}
      </section>

      <section className="parent-dashboard-section" aria-labelledby="parent-notifications-title">
        <div className="parent-dashboard-section__head"><h2 id="parent-notifications-title">待办与通知</h2><button type="button" onClick={() => router.push('/parent/notifications')}>查看全部</button></div>
        {activeNotifications.length ? <div className="parent-notice-list">{activeNotifications.slice(0, 3).map(notification => { const meta = NOTIFICATION_META[notification.relatedType || ''] || NOTIFICATION_META[notification.type] || NOTIFICATION_META.SYSTEM; return <button type="button" key={notification.id} onClick={() => openNotification(notification)}><span style={{ color: notification.read ? 'var(--color-ink-subtle)' : meta.color, background: notification.read ? 'var(--color-surface-3)' : meta.bg }}>{meta.icon}</span><div><strong>{notification.title}</strong><small>{new Date(notification.createdAt).toLocaleString('zh-CN')}</small></div>{!notification.read && <i />}</button> })}</div> : <Text type="secondary">暂无通知</Text>}
      </section>
    </div>
  )
}
