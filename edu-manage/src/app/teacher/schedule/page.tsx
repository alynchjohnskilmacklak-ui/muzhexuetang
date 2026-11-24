'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Card, Space, Tag, Tooltip, Typography } from 'antd'
import {
  BellOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  MessageOutlined,
  ReadOutlined,
  RightOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { findSchedulePeriod, PERIOD_HEIGHTS, PERIOD_BG } from '@/lib/schedule-periods'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSchedulePeriods } from '@/hooks/useSchedulePeriods'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { PullToRefresh } from '@/components/PullToRefresh'
import { localDateKey } from '@/lib/date/local-day'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'
import styles from './schedule.module.css'
import { useMobileBackHandler } from '@/components/Layout/MobileLayout'

const { Title, Text } = Typography
const fetcher = (url: string) => fetch(url).then(r => r.json())

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const INTENSIVE_SLOTS = [
  { id: 'h08', start: '08:00', end: '09:00', label: '08:00–09:00' },
  { id: 'h09', start: '09:00', end: '10:00', label: '09:00–10:00' },
  { id: 'h10', start: '10:00', end: '11:00', label: '10:00–11:00' },
  { id: 'h11', start: '11:00', end: '12:00', label: '11:00–12:00' },
  { id: 'h14', start: '14:00', end: '15:00', label: '14:00–15:00' },
  { id: 'h15', start: '15:00', end: '16:00', label: '15:00–16:00' },
  { id: 'h16', start: '16:00', end: '17:00', label: '16:00–17:00' },
]

const INTENSIVE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ONE_ON_ONE:   { label: '一对一', color: '#534AB7', bg: 'rgba(83,74,183,.08)' },
  ONE_ON_TWO:   { label: '一对二', color: '#D4537E', bg: 'rgba(212,83,126,.08)' },
  ONE_ON_THREE: { label: '一对三', color: '#185FA5', bg: 'rgba(24,95,165,.08)' },
}

const SUBJECT_COLORS: Record<string, string> = {
  '数学': '#E8784A',
  '英语': '#185FA5',
  '语文': '#D4537E',
  '物理': '#1D9E75',
  '化学': '#534AB7',
  '生物': '#27500A',
  '地理': '#BA7517',
  '历史': '#633806',
  '政治': '#6B2B6B',
}

function getSubjectColor(subject?: string | null): string {
  if (!subject) return 'var(--color-primary, #14574d)'
  for (const [key, color] of Object.entries(SUBJECT_COLORS)) {
    if (subject.includes(key)) return color
  }
  return 'var(--color-primary, #14574d)'
}

type LessonStudent = { studentId?: string; student?: { id?: string; name?: string | null } | null }
type LessonEnrollment = { student?: { id?: string; name?: string | null } | null }
type ScheduleLesson = {
  id: string
  lessonDate: string | Date
  startTime?: string | null
  endTime?: string | null
  status?: string | null
  intensiveReviewStatus?: string | null
  attendanceSubmittedAt?: string | null
  actualMinutes?: number | null
  plannedMinutes?: number | null
  teacherId?: string | null
  subject?: string | null
  teacher?: { name?: string | null } | null
  lessonStudents?: LessonStudent[]
  classroomFeedbacks?: Array<{ studentIds?: string[] }>
  group?: {
    name?: string | null
    teachingType?: string | null
    room?: { name?: string | null } | null
    course?: { name?: string | null; subject?: string | null } | null
    enrollments?: LessonEnrollment[]
  } | null
}
type ScheduleResponse = { lessons?: ScheduleLesson[] }

function getIntensiveWorkflowStatus(lesson: ScheduleLesson) {
  if (lesson.intensiveReviewStatus === 'APPROVED') return { label: '已审核', color: 'green' }
  if (lesson.intensiveReviewStatus === 'PENDING') return { label: '待管理员审核', color: 'orange' }
  if (lesson.intensiveReviewStatus === 'REJECTED') return { label: '需修改考勤', color: 'red' }
  if (lesson.attendanceSubmittedAt) return { label: '考勤已提交', color: 'orange' }
  const end = new Date(`${String(lesson.lessonDate).slice(0, 10)}T${lesson.endTime || '23:59'}:00`)
  if (!Number.isNaN(end.getTime()) && end.getTime() < Date.now()) {
    return { label: '待提交考勤', color: 'gold' }
  }
  return { label: '已约课', color: 'blue' }
}

function getWeekRange(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: monday, end: sunday }
}

function getWeekDates(offset: number): Date[] {
  const { start } = getWeekRange(offset)
  return WEEKDAYS.map((_, i) => {
    const nd = new Date(start.getTime())
    nd.setDate(start.getDate() + i)
    return nd
  })
}

function getDurationMinutes(startTime?: string | null, endTime?: string | null): string {
  if (!startTime || !endTime) return ''
  try {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const diff = (eh * 60 + em) - (sh * 60 + sm)
    return diff > 0 ? `${diff}分钟` : ''
  } catch {
    return ''
  }
}

function formatWeekDisplay(startDate: string, endDate: string) {
  try {
    const [, sm, sd] = startDate.split('-').map(Number)
    const [, em, ed] = endDate.split('-').map(Number)
    return `${sm}月${sd}日 – ${em}月${ed}日`
  } catch {
    return `${startDate} 至 ${endDate}`
  }
}

