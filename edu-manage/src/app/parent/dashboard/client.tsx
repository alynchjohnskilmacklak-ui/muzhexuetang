'use client'

import { useEffect, useMemo, useState } from 'react'
import { BellOutlined, BookOutlined, BulbOutlined, FileTextOutlined, HeartOutlined, RiseOutlined, StarOutlined } from '@ant-design/icons'
import { Button, Tag, Typography } from 'antd'
import { format } from 'date-fns'
import { useRouter, useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { fillName, MEMBERSHIP_BENEFITS, MEMBERSHIP_HERO_THEME, MEMBERSHIP_THEME, MEMBERSHIP_UPGRADE, MEMBERSHIP_WELCOME, PARENT_ACTIVE_CHILD_COOKIE, resolveMembership, type MembershipLevel } from '@/constants/membership'
import { getDailyQuote } from '@/data/daily-quotes'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'
import { MessageWorkflowNotice } from '@/components/MessageWorkflowNotice'
import { WeatherHeroStrip } from '@/components/Common/WeatherHeroStrip'
import { ParentTodayPanel } from '@/components/Parent/ParentTodayPanel'
import { WeeklyReport } from '@/components/Parent/WeeklyReport'
import { ParentLessonPreview } from '@/components/Parent/ParentLessonPreview'
import type { getParentDashboardData } from '@/lib/parent-dashboard'

const { Text } = Typography
const fetcher = (url: string) => fetch(url).then((response) => {
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
type DashboardProps = Omit<DashboardData, 'todaySchedules'> & { todaySchedules: LegacySchedule[]; initialActiveChildId?: string }
type DashboardNotification = DashboardProps['notifications'][number]

const NOTIFICATION_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  EXAM_PAPER: { icon: <FileTextOutlined />, color: '#185FA5', bg: '#eaf1f9' },
  PAPER_PUBLISHED: { icon: <FileTextOutlined />, color: '#185FA5', bg: '#eaf1f9' },
  CLASSROOM_FEEDBACK: { icon: <BookOutlined />, color: 'var(--color-brand-secure)', bg: '#f0eeff' },
  PARENT_MESSAGE: { icon: <BellOutlined />, color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
  PARENT_MESSAGE_REPLY: { icon: <BellOutlined />, color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
  PERFORMANCE_FEEDBACK: { icon: <StarOutlined />, color: 'var(--color-primary)', bg: 'var(--color-primary-bg)' },
  SYSTEM: { icon: <BellOutlined />, color: 'var(--color-ink-muted)', bg: 'var(--color-surface-3)' },
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

function rememberParentChild(studentId: string, level: MembershipLevel) {
  document.cookie = `${PARENT_ACTIVE_CHILD_COOKIE}=${encodeURIComponent(studentId)}; Path=/parent; Max-Age=7776000; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`
  window.dispatchEvent(new CustomEvent<MembershipLevel>('parent-theme-change', { detail: level }))
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
  initialActiveChildId,
  studentTeachers,
  studentTopTeacher,
  todaySchedules,
  todayClassLessons,
  notifications,
  latestPost,
  latestClassroomFeedback,
  latestFeedbackByStudent = {},
  monthMoods,
  monthClassroomFeedbacks,
  attendanceRate,
  studentStats = {},
  classHoursByStudent: _classHoursByStudent = {},
  todayAttendances = [],
  todayFeedbacks = [],
  lessonPreviews = [],
}: DashboardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const today = new Date()
  const dailyQuote = getDailyQuote()
  const childIdFromUrl = searchParams.get('childId') || ''
  const [activeChildId, setActiveChildId] = useState(childIdFromUrl || initialActiveChildId || students[0]?.id || '')
  const [welcomeMounted, setWelcomeMounted] = useState(false)
  const [welcomeVisible, setWelcomeVisible] = useState(false)
  const [weeklyReady, setWeeklyReady] = useState(false)
  const { data: unreadData } = useSWR('/api/parent/unread-counts', fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })

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
  const topTeacher = activeStudent?.id ? studentTopTeacher?.[activeStudent.id] : null
  const topTier = topTeacher?.tierLevel ? resolveTier(topTeacher.tierLevel) : null
  const topTierLabel = topTier ? TIER_THEME[topTier].label : ''
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
  const visibleUnreadCount = activeNotifications.filter(notification => !notification.read).length
  const unreadCount = Number(unreadData?.notifications ?? visibleUnreadCount)
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

  const activeLatestPost = students.length <= 1 || !activeChildId || latestPost?.studentId === activeChildId ? latestPost : null
  // 课堂反馈按当前孩子取"最近一条有效反馈"（服务端已按孩子分组，切换孩子不再变空）
  const activeLatestClassroomFeedback = students.length <= 1 || !activeChildId
    ? (latestFeedbackByStudent[students[0]?.id || ''] || null)
    : (latestFeedbackByStudent[activeChildId] || null)
  const seenIds = new Set<string>()
  if (activeLatestPost) seenIds.add(activeLatestPost.id)
  const feedbackItems: Array<{ type: string; teacherName: string; studentName: string; content: string; date: Date; lessonDate?: string | null; subject?: string | null; id: string }> = []
  if (activeLatestPost) feedbackItems.push({ type: '表现反馈', teacherName: activeLatestPost.teacher?.name || '老师', studentName: activeLatestPost.student?.name || '', content: activeLatestPost.content, date: new Date(activeLatestPost.createdAt), id: activeLatestPost.id })
  if (activeLatestClassroomFeedback && !seenIds.has(activeLatestClassroomFeedback.id)) {
    seenIds.add(activeLatestClassroomFeedback.id)
    feedbackItems.push({
      type: '课堂反馈',
      teacherName: activeLatestClassroomFeedback.teacherName || '老师',
      studentName: '',
      content: activeLatestClassroomFeedback.summary || '课堂反馈已更新',
      date: new Date(activeLatestClassroomFeedback.createdAt),
      lessonDate: activeLatestClassroomFeedback.lessonDate || null,
      subject: activeLatestClassroomFeedback.subject || null,
      id: activeLatestClassroomFeedback.id,
    })
  }
  activeTodayFeedbacks.forEach(feedback => {
    if (seenIds.has(feedback.id)) return
    seenIds.add(feedback.id)
    feedbackItems.push({
      type: '课堂反馈',
      teacherName: feedback.teacherName || '老师',
      studentName: '',
      content: feedback.summary || '课堂反馈已更新',
      date: new Date(feedback.createdAt),
      id: feedback.id,
    })
  })
  feedbackItems.sort((a, b) => b.date.getTime() - a.date.getTime())
  const latestFeedback = feedbackItems[0] || null

  const selectStudent = (studentId: string) => {
    setActiveChildId(studentId)
    const picked = students.find(st => st.id === studentId)
    if (picked) rememberParentChild(picked.id, resolveMembership(picked.membershipLevel))
    const params = new URLSearchParams(window.location.search)
    params.set('childId', studentId)
    window.history.replaceState({}, '', `?${params.toString()}`)
  }
  const openNotification = (notification: DashboardNotification) => {
    if (notification.relatedType === 'EXAM_PAPER' && notification.relatedId) return router.push(`/parent/archive?paperId=${notification.relatedId}`)
    router.push(notification.href || `/parent/notifications/${notification.id}`)
  }

  useEffect(() => {
    if (!activeStudent?.id) return
    const timer = window.setTimeout(() => rememberParentChild(activeStudent.id, membershipLevel), 0)
    return () => window.clearTimeout(timer)
  }, [activeStudent?.id, membershipLevel])

  return (
    <div className={`parent-dashboard-home parent-dashboard-home--${membershipLevel.toLowerCase()}`}>
      <MessageWorkflowNotice audience="parent" deferMs={1_400} />

      {welcomeMounted && <div className={`parent-dashboard-welcome${welcomeVisible ? ' is-visible' : ''}`}><div><strong>{fillName(MEMBERSHIP_WELCOME[membershipLevel].title, activeStudent?.name || '牧哲学堂')}</strong><span>{MEMBERSHIP_WELCOME[membershipLevel].body}</span><small>牧哲学堂 · 把每一个孩子，当成自己的孩子来教</small></div></div>}

      {students.length > 1 && <div className="parent-child-switcher">{students.map(student => <button type="button" key={student.id} className={student.id === activeChildId ? 'is-active' : ''} onClick={() => selectStudent(student.id)}>{student.name}{student.grade ? ` · ${student.grade}` : ''}{student.termName ? <em className="parent-child-switcher__term">· {student.termName.replace(/^牧哲学堂/, '').replace(/批次$/, '')}</em> : null}</button>)}</div>}

      <section className="parent-dashboard-hero" style={{ background: heroTheme.background, border: heroTheme.border, boxShadow: heroTheme.shadow, position: 'relative', overflow: 'hidden' }}>
        {heroTheme.shine && <div style={{ position: 'absolute', top: '-45%', right: '-12%', width: 190, height: 270, background: 'radial-gradient(circle, rgba(255,255,255,.17), transparent 70%)', transform: 'rotate(12deg)', pointerEvents: 'none' }} />}
        <div className="parent-dashboard-hero__identity"><div style={{ background: heroTheme.badgeBg }}>{(activeStudent?.name || '牧')[0]}</div><span><span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><strong>{activeStudent?.name || '牧哲学堂同学'}</strong>{membershipLevel !== 'NORMAL' && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: membershipLevel === 'SVIP' ? '#123C35' : '#fff', background: membershipLevel === 'SVIP' ? 'linear-gradient(135deg,#C9A45C,#A8873D)' : 'rgba(255,255,255,.26)' }}>{membershipLevel === 'SVIP' ? '👑 SVIP' : '👑 VIP'}</span>}</span><small className="parent-hero-teacher-line">
            <span className="parent-hero-teacher-prefix">{activeStudent?.grade || '未填写年级'} · 负责老师</span>
            <span className="parent-hero-teacher-name-row">
              <span className="parent-hero-teacher-name">{topTeacher?.name || '待分配'}</span>
              {topTierLabel && <span className={`parent-hero-teacher-tag parent-hero-teacher-tag--${String(topTier).toLowerCase()}`}>{topTierLabel}</span>}
            </span>
          </small></span></div>
        <div className="parent-dashboard-hero__quote" style={{ background: heroTheme.quoteBg }}>
          <BulbOutlined style={{ flex: '0 0 auto', marginTop: 3 }} />
          <div className="parent-dashboard-hero__quote-body">
            <span className="parent-dashboard-hero__quote-text">「{dailyQuote.text}」</span>
            <span className="parent-dashboard-hero__quote-source">—— {dailyQuote.source}</span>
          </div>
        </div>
        <div className="parent-dashboard-hero__stats">{[
          { value: todayLessons.length, label: '今日课次' },
          { value: activeAttendanceRate == null ? '暂无' : `${activeAttendanceRate}%`, label: '本月出勤' },
          { value: unreadCount, label: '待处理通知' },
        ].map(item => <div key={item.label} style={{ background: heroTheme.statBg }}><strong>{item.value}</strong><span>{item.label}</span></div>)}</div>
        <div className="parent-dashboard-hero__status"><span>今日状态：<strong>{todayStatus}</strong></span><span>更新于 {latestUpdate}</span></div>
        {activeStudent?.id && <Button icon={<RiseOutlined />} onClick={() => router.push(`/parent/archive?studentId=${activeStudent.id}`)}>查看成长档案</Button>}
        <WeatherHeroStrip audience="parent" />
      </section>

      {/* 老师最新关注：主卡片，按当前孩子取最近反馈，标清课程日期与发布时间 */}
      <section className="parent-dashboard-section" aria-labelledby="parent-latest-feedback-title">
        <div className="parent-dashboard-section__head"><h2 id="parent-latest-feedback-title">老师最新关注</h2>{latestFeedback && <button type="button" onClick={() => router.push('/parent/class-feedback')}>查看全部</button>}</div>
        {feedbackItems.length ? (
          <div className="parent-latest-feedback-list">
            {feedbackItems.map(item => (
              <button type="button" key={item.id} className="parent-latest-feedback" onClick={() => router.push(`/parent/archive?feedbackId=${item.id}`)}>
                <span>{item.type === '课堂反馈' ? <BookOutlined /> : <HeartOutlined />}</span>
                <div>
                  <div><strong>{item.teacherName}</strong><Tag>{item.type}</Tag>{item.subject ? <Tag>{item.subject}</Tag> : null}<small>{item.date.toLocaleString('zh-CN')}</small></div>
                  {item.lessonDate && <small>课程日期：{item.lessonDate}</small>}
                  {item.studentName && <small>学员：{item.studentName}</small>}
                  <p>{item.content}</p>
                </div>
              </button>
            ))}
          </div>
        ) : <Text type="secondary">暂无反馈，老师会在课后更新学习情况。</Text>}
      </section>

      <ParentLessonPreview items={lessonPreviews} activeChildId={activeChildId} />

      <ParentTodayPanel lessons={todayLessons} activeChildId={activeChildId} studentName={activeStudent?.name || '孩子'} />

      {(() => {
        const benefits = MEMBERSHIP_BENEFITS[membershipLevel]
        const upgrade = MEMBERSHIP_UPGRADE[membershipLevel]
        return (
          <section className={`parent-dashboard-section parent-membership-benefits parent-membership-benefits--${membershipLevel.toLowerCase()}`}>
            <div className="parent-membership-benefits__head">
              <h2>{benefits.title}</h2>
              {membershipLevel !== 'NORMAL' && <span className="parent-membership-badge">{membershipLevel === 'SVIP' ? '👑✨' : '👑'} {MEMBERSHIP_THEME[membershipLevel].label} 用户</span>}
            </div>
            <div className="parent-membership-benefits__grid">
              {benefits.items.map(item => (
                <div key={item.title} className="parent-membership-benefit">
                  <span className="parent-membership-benefit__icon">{item.icon}</span>
                  <div><strong>{item.title}</strong><small>{item.desc}</small></div>
                </div>
              ))}
            </div>
            {membershipLevel === 'SVIP' && <button type="button" className="parent-membership-upgrade" onClick={() => router.push(upgrade.href)}>{upgrade.text} ›</button>}
          </section>
        )
      })()}

      {weeklyReady && <WeeklyReport activeChildId={activeChildId} />}

      <section className="parent-dashboard-section" aria-labelledby="parent-notifications-title">
        <div className="parent-dashboard-section__head"><h2 id="parent-notifications-title">待办与通知</h2><button type="button" onClick={() => router.push('/parent/notifications')}>查看全部</button></div>
        {activeNotifications.length ? <div className="parent-notice-list">{activeNotifications.slice(0, 3).map(notification => { const meta = NOTIFICATION_META[notification.relatedType || ''] || NOTIFICATION_META[notification.type] || NOTIFICATION_META.SYSTEM; return <button type="button" key={notification.id} onClick={() => openNotification(notification)}><span style={{ color: notification.read ? 'var(--color-ink-subtle)' : meta.color, background: notification.read ? 'var(--color-surface-3)' : meta.bg }}>{meta.icon}</span><div><strong>{notification.title}</strong><small>{new Date(notification.createdAt).toLocaleString('zh-CN')}</small></div>{!notification.read && <i />}</button> })}</div> : <Text type="secondary">暂无通知</Text>}
      </section>
    </div>
  )
}