export default function TeacherSchedulePage() {
  const isMobile = useIsMobile() ?? false
  const isTablet = useIsMobile(1025) ?? false
  const [scheduleType, setScheduleType] = useState<'group' | 'intensive' | 'studyHall'>('group')
  const [weekOffset, setWeekOffset] = useState(0)
  const [selectedDateKey, setSelectedDateKey] = useState<string>('')
  const [viewAllWeek, setViewAllWeek] = useState(false)
  const handleMobileBack = useCallback(() => {
    if (!viewAllWeek) return false
    setViewAllWeek(false)
    return true
  }, [viewAllWeek])
  const canGoBackMobile = useCallback(() => viewAllWeek, [viewAllWeek])
  useMobileBackHandler(handleMobileBack, 0, canGoBackMobile)
  const { periods } = useSchedulePeriods()
  const { start, end } = getWeekRange(weekOffset)
  const startDate = localDateKey(start)
  const endDate = localDateKey(end)

  // Fetch all 3 categories
  const { data: groupData, isLoading: loadingGroup, mutate: mutateGroup } = useSWR<ScheduleResponse>(
    `/api/teacher/schedule?startDate=${startDate}&endDate=${endDate}&type=GROUP`,
    fetcher
  )
  const { data: intensiveData, isLoading: loadingIntensive, mutate: mutateIntensive } = useSWR<ScheduleResponse>(
    `/api/teacher/schedule?startDate=${startDate}&endDate=${endDate}&type=INTENSIVE`,
    fetcher
  )
  const { data: studyHallData, isLoading: loadingStudyHall, mutate: mutateStudyHall } = useSWR<ScheduleResponse>(
    `/api/teacher/schedule?startDate=${startDate}&endDate=${endDate}&type=STUDY_HALL`,
    fetcher
  )

  const groupLessons = useMemo(() => (Array.isArray(groupData?.lessons) ? groupData.lessons : []), [groupData])
  const intensiveLessons = useMemo(() => (Array.isArray(intensiveData?.lessons) ? intensiveData.lessons : []), [intensiveData])
  const studyHallLessons = useMemo(() => (Array.isArray(studyHallData?.lessons) ? studyHallData.lessons : []), [studyHallData])
  const allLessons = useMemo(() => [...groupLessons, ...intensiveLessons, ...studyHallLessons], [groupLessons, intensiveLessons, studyHallLessons])
  const isLoading = loadingGroup || loadingIntensive || loadingStudyHall

  // 当前教师等级心智
  const { data: teacherData } = useSWR<{ teacher?: { name?: string; tierLevel?: string } }>(
    '/api/teacher/dashboard',
    fetcher,
    { dedupingInterval: 60_000, revalidateOnFocus: false }
  )
  const tier = resolveTier(teacherData?.teacher?.tierLevel)
  const tierTheme = TIER_THEME[tier]

  // Stats 增加全闭环达成判定
  const stats = useMemo(() => {
    const uniqueStudentIds = new Set<string>()
    let completedCount = 0
    let feedbackDoneCount = 0

    allLessons.forEach((lesson) => {
      lesson.group?.enrollments?.forEach((enrollment) => {
        if (enrollment.student?.id) uniqueStudentIds.add(enrollment.student.id)
      })
      lesson.lessonStudents?.forEach((ls) => {
        if (ls.studentId || ls.student?.id) uniqueStudentIds.add(ls.studentId || ls.student!.id!)
      })
      const isAttDone = Boolean(lesson.attendanceSubmittedAt || lesson.status === 'COMPLETED')
      const isFbDone = Boolean(lesson.classroomFeedbacks && lesson.classroomFeedbacks.length > 0)
      if (isAttDone) completedCount++
      if (isFbDone) feedbackDoneCount++
    })

    const isAllCompleted = allLessons.length > 0 && completedCount === allLessons.length

    return {
      total: allLessons.length,
      completed: completedCount,
      feedbackDone: feedbackDoneCount,
      students: uniqueStudentIds.size,
      isAllCompleted,
    }
  }, [allLessons])

  // Group grid: day × period matrix (for desktop)
  const groupGrid = useMemo(() => {
    const map: Record<string, ScheduleLesson[]> = {}
    for (let d = 0; d < 7; d++) {
      for (const p of periods) map[`${d}-${p.id}`] = []
    }
    for (const lesson of groupLessons) {
      if (!lesson.startTime) continue
      const lessonDateKey = localDateKey(lesson.lessonDate)
      const weekday = new Date(`${lessonDateKey}T00:00:00.000Z`).getUTCDay()
      const dayIdx = (weekday + 6) % 7
      const period = findSchedulePeriod(periods, lesson.startTime)
      if (period) map[`${dayIdx}-${period.id}`]?.push(lesson)
    }
    return map
  }, [groupLessons, periods])

  // Intensive grid: day × hour slot (for desktop)
  const intensiveGrid = useMemo(() => {
    const map: Record<string, ScheduleLesson[]> = {}
    for (let d = 0; d < 7; d++) {
      for (const s of INTENSIVE_SLOTS) map[`${d}-${s.id}`] = []
    }
    for (const lesson of intensiveLessons) {
      const lessonDateKey = localDateKey(lesson.lessonDate)
      const weekday = new Date(`${lessonDateKey}T00:00:00.000Z`).getUTCDay()
      const dayIdx = (weekday + 6) % 7
      const sh = parseInt((lesson.startTime || '00').split(':')[0])
      const slot = INTENSIVE_SLOTS.find(s => parseInt(s.start.split(':')[0]) === sh)
      if (slot) map[`${dayIdx}-${slot.id}`]?.push(lesson)
    }
    return map
  }, [intensiveLessons])

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])

  const visibleLessons = useMemo(
    () => (scheduleType === 'group' ? groupLessons : scheduleType === 'intensive' ? intensiveLessons : studyHallLessons),
    [groupLessons, intensiveLessons, scheduleType, studyHallLessons],
  )

  // Daily grouped lessons in chronological order
  const lessonsByDay = useMemo(() => {
    const today = localDateKey(new Date())
    return weekDates.map((date, index) => {
      const currentKey = localDateKey(date)
      const lessons = visibleLessons
        .filter((lesson) => localDateKey(lesson.lessonDate) === currentKey)
        .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')))
      return {
        key: currentKey,
        date,
        label: WEEKDAYS[index],
        lessons,
        isToday: currentKey === today,
      }
    })
  }, [visibleLessons, weekDates])

  // Smart default day selection
  useEffect(() => {
    const today = localDateKey(new Date())
    const todayGroup = lessonsByDay.find((d) => d.key === today)
    const firstActiveGroup = lessonsByDay.find((d) => d.lessons.length > 0)
    
    // If current selected key exists in the current week, preserve it
    if (selectedDateKey && lessonsByDay.some((d) => d.key === selectedDateKey)) {
      return
    }

    // Otherwise smart-select: if today has lessons select today, else select first day with lessons
    if (todayGroup && todayGroup.lessons.length > 0) {
      setSelectedDateKey(todayGroup.key)
    } else if (firstActiveGroup) {
      setSelectedDateKey(firstActiveGroup.key)
    } else if (todayGroup) {
      setSelectedDateKey(todayGroup.key)
    } else {
      setSelectedDateKey(lessonsByDay[0]?.key || '')
    }
  }, [lessonsByDay, selectedDateKey])

  const activeDayGroup = useMemo(
    () => lessonsByDay.find((d) => d.key === selectedDateKey) || lessonsByDay[0],
    [lessonsByDay, selectedDateKey]
  )

  const firstDayWithLessons = useMemo(
    () => lessonsByDay.find((d) => d.lessons.length > 0),
    [lessonsByDay]
  )

  const displayedDayGroups = useMemo(() => {
    if (viewAllWeek) {
      return lessonsByDay.filter((d) => d.lessons.length > 0)
    }
    return activeDayGroup ? [activeDayGroup] : []
  }, [activeDayGroup, lessonsByDay, viewAllWeek])

  return (
    <PullToRefresh
      onRefresh={async () => {
        await Promise.all([mutateGroup(), mutateIntensive(), mutateStudyHall()])
      }}
    >
      <div className={styles.container}>
        {/* Top Header Bar */}
        <div className={styles.headerBar}>
          <div className={styles.titleArea}>
            <Title level={4} className={styles.title}>我的课表</Title>
            <div className={styles.subtitle}>{formatWeekDisplay(startDate, endDate)}</div>
          </div>

          {/* Week Navigation Pill */}
          <div className={styles.weekNav}>
            <button
              type="button"
              onClick={() => setWeekOffset((o) => o - 1)}
              className={styles.weekNavBtn}
              aria-label="上一周"
            >
              <LeftOutlined />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className={styles.weekNavCurrent}
            >
              {weekOffset === 0 ? '本周' : '回到本周'}
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((o) => o + 1)}
              className={styles.weekNavBtn}
              aria-label="下一周"
            >
              <RightOutlined />
            </button>
          </div>
        </div>

        {/* Category Tabs (Segmented Pill) */}
        <div className={styles.categoryTabs}>
          <button
            type="button"
            onClick={() => setScheduleType('group')}
            className={`${styles.tabBtn} ${scheduleType === 'group' ? styles.tabBtnActive : ''}`}
          >
            精品班课
          </button>
          <button
            type="button"
            onClick={() => setScheduleType('intensive')}
            className={`${styles.tabBtn} ${scheduleType === 'intensive' ? styles.tabBtnActive : ''}`}
          >
            突击全能班
          </button>
          <button
            type="button"
            onClick={() => setScheduleType('studyHall')}
            className={`${styles.tabBtn} ${scheduleType === 'studyHall' ? styles.tabBtnActive : ''}`}
          >
            晚托作业班
          </button>
        </div>

        {/* 教师等级专属排课特权横幅 */}
        <div className={styles.teacherTierBanner}>
          <div className={styles.tierBannerLeft}>
            <span className={styles.tierBadge} style={{
              background: tierTheme.badgeBg,
              color: tierTheme.badgeColor,
              border: tierTheme.badgeBorder,
            }}>
              {tierTheme.name}
            </span>
            <span className={styles.tierTagline}>{tierTheme.roleTag}</span>
          </div>
          <Tooltip title="课次可关联教学资料，完成考勤与随堂反馈后自动归档。">
            <span className={styles.tierHintText}>
              排课特权说明 <InfoCircleOutlined style={{ fontSize: 12, marginLeft: 2 }} />
            </span>
          </Tooltip>
        </div>

        {/* Metric Highlights (具备业务提示与全部达成成就勋章) */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statCardHead}>
              <span className={styles.statLabel}>本周排课</span>
              <Tooltip title="统计本人名下当周所有精品班课、突击全能班和晚托作业班排课总数">
                <InfoCircleOutlined className={styles.statTipIcon} />
              </Tooltip>
            </div>
            <div className={styles.statValueWrap}>
              <span className={styles.statValue}>{stats.total}</span>
              <span className={styles.statUnit}>节</span>
            </div>
          </div>

          <div className={`${styles.statCard} ${stats.isAllCompleted ? styles.statCardAllDone : ''}`}>
            <div className={styles.statCardHead}>
              <span className={styles.statLabel}>考勤闭环</span>
              <Tooltip title="已完成到勤打卡并提交闭环的课次；全部完成时自动触发课酬准时结算">
                <InfoCircleOutlined className={styles.statTipIcon} />
              </Tooltip>
            </div>
            <div className={styles.statValueWrap}>
              <span className={`${styles.statValue} ${styles.statValueSuccess}`}>
                {stats.completed}
                <span className={styles.statDivider}>/</span>
                <span className={styles.statTotal}>{stats.total}</span>
              </span>
              {stats.isAllCompleted && (
                <span className={styles.allDoneBadge}>
                  <CheckCircleOutlined /> 100% 达成
                </span>
              )}
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statCardHead}>
              <span className={styles.statLabel}>在带学员</span>
              <Tooltip title="本周授课覆盖的去重学员总数，点击可直接联通学生成长画像">
                <InfoCircleOutlined className={styles.statTipIcon} />
              </Tooltip>
            </div>
            <div className={styles.statValueWrap}>
              <span className={`${styles.statValue} ${styles.statValueOrange}`}>{stats.students}</span>
              <span className={styles.statUnit}>人</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <CardSkeleton rows={3} />
        ) : isMobile ? (
          /* ==============================================================
             MOBILE VIEW: Horizontal Week Ribbon + Timeline Lesson Stream
             ============================================================== */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 7-Day Week Ribbon Bar */}
            <div className={styles.weekRibbonCard}>
              <div className={styles.weekRibbonHeader}>
                <span className={styles.weekRibbonTitle}>
                  <CalendarOutlined style={{ color: 'var(--color-primary)' }} />
                  课程日历
                </span>
                <button
                  type="button"
                  onClick={() => setViewAllWeek((v) => !v)}
                  className={styles.allWeekToggleBtn}
                >
                  {viewAllWeek ? '按单日查看' : '查看整周课程'}
                </button>
              </div>

              <div className={styles.weekRibbonGrid}>
                {lessonsByDay.map((day) => {
                  const isSelected = selectedDateKey === day.key && !viewAllWeek
                  const lessonCount = day.lessons.length
                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => {
                        setSelectedDateKey(day.key)
                        setViewAllWeek(false)
                      }}
                      className={`${styles.dayCell} ${isSelected ? styles.dayCellSelected : ''} ${day.isToday ? styles.dayCellToday : ''}`}
                    >
                      <span className={styles.weekdayLabel}>
                        {day.isToday ? '今天' : day.label}
                      </span>
                      <span className={styles.dayNumber}>{day.date.getDate()}</span>
                      {lessonCount > 0 ? (
                        <span className={styles.lessonCountBadge}>{lessonCount}</span>
                      ) : (
                        <span className={styles.dayDotEmpty} />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Current Filter Bar (Summary of what's being viewed) */}
            <div className={styles.filterBar}>
              <div className={styles.filterBarLeft}>
                <span>
                  {viewAllWeek
                    ? `整周排课 (${visibleLessons.length} 节课)`
                    : `${activeDayGroup?.label} · ${activeDayGroup?.date.getMonth() + 1}月${activeDayGroup?.date.getDate()}日`}
                </span>
                {!viewAllWeek && (
                  <span className={styles.filterBadge}>
                    {activeDayGroup?.lessons.length || 0} 节课
                  </span>
                )}
              </div>
              {viewAllWeek && (
                <button
                  type="button"
                  className="mobile-shell-back"
                  onClick={() => setViewAllWeek(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-primary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  返回单日
                </button>
              )}
            </div>

            {/* Lesson Stream */}
            {visibleLessons.length === 0 ? (
              <BrandEmpty title="本周暂无该类型排课" icon={<CalendarOutlined />} />
            ) : displayedDayGroups.length === 0 || (displayedDayGroups.length === 1 && displayedDayGroups[0].lessons.length === 0) ? (
              /* Serene Empty State for a day with no classes */
              <div className={styles.dayEmptyCard}>
                <CalendarOutlined style={{ fontSize: 32, color: 'var(--color-brand-gold, #8A6517)' }} />
                <div className={styles.dayEmptyText}>
                  <strong>{activeDayGroup?.label}（{activeDayGroup?.date.getMonth() + 1}月{activeDayGroup?.date.getDate()}日）暂无课程</strong>
                  <div style={{ fontSize: 12, marginTop: 4, color: 'var(--color-ink-subtle)' }}>
                    今日没有排课，享受备课或休整时光
                  </div>
                </div>
                {firstDayWithLessons && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDateKey(firstDayWithLessons.key)
                      setViewAllWeek(false)
                    }}
                    className={styles.dayEmptyActionBtn}
                  >
                    跳转到 {firstDayWithLessons.label}（{firstDayWithLessons.lessons.length} 节课）
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.lessonStream}>
                {displayedDayGroups.map((dayGroup) => (
                  <div key={dayGroup.key} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {viewAllWeek && (
                      <div className={styles.dayGroupHeader}>
                        <span className={styles.dayGroupTitle}>
                          {dayGroup.label} {dayGroup.date.getMonth() + 1}月{dayGroup.date.getDate()}日
                        </span>
                        <span className={styles.dayGroupCount}>
                          ({dayGroup.lessons.length} 节课)
                        </span>
                      </div>
                    )}

                    {dayGroup.lessons.map((lesson) => {
                      const teachingType = lesson.group?.teachingType || 'ONE_ON_ONE'
                      const intensiveCfg = INTENSIVE_CONFIG[teachingType] || INTENSIVE_CONFIG.ONE_ON_ONE
                      const accentColor =
                        scheduleType === 'intensive'
                          ? intensiveCfg.color
                          : getSubjectColor(lesson.subject || lesson.group?.course?.subject)
                      const lessonSubject = lesson.subject || lesson.group?.course?.subject
                      const duration = getDurationMinutes(lesson.startTime, lesson.endTime)

                      const isAttendanceDone = Boolean(
                        lesson.attendanceSubmittedAt ||
                        lesson.status === 'COMPLETED' ||
                        (scheduleType === 'intensive' &&
                          (lesson.intensiveReviewStatus === 'APPROVED' ||
                            lesson.intensiveReviewStatus === 'PENDING'))
                      )
                      const isFeedbackDone = Boolean(lesson.classroomFeedbacks && lesson.classroomFeedbacks.length > 0)

                      // 判断是否开课或已结课
                      const isLessonPastOrNow = (() => {
                        const end = new Date(`${String(lesson.lessonDate).slice(0, 10)}T${lesson.endTime || '23:59'}:00`)
                        return !Number.isNaN(end.getTime()) && end.getTime() <= Date.now() + 15 * 60 * 1000
                      })()

                      // 状态定义：已完成闭环、待发反馈、待录考勤、待开课
                      let statusBadge = { label: '待开课', color: 'default', textClass: styles.statusBadgeUpcoming }
                      if (isAttendanceDone && isFeedbackDone) {
                        statusBadge = { label: '✓ 教学已闭环', color: 'success', textClass: styles.statusBadgeClosed }
                      } else if (isAttendanceDone && !isFeedbackDone) {
                        statusBadge = { label: '✍️ 待发反馈', color: 'gold', textClass: styles.statusBadgeFeedback }
                      } else if (!isAttendanceDone && isLessonPastOrNow) {
                        statusBadge = { label: '📋 待录考勤', color: 'orange', textClass: styles.statusBadgeAttendance }
                      }

                      const studentCount = lesson.lessonStudents?.length || lesson.group?.enrollments?.length || 0
                      const studentNames =
                        lesson.lessonStudents
                          ?.map((item) => item.student?.name)
                          .filter(Boolean)
                          .join('、') || ''

                      return (
                        <article key={lesson.id} className={styles.lessonCard}>
                          {/* 等级荣誉与流光微顶条 */}
                          <div className={styles.lessonCardAccent} style={{ background: accentColor }} />

                          {/* Time & Status Row */}
                          <div className={styles.lessonCardHeader}>
                            <div className={styles.timeBox}>
                              <ClockCircleOutlined style={{ color: accentColor, fontSize: 13 }} />
                              <span className={styles.timeText} style={{ color: accentColor }}>
                                {lesson.startTime || '-'}{lesson.endTime ? `–${lesson.endTime}` : ''}
                              </span>
                              {duration && <span className={styles.durationTag}>{duration}</span>}
                            </div>
                            <div className={styles.badgeGroup}>
                              <span className={styles.tierHonorTag} style={{
                                background: tierTheme.badgeBg,
                                color: tierTheme.badgeColor,
                                border: tierTheme.badgeBorder,
                              }}>
                                {tierTheme.name}
                              </span>
                              <span className={`${styles.lessonStatusBadge} ${statusBadge.textClass}`}>
                                {statusBadge.label}
                              </span>
                            </div>
                          </div>

                          {/* Lesson Title */}
                          <div className={styles.lessonTitle}>
                            {lesson.group?.name || lesson.group?.course?.name || '小班课程'}
                          </div>

                          {/* 一体化通栏元数据条（替代散碎标签） */}
                          <div className={styles.unifiedMetaBar}>
                            {lessonSubject && (
                              <span className={styles.subjectPill} style={{ background: `${accentColor}18`, color: accentColor }}>
                                {lessonSubject}
                              </span>
                            )}
                            <div className={styles.metaDivider} />
                            <div className={styles.metaField}>
                              <EnvironmentOutlined style={{ color: 'var(--color-primary, #14574d)' }} />
                              <span>{lesson.group?.room?.name || '教室待定'}</span>
                            </div>
                            <div className={styles.metaDivider} />
                            <div className={styles.metaField}>
                              <TeamOutlined style={{ color: 'var(--color-primary, #14574d)' }} />
                              <span>在读 <strong>{studentCount}</strong> 人</span>
                            </div>
                          </div>

                          {/* Student Names (For Intensive or 1-on-1) */}
                          {studentNames && (
                            <div className={styles.studentsPill}>
                              <UserOutlined style={{ color: '#c45e1a' }} />
                              <span>在带学员：</span>
                              <span className={styles.studentsList}>{studentNames}</span>
                            </div>
                          )}

                          {/* Action Dock (严禁在未开课时误导老师快速考勤，闭环达成后呈现与众不同) */}
                          <div className={styles.actionDock}>
                            {isAttendanceDone && isFeedbackDone ? (
                              <>
                                <Link
                                  href={`/teacher/lesson/${lesson.id}`}
                                  className={styles.actionBtnPrimary}
                                >
                                  <ReadOutlined style={{ fontSize: 13 }} />
                                  <span>查看教学档案</span>
                                </Link>
                                <Link
                                  href={`/teacher/feedback?lessonId=${lesson.id}`}
                                  className={styles.actionBtnSecondary}
                                >
                                  <CheckCircleOutlined style={{ fontSize: 13, color: '#14574d' }} />
                                  <span>已闭环 (修改)</span>
                                </Link>
                              </>
                            ) : isAttendanceDone && !isFeedbackDone ? (
                              <>
                                <Link
                                  href={`/teacher/feedback?lessonId=${lesson.id}`}
                                  className={`${styles.actionBtnPrimary} ${styles.actionBtnGold}`}
                                >
                                  <MessageOutlined style={{ fontSize: 13 }} />
                                  <span>发随堂反馈 →</span>
                                </Link>
                                <Link
                                  href={`/teacher/attendance?lessonId=${lesson.id}`}
                                  className={styles.actionBtnSecondary}
                                >
                                  <span>查看考勤</span>
                                </Link>
                              </>
                            ) : isLessonPastOrNow ? (
                              <>
                                <Link
                                  href={`/teacher/attendance?lessonId=${lesson.id}`}
                                  className={styles.actionBtnPrimary}
                                >
                                  <CheckSquareOutlined style={{ fontSize: 13 }} />
                                  <span>录入考勤 →</span>
                                </Link>
                                <Link
                                  href={`/teacher/lesson/${lesson.id}`}
                                  className={styles.actionBtnSecondary}
                                >
                                  <span>教案与备课</span>
                                </Link>
                              </>
                            ) : (
                              <>
                                <Link
                                  href={`/teacher/lesson/${lesson.id}`}
                                  className={styles.actionBtnPrimary}
                                >
                                  <ReadOutlined style={{ fontSize: 13 }} />
                                  <span>查看教案与备课 →</span>
                                </Link>
                                <Link
                                  href="/teacher/lesson-previews"
                                  className={styles.actionBtnSecondary}
                                >
                                  <FileTextOutlined style={{ fontSize: 13 }} />
                                  <span>讲义预告</span>
                                </Link>
                              </>
                            )}
                          </div>
                        </article>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ==============================================================
             DESKTOP / TABLET VIEW: Timetable Matrix
             ============================================================== */
          scheduleType === 'studyHall' ? (
            studyHallLessons.length === 0 ? (
              <BrandEmpty title="本周暂无晚托或作业辅导安排" icon={<CalendarOutlined />} />
            ) : (
              <Card bordered={false} title="晚托与作业辅导" style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {lessonsByDay.filter((day) => day.lessons.length > 0).map((day) => (
                    <div
                      key={day.key}
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        background: day.isToday ? 'var(--color-primary-bg, #EAF4F1)' : 'var(--color-surface-2, #faf8f5)',
                        border: '1px solid var(--color-hairline, rgba(0,0,0,0.06))',
                      }}
                    >
                      <Text strong style={{ display: 'block', marginBottom: 10, color: day.isToday ? 'var(--color-primary)' : 'var(--color-ink)' }}>
                        {day.isToday ? '今天，' : ''}{day.label} {day.date.getMonth() + 1}月{day.date.getDate()}日
                      </Text>
                      <Space direction="vertical" size={10} style={{ width: '100%' }}>
                        {day.lessons.map((lesson) => (
                          <div
                            key={lesson.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '120px minmax(0, 1fr) auto auto',
                              gap: 12,
                              alignItems: 'center',
                              padding: '10px 14px',
                              background: '#ffffff',
                              borderRadius: 10,
                              border: '1px solid var(--color-hairline, rgba(0,0,0,0.06))',
                            }}
                          >
                            <Text strong style={{ color: 'var(--color-primary)' }}>
                              {lesson.startTime} 至 {lesson.endTime}
                            </Text>
                            <div>
                              <Text strong>{lesson.group?.name || '作业班'}</Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: 12 }}>{lesson.subject || '自习与答疑'}</Text>
                            </div>
                            <Tag color="orange">{lesson.group?.enrollments?.length || 0}名学员</Tag>
                            <Space size={6}>
                              <Link
                                href={`/teacher/attendance?lessonId=${lesson.id}`}
                                style={{
                                  fontSize: 12,
                                  padding: '4px 10px',
                                  borderRadius: 8,
                                  background: 'var(--color-primary)',
                                  color: '#fff',
                                  textDecoration: 'none',
                                }}
                              >
                                考勤
                              </Link>
                              <Link
                                href={`/teacher/feedback?lessonId=${lesson.id}`}
                                style={{
                                  fontSize: 12,
                                  padding: '4px 10px',
                                  borderRadius: 8,
                                  background: 'var(--color-primary-bg)',
                                  color: 'var(--color-primary)',
                                  border: '1px solid rgba(20,87,77,0.2)',
                                  textDecoration: 'none',
                                }}
                              >
                                反馈
                              </Link>
                            </Space>
                          </div>
                        ))}
                      </Space>
                    </div>
                  ))}
                </div>
              </Card>
            )
          ) : scheduleType === 'group' ? (
            groupLessons.length === 0 ? (
              <BrandEmpty title="本周暂无精品班课" icon={<CalendarOutlined />} />
            ) : (
              <Card bordered={false} style={{ borderRadius: 14, overflow: 'auto' }} styles={{ body: { padding: 0 } }}>
                <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '56px repeat(7, minmax(58px, 1fr))' : '72px repeat(7, minmax(72px, 1fr))', minWidth: isTablet ? 0 : 640 }}>
                  <div style={{ padding: 8, background: 'var(--color-background-secondary, #faf8f5)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)' }} />
                  {weekDates.map((date, i) => {
                    const today = date.toDateString() === new Date().toDateString()
                    return (
                      <div key={i} style={{ textAlign: 'center', padding: '10px 4px', background: today ? '#EAF4F1' : undefined, borderBottom: '0.5px solid var(--color-border, #EEE7E1)' }}>
                        <div style={{ fontSize: 11, color: 'var(--color-ink-subtle)' }}>{WEEKDAYS[i]}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: today ? 'var(--color-primary)' : 'var(--color-ink)' }}>{date.getDate()}</div>
                      </div>
                    )
                  })}
                  {periods.map(period => {
                    const h = period.type === 'CLASS' ? PERIOD_HEIGHTS.CLASS : period.type === 'BIG_BREAK' ? 20 : period.type === 'LUNCH' ? 22 : 16
                    return (
                      <div key={period.id} style={{ display: 'contents' }}>
                        <div style={{ minHeight: h, background: PERIOD_BG[period.type], borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)', padding: '2px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
                          {period.type === 'CLASS' && <><div style={{ fontSize: 10, fontWeight: 500, color: 'var(--color-primary)' }}>{period.name}</div><div style={{ fontSize: 8, fontFamily: 'monospace', color: 'var(--color-ink-subtle)' }}>{period.start} 至 {period.end}</div></>}
                          {period.type === 'BREAK' && <span style={{ fontSize: 9, fontStyle: 'italic', color: 'var(--color-ink-subtle)' }}>课间</span>}
                          {period.type === 'BIG_BREAK' && <span style={{ fontSize: 9, fontWeight: 500, color: '#534AB7', display: 'inline-flex', alignItems: 'center', gap: 3 }}><BellOutlined />大课间</span>}
                          {period.type === 'LUNCH' && <span style={{ fontSize: 9, fontWeight: 500, color: '#1D9E75', display: 'inline-flex', alignItems: 'center', gap: 3 }}><CoffeeOutlined />午休</span>}
                        </div>
                        {weekDates.map((date, dayIdx) => {
                          const items = groupGrid[`${dayIdx}-${period.id}`] || []
                          const hasItem = items.length > 0 && period.type === 'CLASS'
                          return (
                            <div key={dayIdx} style={{ minHeight: h, overflow: 'hidden', borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)', padding: 3, background: PERIOD_BG[period.type] }}>
                              {hasItem ? items.map((lesson) => (
                                <div key={lesson.id} style={{ background: 'rgba(20, 87, 77, 0.08)', borderRadius: 8, padding: '6px 8px', minHeight: 62, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(20, 87, 77, 0.15)' }}>
                                  <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', lineHeight: 1.3 }}>{lesson.group?.course?.name || lesson.group?.name || '-'}</div>
                                    <div style={{ fontSize: 10, color: '#5a4e3a', lineHeight: 1.3 }}><EnvironmentOutlined style={{ fontSize: 9 }} /> {lesson.group?.room?.name || '-'}</div>
                                    <div style={{ fontSize: 10, color: '#5a4e3a', lineHeight: 1.3 }}><TeamOutlined style={{ fontSize: 9 }} /> {lesson.group?.enrollments?.length || 0}人</div>
                                  </div>
                                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                    <Link href={`/teacher/attendance?lessonId=${lesson.id}`} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--color-primary)', color: '#fff', textDecoration: 'none' }}>
                                      考勤
                                    </Link>
                                    <Link href={`/teacher/feedback?lessonId=${lesson.id}`} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#fff', color: 'var(--color-primary)', border: '1px solid rgba(20,87,77,.3)', textDecoration: 'none' }}>
                                      反馈
                                    </Link>
                                  </div>
                                </div>
                              )) : period.type === 'CLASS' ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 40 }}>
                                  <span style={{ fontSize: 11, color: 'var(--color-ink-subtle)' }}>暂无</span>
                                </div>
                              ) : null}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </Card>
            )
          ) : (
            intensiveLessons.length === 0 ? (
              <BrandEmpty title="本周暂无突击全能班课程" icon={<CalendarOutlined />} />
            ) : (
              <Card bordered={false} style={{ borderRadius: 14, overflow: 'auto' }} styles={{ body: { padding: 0 } }}>
                <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '56px repeat(7, minmax(58px, 1fr))' : '72px repeat(7, minmax(72px, 1fr))', minWidth: isTablet ? 0 : 640 }}>
                  <div style={{ padding: 8, background: 'var(--color-background-secondary, #faf8f5)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)' }} />
                  {weekDates.map((date, i) => {
                    const today = date.toDateString() === new Date().toDateString()
                    return (
                      <div key={i} style={{ textAlign: 'center', padding: '10px 4px', background: today ? '#F5F0FF' : undefined, borderBottom: '0.5px solid var(--color-border, #EEE7E1)' }}>
                        <div style={{ fontSize: 11, color: 'var(--color-ink-subtle)' }}>{WEEKDAYS[i]}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: today ? '#534AB7' : 'var(--color-ink)' }}>{date.getDate()}</div>
                      </div>
                    )
                  })}
                  {INTENSIVE_SLOTS.map((slot) => {
                    const isNoon = slot.start === '12:00'
                    const h = isNoon ? 22 : 72
                    return (
                      <div key={slot.id} style={{ display: 'contents' }}>
                        <div style={{ minHeight: h, borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)', padding: '4px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', background: isNoon ? 'rgba(29,158,117,.04)' : '#fafafa' }}>
                          {isNoon ? <span style={{ fontSize: 9, fontWeight: 500, color: '#1D9E75', display: 'inline-flex', alignItems: 'center', gap: 3 }}><CoffeeOutlined />午休</span> :
                            <><div style={{ fontSize: 11, fontWeight: 500, color: '#534AB7' }}>{slot.start.split(':')[0]}:00</div><div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--color-ink-subtle)' }}>至 {slot.end}</div></>
                          }
                        </div>
                        {weekDates.map((date, dayIdx) => {
                          if (isNoon) return <div key={dayIdx} style={{ minHeight: h, borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)', background: 'rgba(29,158,117,.02)' }} />
                          const items = intensiveGrid[`${dayIdx}-${slot.id}`] || []
                          return (
                            <div key={dayIdx} style={{ minHeight: h, overflow: 'hidden', borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)', padding: 3 }}>
                              {items.length ? items.map((lesson) => {
                                const ct = lesson.group?.teachingType || 'ONE_ON_ONE'
                                const cfg = INTENSIVE_CONFIG[ct] || INTENSIVE_CONFIG.ONE_ON_ONE
                                const studentName = lesson.lessonStudents?.map((item) => item.student?.name).filter(Boolean).join('、') || ''
                                const workflowStatus = getIntensiveWorkflowStatus(lesson)
                                return (
                                  <div key={lesson.id} style={{ background: cfg.bg, borderRadius: 8, padding: '6px 8px', minHeight: 64, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: `1px solid ${cfg.color}30` }}>
                                    <div>
                                      <div style={{ fontSize: 9, fontWeight: 600, color: cfg.color, background: `${cfg.color}18`, padding: '1px 4px', borderRadius: 3, alignSelf: 'flex-start', display: 'inline-block', marginBottom: 2 }}>{cfg.label}</div>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, lineHeight: 1.3 }}>{lesson.subject || lesson.group?.course?.subject || '-'}</div>
                                      <div style={{ fontSize: 10, color: cfg.color, lineHeight: 1.3 }}><UserOutlined style={{ fontSize: 9 }} /> {studentName}</div>
                                      <div style={{ fontSize: 9, color: cfg.color, fontWeight: 600, marginTop: 1 }}>{workflowStatus.label}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                                      <Link href={`/teacher/attendance?lessonId=${lesson.id}`} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: cfg.color, color: '#fff', textDecoration: 'none' }}>
                                        考勤
                                      </Link>
                                      <Link href={`/teacher/feedback?lessonId=${lesson.id}`} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#fff', color: cfg.color, border: `1px solid ${cfg.color}50`, textDecoration: 'none' }}>
                                        反馈
                                      </Link>
                                    </div>
                                  </div>
                                )
                              }) : (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 40 }}>
                                  <span style={{ fontSize: 11, color: 'var(--color-ink-subtle)' }}>暂无</span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </Card>
            )
          )
        )}
      </div>
    </PullToRefresh>
  )
}
