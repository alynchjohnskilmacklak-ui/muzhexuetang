'use client'

import { useMemo, useState } from 'react'
import { Segmented, Select, Tag, Typography } from 'antd'
import {
  CheckCircleOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  CrownFilled,
  CrownOutlined,
  DownOutlined,
  EnvironmentOutlined,
  MessageOutlined,
  LinkOutlined,
  LeftOutlined,
  ReadOutlined,
  RightOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { findSchedulePeriod, PERIOD_BG, SchedulePeriod } from '@/lib/schedule-periods'
import { useIsMobile } from '@/hooks/useIsMobile'
import { shouldSearchChoices, shouldUseInlineChoices } from '@/lib/choice-thresholds'
import { fmtDate } from '@/lib/format-date'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { ParentCard } from '@/components/Parent/ParentCard'
import { PullToRefresh } from '@/components/PullToRefresh'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './schedule.module.css'
import { rememberParentChild } from '@/lib/parent-child-preference'
import { resolveParentChildId } from '@/lib/parent-child-selection'
import { isParentStudentInLesson } from '@/lib/parent-lesson-visibility'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'
import { AnimatedNumber } from '@/components/Common/AnimatedNumber'
import { buildParentLessonDetailHref } from '@/lib/parent-lesson-detail'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'
import {
  calculateIntensiveDeductHours,
  intensiveTeachingTypeLabel,
} from '@/lib/intensive-class'

const { Title, Text } = Typography
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
type ScheduledStudent = { id: string; name: string; recordIds?: string[]; currentTermRecordIds?: string[]; currentTermId?: string | null; membershipLevel?: string | null; enrollments?: ScheduleEnrollment[] }
type ScheduleEnrollment = {
  id: string
  totalHours?: number | null
  usedHours?: number | null
  remainHours?: number | null
  group?: ScheduleGroup | null
}
type ScheduleGroup = {
  id?: string; name?: string; termId?: string | null; intensiveMode?: string | null; teachingType?: string | null
  room?: { name?: string | null } | null
  recurringDays?: number[] | null
  lessonStartTime?: string | null
  status?: string | null
  course?: { name?: string | null; subject?: string | null } | null
  teacher?: { id?: string; name?: string | null; avatar?: string | null; gender?: string | null; tierLevel?: string | null; bio?: string | null; education?: string | null; university?: string | null; major?: string | null; subjects?: string | null } | null
  teacherAssignments?: Array<{ teacherId?: string; subject?: string | null }>
  enrollments?: Array<{ studentId?: string; subjects?: string[]; student?: { id?: string; name?: string | null } | null }>
}
type ScheduleLesson = {
  id: string; lessonDate: string | Date; startTime: string; endTime: string; subject?: string | null; isManual?: boolean; cancelReason?: string | null; _count?: { lessonStudents?: number }
  groupId?: string | null; attendanceSubmittedAt?: string | null; actualMinutes?: number | null; intensiveReviewStatus?: string | null
  teacher?: { id?: string; name?: string | null } | null; group?: ScheduleGroup | null
  lessonStudents?: Array<{ studentId: string; student?: { name?: string | null } | null }>
  attendances?: Array<{ studentId: string; status?: string | null; actualMinutes?: number | null }>
  classroomFeedbacks?: Array<{ id: string; studentIds?: string[]; summary?: string | null; overallComment?: string | null }>
  intensiveReviews?: Array<{ status?: string | null; actualMinutes?: number | null }>
}

const SUBJECT_COLORS: Record<string, string> = {
  '语文': '#D4537E', '数学': '#E8784A', '英语': '#185FA5',
  '物理': '#1D9E75', '化学': '#534AB7', '生物': '#27500A',
  '地理': '#BA7517', '历史': '#633806', '政治': '#6B2B6B',
}
function getSubjectColor(subject: string): string {
  for (const [key, color] of Object.entries(SUBJECT_COLORS)) {
    if (subject?.includes(key)) return color
  }
  return '#E8784A'
}

function getLessonSubject(lesson: ScheduleLesson): string {
  const teacherId = lesson.teacher?.id || lesson.group?.teacher?.id
  const assignedSubject = lesson.group?.teacherAssignments?.find((assignment) => assignment.teacherId === teacherId)?.subject
  return lesson.subject || assignedSubject || lesson.group?.course?.subject || ''
}

function lessonDateTime(lesson: ScheduleLesson, time: string) {
  const dateText = new Date(lesson.lessonDate).toISOString().slice(0, 10)
  return new Date(`${dateText}T${time}:00`)
}

function getLessonStatus(lesson: ScheduleLesson): { text: string; color: string; deducted: string } {
  if (lesson.attendanceSubmittedAt) return { text: '已结束', color: 'green', deducted: '已确认' }
  const now = new Date()
  const start = lessonDateTime(lesson, lesson.startTime)
  const end = lessonDateTime(lesson, lesson.endTime)
  if (now < start) return { text: '待上课', color: 'blue', deducted: '待上课' }
  if (now >= start && now <= end) return { text: '上课中', color: 'processing', deducted: '待确认' }
  return { text: '待老师确认', color: 'orange', deducted: '待确认' }
}

function cleanCourseName(name: string | null | undefined): string {
  if (!name) return '小班课程'
  return name.replace(/^牧哲学堂\s*/, '').trim() || '小班课程'
}

function getLessonDuration(start: string, end: string): string {
  try {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const diff = (eh * 60 + em) - (sh * 60 + sm)
    if (diff > 0) return `${diff}m`
  } catch {}
  return ''
}

export function ParentScheduleClient({
  students,
  initialSelectedStudentId,
  lessons,
  cancelledLessons,
  weekStart,
  historyLessons,
  intensiveSummary,
  periods,
}: {
  students: ScheduledStudent[]
  initialSelectedStudentId: string
  lessons: ScheduleLesson[]
  cancelledLessons: ScheduleLesson[]
  weekStart: string
  historyLessons: ScheduleLesson[]
  intensiveSummary: Array<{
    studentId: string
    groupId: string
    approvedHours: number
    pendingCount: number
    bookedCount: number
  }>
  periods: SchedulePeriod[]
}) {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const isTablet = useIsMobile(1025) ?? false
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() =>
    resolveParentChildId(students, [initialSelectedStudentId]),
  )
  const [today] = useState(() => new Date())

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId)
    const student = students.find((item) => item.id === studentId)
    rememberParentChild(studentId, student?.membershipLevel)
    const params = new URLSearchParams(window.location.search)
    params.set('childId', studentId)
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`)
  }

  const monday = useMemo(() => new Date(`${weekStart}T00:00:00`), [weekStart])
  const canChangeWeek = (offset: number) => {
    const target = new Date(monday)
    target.setDate(target.getDate() + offset * 7)
    return Math.abs(target.getTime() - today.getTime()) <= 366 * 86400000
  }
  const changeWeek = (offset: number) => {
    if (!canChangeWeek(offset)) return
    const target = new Date(monday)
    target.setDate(target.getDate() + offset * 7)
    const day = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`
    router.push(`/parent/schedule?week=${day}`)
  }

  const weekDates = useMemo(() => WEEKDAYS.map((_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d
  }), [monday])

  const selectedStudent = students.find(s => s.id === selectedStudentId)
  const selectedStudentRecordIds = useMemo(
    () => new Set(selectedStudent?.recordIds?.length ? selectedStudent.recordIds : selectedStudent ? [selectedStudent.id] : []),
    [selectedStudent],
  )
  const selectedStudentCurrentTermRecordIds = useMemo(
    () => new Set(selectedStudent?.currentTermRecordIds?.length ? selectedStudent.currentTermRecordIds : selectedStudent ? [selectedStudent.id] : []),
    [selectedStudent],
  )

  // Filter lessons for selected child
  const childLessons = useMemo(() => lessons.filter((lesson) =>
    (!selectedStudent?.currentTermId || lesson.group?.termId === selectedStudent.currentTermId)
      && [...selectedStudentCurrentTermRecordIds].some((studentId) => isParentStudentInLesson(lesson, studentId))
  ), [lessons, selectedStudent, selectedStudentCurrentTermRecordIds])
  const childCancelledLessons = useMemo(() => cancelledLessons.filter((lesson) =>
    (!selectedStudent?.currentTermId || lesson.group?.termId === selectedStudent.currentTermId)
      && [...selectedStudentCurrentTermRecordIds].some((studentId) => isParentStudentInLesson(lesson, studentId))
  ), [cancelledLessons, selectedStudent, selectedStudentCurrentTermRecordIds])

  // Build day × period grid
  const grid = useMemo(() => {
    const map: Record<string, ScheduleLesson[]> = {}
    for (let d = 0; d < 7; d++) {
      for (const p of periods) map[`${d}-${p.id}`] = []
    }
    childLessons.forEach((l) => {
      const ld = new Date(l.lessonDate)
      const dayIdx = (ld.getDay() + 6) % 7
      const period = findSchedulePeriod(periods, l.startTime)
      if (period) map[`${dayIdx}-${period.id}`]?.push(l)
    })
    return map
  }, [childLessons, periods])

  const allEnrollments = useMemo(() => selectedStudent?.enrollments || [], [selectedStudent?.enrollments])
  const intensiveEnrollments = useMemo(() => allEnrollments.filter((enrollment) => enrollment.group?.intensiveMode === 'INTENSIVE'), [allEnrollments])
  const normalEnrollments = useMemo(() => allEnrollments.filter((enrollment) => (enrollment.group?.intensiveMode ?? null) !== 'INTENSIVE'), [allEnrollments])
  const childHistoryLessons = useMemo(() => (
    historyLessons.filter((lesson) => (
      lesson.lessonStudents?.some((item) => selectedStudentRecordIds.has(item.studentId))
    ))
  ), [historyLessons, selectedStudentRecordIds])
  const intensiveStatsByGroup = useMemo(() => {
    const result = new Map<string, { approvedHours: number; pendingCount: number; bookedCount: number }>()
    for (const enrollment of intensiveEnrollments) {
      const groupId = enrollment.group?.id
      if (!groupId) continue
      const summary = intensiveSummary.find((item) => (
        selectedStudentRecordIds.has(item.studentId) && item.groupId === groupId
      ))
      result.set(groupId, summary || { approvedHours: 0, pendingCount: 0, bookedCount: 0 })
    }
    return result
  }, [intensiveEnrollments, intensiveSummary, selectedStudentRecordIds])
  const mobileLessons = useMemo(() => [...childLessons].sort((a, b) =>
    String(a.lessonDate).localeCompare(String(b.lessonDate)) || String(a.startTime).localeCompare(String(b.startTime))
  ), [childLessons])
  const mobileLessonGroups = useMemo(() => {
    const groups: Array<{ key: string; date: Date; lessons: ScheduleLesson[] }> = []
    mobileLessons.forEach((lesson) => {
      const date = new Date(lesson.lessonDate)
      const key = date.toDateString()
      const current = groups[groups.length - 1]
      if (current?.key === key) current.lessons.push(lesson)
      else groups.push({ key, date, lessons: [lesson] })
    })
    return groups
  }, [mobileLessons])
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>(() => ({}))
  const [selectedFilterDateKey, setSelectedFilterDateKey] = useState<string | null>(null)

  const isCurrentWeek = useMemo(() => {
    const now = new Date()
    const weekStartMonday = new Date(monday)
    const weekEndSunday = new Date(monday)
    weekEndSunday.setDate(weekEndSunday.getDate() + 7)
    return now >= weekStartMonday && now < weekEndSunday
  }, [monday])

  const dayClassCounts = useMemo(() => {
    const counts = new Map<string, number>()
    childLessons.forEach((l) => {
      const key = new Date(l.lessonDate).toDateString()
      counts.set(key, (counts.get(key) || 0) + 1)
    })
    return counts
  }, [childLessons])

  const filteredMobileLessonGroups = useMemo(() => {
    if (!selectedFilterDateKey) return mobileLessonGroups
    return mobileLessonGroups.filter((g) => g.key === selectedFilterDateKey)
  }, [mobileLessonGroups, selectedFilterDateKey])

  const isDateExpanded = (key: string, index: number) => {
    if (key in expandedDates) return expandedDates[key]
    if (selectedFilterDateKey) return true
    const todayKey = new Date().toDateString()
    const hasToday = mobileLessonGroups.some(group => group.key === todayKey)
    return hasToday ? key === todayKey : true
  }

  return (
    <PullToRefresh onRefresh={async () => { router.refresh(); await new Promise((resolve) => setTimeout(resolve, 500)) }}>
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1201', lineHeight: 1.2 }}>课程表</div>
          <div style={{ fontSize: 11.5, color: '#9a8e7a', marginTop: 2 }}>按周查看课程与停课记录</div>
        </div>
        {students.length > 1 && (shouldUseInlineChoices(students.length) ? (
          <Segmented
            aria-label="选择课表学员"
            size="small"
            block={isMobile}
            style={{ width: isMobile ? '100%' : undefined }}
            value={selectedStudentId}
            onChange={(value) => handleSelectStudent(String(value))}
            options={students.map((student) => ({ label: student.name, value: student.id }))}
          />
        ) : (
          <Select
            aria-label="选择课表学员"
            value={selectedStudentId || undefined}
            style={{ width: isMobile ? '100%' : 180, flexShrink: 0 }}
            size="small"
            getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
            onChange={handleSelectStudent}
            options={students.map((student) => ({ label: student.name, value: student.id }))}
            showSearch={shouldSearchChoices(students.length)}
            optionFilterProp="label"
            placement="bottomLeft"
            listHeight={240}
          />
        ))}
      </div>

      <div className={styles.weekNav}>
        <button
          type="button"
          aria-label="查看上一周课程"
          disabled={!canChangeWeek(-1)}
          onClick={() => changeWeek(-1)}
          className={styles.navArrowBtn}
        >
          <LeftOutlined />
        </button>
        <div className={styles.weekTitleBox}>
          <span className={styles.weekTitle}>
            {fmtDate(weekDates[0])} 至 {fmtDate(weekDates[6])}
          </span>
          {!isCurrentWeek && (
            <button
              type="button"
              className={styles.todayQuickBtn}
              onClick={() => router.push('/parent/schedule')}
            >
              本周
            </button>
          )}
        </div>
        <button
          type="button"
          aria-label="查看下一周课程"
          disabled={!canChangeWeek(1)}
          onClick={() => changeWeek(1)}
          className={styles.navArrowBtn}
        >
          <RightOutlined />
        </button>
      </div>

      <div className={styles.weekRibbon} role="tablist" aria-label="本周日期">
        {weekDates.map((date, idx) => {
          const key = date.toDateString()
          const isDateToday = key === today.toDateString()
          const isSelected = selectedFilterDateKey === key
          const count = dayClassCounts.get(key) || 0
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`${styles.dayCell} ${isDateToday ? styles.dayCellToday : ''} ${isSelected ? styles.dayCellSelected : ''}`}
              onClick={() => setSelectedFilterDateKey((prev) => (prev === key ? null : key))}
            >
              <span className={styles.weekdayLabel}>{WEEKDAYS[idx]}</span>
              <span className={styles.dayNumber}>{date.getDate()}</span>
              {count > 0 ? (
                <span className={styles.dayDotIndicator} title={`${count}节课`} />
              ) : (
                <span className={styles.dayDotEmpty} />
              )}
            </button>
          )
        })}
      </div>

      {selectedFilterDateKey && (
        <div className={styles.filterSummaryBar}>
          <span className={styles.filterSummaryText}>
            <CalendarOutlined style={{ color: 'var(--color-primary)' }} />
            正在查看：{fmtDate(new Date(selectedFilterDateKey))}
            {dayClassCounts.get(selectedFilterDateKey)
              ? `（${dayClassCounts.get(selectedFilterDateKey)} 节课）`
              : '（暂无课程）'}
          </span>
          <button
            type="button"
            className={styles.clearFilterBtn}
            onClick={() => setSelectedFilterDateKey(null)}
          >
            显示整周全部
          </button>
        </div>
      )}

      {intensiveEnrollments.length > 0 && (
        <>
          {/* 尊享 VIP 情绪价值 Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #0E5E4E 0%, #123C35 100%)',
            borderRadius: 16, padding: '16px 16px 14px', marginBottom: 14,
            border: '1px solid rgba(201,164,92,.45)',
            boxShadow: '0 10px 28px rgba(18,60,53,.28)',
            color: '#F6E9C8', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', right: -18, top: -22, fontSize: 96, opacity: .10, color: '#F2E3B6' }}><CrownFilled /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#C9A45C,#F2E3B6)', color: '#123C35', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}><CrownOutlined /></span>
              <Text strong style={{ color: '#F6E9C8', fontSize: 15, letterSpacing: .5 }}>尊享一对一 · 贵宾课程</Text>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(246,233,200,.86)', lineHeight: 1.55, marginTop: 9 }}>
              您为孩子报名了牧哲学堂 VIP 课程，专属教师一对一授课。每一分钟学习都被认真记录，每一次成长都被细心看见。
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 11 }}>
              {['专属一对一教学', '灵活约课优先安排', '专属课堂反馈', '课时透明结算'].map((perk) => (
                <span key={perk} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 999, background: 'rgba(201,164,92,.16)', border: '1px solid rgba(201,164,92,.38)', color: '#F2E3B6' }}>
                  {perk}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
            {intensiveEnrollments.map((enrollment, enrollmentIndex) => {
              const group = enrollment.group
              const teacher = group?.teacher
              const tier = teacher ? resolveTier(teacher.tierLevel) : null
              const tierTheme = tier ? TIER_THEME[tier] : null
              const avatarSrc = getTeacherAvatarUrl(teacher?.avatar, teacher?.gender, teacher?.id)
              const stats = intensiveStatsByGroup.get(group?.id || '') || { approvedHours: 0, pendingCount: 0, bookedCount: 0 }
              const remain = Number(enrollment.remainHours || 0)
              const latestFeedback = historyLessons
                .filter((lesson) => lesson.groupId === group?.id)
                .flatMap((lesson) => lesson.classroomFeedbacks || [])
                .find((feedback) => feedback.summary)
              return (
                <button
                  key={enrollment.id}
                  type="button"
                  className="stagger-item"
                  onClick={() => router.push(`/parent/intensive?groupId=${group?.id || ''}&studentId=${selectedStudentId}`)}
                  style={{
                    textAlign: 'left', padding: 0, border: 'none', background: 'transparent', width: '100%', maxWidth: '100%', cursor: 'pointer',
                    animationDelay: `${Math.min(enrollmentIndex, 8) * 40}ms`,
                  }}
                >
                  <ParentCard style={{ padding: 14, width: '100%', maxWidth: '100%', border: '1px solid rgba(201,164,92,.30)', boxShadow: '0 4px 16px rgba(18,60,53,.10)' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <CachedAvatarImage
                        src={avatarSrc}
                        fallbackSrc={getTeacherAvatarUrl(null, teacher?.gender, teacher?.id)}
                        alt={teacher?.name || '老师'}
                        style={{ width: 44, height: 44, borderRadius: 22, objectFit: 'cover', border: '1px solid rgba(201,164,92,.5)', background: '#F8F3E7' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text strong style={{ fontSize: 14 }}>{group?.course?.subject || group?.course?.name} · 一对一</Text>
                          {tierTheme && (
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
                              background: tierTheme.bg, border: `1px solid ${tierTheme.border}`, color: tierTheme.accent,
                            }}>
                              {tierTheme.label}
                            </span>
                          )}
                        </div>
                        <div style={{ color: '#5a4e3a', fontSize: 12, marginTop: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span>{teacher?.name || '-'}老师</span>
                          <span style={{ color: '#C9A45C' }}>·</span>
                          <span>{intensiveTeachingTypeLabel(group?.teachingType)}</span>
                        </div>
                      </div>
                      <CrownOutlined style={{ color: '#C9A45C', fontSize: 18 }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6, marginTop: 12, fontSize: 11, textAlign: 'center' }}>
                      <div style={{ background: '#0E5E4E', borderRadius: 10, padding: '7px 2px', color: '#F2E3B6', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                        <span style={{ opacity: 0.85, fontSize: 10.5 }}>剩余课时</span>
                        <strong style={{ fontSize: 15, color: '#F6E9C8', fontWeight: 700 }}><AnimatedNumber value={remain} precision={1} />h</strong>
                      </div>
                      <div style={{ background: 'rgba(201,164,92,.12)', borderRadius: 10, padding: '7px 2px', color: '#123C35', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                        <span style={{ color: '#7A6A45', fontSize: 10.5 }}>已审核</span>
                        <strong style={{ fontSize: 15, color: '#123C35', fontWeight: 700 }}><AnimatedNumber value={stats.approvedHours} precision={1} />h</strong>
                      </div>
                      <div style={{ background: 'rgba(201,164,92,.12)', borderRadius: 10, padding: '7px 2px', color: '#123C35', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                        <span style={{ color: '#7A6A45', fontSize: 10.5 }}>待审核</span>
                        <strong style={{ fontSize: 15, color: '#123C35', fontWeight: 700 }}><AnimatedNumber value={stats.pendingCount} />节</strong>
                      </div>
                      <div style={{ background: 'rgba(201,164,92,.12)', borderRadius: 10, padding: '7px 2px', color: '#123C35', display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                        <span style={{ color: '#7A6A45', fontSize: 10.5 }}>本周已约</span>
                        <strong style={{ fontSize: 15, color: '#123C35', fontWeight: 700 }}><AnimatedNumber value={stats.bookedCount} />节</strong>
                      </div>
                    </div>
                    {latestFeedback && (
                      <div style={{ marginTop: 10, fontSize: 12, color: '#7A6A45', background: 'rgba(201,164,92,.10)', borderRadius: 10, padding: '8px 10px', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        <ReadOutlined style={{ color: '#C9A45C', marginTop: 2 }} />
                        <span style={{ lineHeight: 1.5 }}>{String(latestFeedback.summary).slice(0, 56)}…</span>
                      </div>
                    )}
                    <div style={{ marginTop: 10, fontSize: 12, color: 'var(--color-brand-gold)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                      查看课程详情 <RightOutlined style={{ fontSize: 10 }} />
                    </div>
                  </ParentCard>
                </button>
              )
            })}
          </div>
        </>
      )}

      {!students.length ? (
        <ParentCard style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BrandEmpty title="暂未绑定学员" hint="绑定孩子后即可查看课程安排" icon={<LinkOutlined />} />
        </ParentCard>
      ) : childLessons.length === 0 ? (
        <div style={{ display: 'grid', gap: 10 }}>
          <ParentCard style={{ minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BrandEmpty title="所选周暂无课程" hint="本周该同学没有小班课程安排，可切换其他周查看；已报名班级如下" icon={<CalendarOutlined />} />
          </ParentCard>

          {normalEnrollments.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <Text strong style={{ fontSize: 14 }}>已报名小班课程</Text>
                <Text type="secondary" style={{ fontSize: 11.5 }}>{normalEnrollments.length} 个班级</Text>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {normalEnrollments.map((enrollment, enrollmentIndex) => {
                  const group = enrollment.group
                  const days = (group?.recurringDays || [])
                    .slice()
                    .sort((a, b) => a - b)
                    .map((day) => WEEKDAYS[day])
                    .join('、')
                  return (
                    <ParentCard key={enrollment.id} className="stagger-item" style={{ padding: 13, borderLeft: '3px solid #E8784A', animationDelay: `${Math.min(enrollmentIndex, 8) * 40}ms` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <Text strong style={{ fontSize: 13.5, display: 'block', overflowWrap: 'anywhere' }}>
                            {group?.course?.name || group?.name || '小班课程'}
                          </Text>
                          <div style={{ fontSize: 12, color: '#5a4e3a', marginTop: 3, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                            <span>{group?.course?.subject || '学科'}</span>
                            {days && <span>· 每周{days} {group?.lessonStartTime || ''}</span>}
                          </div>
                        </div>
                        <Tag color={group?.status === 'PAUSED' ? 'orange' : 'green'} style={{ margin: 0, borderRadius: 999, flexShrink: 0 }}>
                          {group?.status === 'PAUSED' ? '暂停中' : '在读'}
                        </Tag>
                      </div>
                      <div style={{ marginTop: 9, fontSize: 11.5, color: '#98A2B3', lineHeight: 1.55 }}>
                        该班本周无排课（可能处于结课、停课或跨批次状态），如临时加课会显示在上方课表中。
                      </div>
                    </ParentCard>
                  )
                })}
              </div>
            </>
          )}
        </div>
      ) : isMobile ? (
        <div className={styles.timelineContainer}>
          {filteredMobileLessonGroups.length === 0 ? (
            <ParentCard style={{ minHeight: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BrandEmpty
                title={selectedFilterDateKey ? '该天暂无课程安排' : '所选周暂无课程'}
                hint={selectedFilterDateKey ? '该日没有排课，可点击上方日期切换其他天或查看整周。' : '本周该同学没有小班课程安排，可切换其他周查看。'}
                icon={<CalendarOutlined />}
                actionText={selectedFilterDateKey ? '查看本周全部' : undefined}
                onAction={selectedFilterDateKey ? () => setSelectedFilterDateKey(null) : undefined}
              />
            </ParentCard>
          ) : (
            filteredMobileLessonGroups.map((group, groupIndex) => {
              const expanded = isDateExpanded(group.key, groupIndex)
              const isToday = group.key === today.toDateString()
              const isPast = group.date < new Date(today.getFullYear(), today.getMonth(), today.getDate())

              return (
                <div key={group.key} className="stagger-item" style={{ display: 'grid', gap: 10, opacity: isPast ? 0.72 : 1, animationDelay: `${Math.min(groupIndex, 8) * 40}ms` }}>
                  <div
                    className={styles.daySectionHeader}
                    onClick={() => setExpandedDates((current) => ({ ...current, [group.key]: !expanded }))}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setExpandedDates((current) => ({ ...current, [group.key]: !expanded }))
                      }
                    }}
                  >
                    <div className={styles.dayHeaderLeft}>
                      <span className={styles.dayHeaderDate}>{fmtDate(group.date)}</span>
                      <span className={styles.dayHeaderBadge}>{group.lessons.length} 节课程</span>
                      {isToday && (
                        <span className={`${styles.dayHeaderBadge} ${styles.dayHeaderTodayBadge}`}>
                          今天
                        </span>
                      )}
                    </div>
                    {expanded ? (
                      <DownOutlined style={{ color: 'var(--color-primary)', fontSize: 12 }} />
                    ) : (
                      <RightOutlined style={{ color: 'var(--color-ink-subtle)', fontSize: 12 }} />
                    )}
                  </div>

                  {expanded && (
                    <div className={styles.timelineList}>
                      {group.lessons.map((lesson) => {
                        const status = getLessonStatus(lesson)
                        const subject = getLessonSubject(lesson) || '综合'
                        const subjectColor = getSubjectColor(subject)
                        const teacherName = lesson.teacher?.name || lesson.group?.teacher?.name || '授课老师'
                        const roomName = lesson.group?.room?.name
                        const duration = getLessonDuration(lesson.startTime, lesson.endTime)
                        const cleanName = cleanCourseName(lesson.group?.course?.name)

                        let statusBadgeClass = styles.statusUpcoming
                        if (status.text === '已结束') statusBadgeClass = styles.statusEnded
                        else if (status.text === '上课中') statusBadgeClass = styles.statusActive
                        else if (status.text === '待老师确认') statusBadgeClass = styles.statusConfirm

                        const feedback = lesson.classroomFeedbacks?.find((f) =>
                          f.studentIds?.some((id) => selectedStudentRecordIds.has(id)) || f.summary,
                        )

                        const openLessonDetail = () => {
                          router.push(buildParentLessonDetailHref({
                            lessonId: lesson.id,
                            teacher: teacherName,
                            course: cleanName,
                            childId: selectedStudentId,
                            time: `${lesson.startTime}-${lesson.endTime}`,
                            room: roomName || '',
                            lessonDate: lesson.lessonDate ? String(lesson.lessonDate).slice(0, 10) : '',
                          }))
                        }

                        return (
                          <div key={lesson.id} className={styles.timelineItem} style={{ '--dot-color': subjectColor } as React.CSSProperties}>
                            <span className={styles.timelineDot} />
                            <article
                              className={styles.lessonCard}
                              onClick={openLessonDetail}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  openLessonDetail()
                                }
                              }}
                            >
                              <div className={styles.lessonTopRow}>
                                <div className={styles.timeBlock}>
                                  <span className={styles.timeStart}>{lesson.startTime}</span>
                                  <span className={styles.timeDivider}>–</span>
                                  <span className={styles.timeEnd}>{lesson.endTime}</span>
                                  {duration && <span className={styles.durationPill}>{duration}</span>}
                                </div>
                                <span className={`${styles.statusBadge} ${statusBadgeClass}`}>
                                  {status.text}
                                </span>
                              </div>

                              <div className={styles.lessonMainRow}>
                                <span className={styles.subjectTag} style={{ background: subjectColor }}>
                                  {subject}
                                </span>
                                <h3 className={styles.courseTitle}>{cleanName}</h3>
                              </div>

                              <div className={styles.lessonDetailsRow}>
                                <div className={styles.detailItem}>
                                  <TeamOutlined className={styles.detailIcon} />
                                  <span>{teacherName}老师</span>
                                </div>
                                {roomName && (
                                  <div className={styles.detailItem}>
                                    <EnvironmentOutlined className={styles.detailIcon} />
                                    <span>{roomName}</span>
                                  </div>
                                )}
                              </div>

                              <div className={styles.lessonFooter}>
                                <span>
                                  {lesson.attendanceSubmittedAt ? '已确认考勤' : '待老师确认考勤'} · 课时：{status.deducted}
                                </span>
                                {feedback ? (
                                  <Link
                                    href={`/parent/class-feedback/${feedback.id}${selectedStudentId ? `?childId=${selectedStudentId}` : ''}`}
                                    className={styles.feedbackLink}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ReadOutlined /> 查看课堂反馈 ›
                                  </Link>
                                ) : (
                                  <span style={{ fontSize: 11, color: 'var(--color-ink-subtle)' }}>
                                    详情 ›
                                  </span>
                                )}
                              </div>
                            </article>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      ) : (
        <ParentCard style={{ padding: 0, overflow: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '56px repeat(7, minmax(58px, 1fr))' : '72px repeat(7, minmax(72px, 1fr))', minWidth: isTablet ? 0 : 640 }}>
            <div style={{ padding: 8, background: '#faf8f5', borderBottom: '0.5px solid #EEE7E1' }} />
            {weekDates.map((date, i) => {
              const isToday = date.toDateString() === today.toDateString()
              return (
                <div key={i} style={{ textAlign: 'center', padding: '8px 4px', background: isToday ? '#FFF6F1' : undefined, borderBottom: '0.5px solid #EEE7E1' }}>
                  <div style={{ fontSize: 10, color: '#98A2B3' }}>{WEEKDAYS[i]}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? '#E8784A' : '#1F2329' }}>{date.getDate()}</div>
                </div>
              )
            })}
            {periods.map(period => {
              const h = period.type === 'CLASS' ? 70 : period.type === 'BIG_BREAK' ? 20 : period.type === 'LUNCH' ? 24 : 16
              return (
                <div key={period.id} style={{ display: 'contents' }}>
                  <div style={{ minHeight: h, background: PERIOD_BG[period.type], borderRight: '0.5px solid #EEE7E1', borderBottom: '0.5px solid #EEE7E1', padding: '2px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
                    {period.type === 'CLASS' && <><div style={{ fontSize: 10, fontWeight: 500, color: '#E8784A' }}>{period.name}</div><div style={{ fontSize: 8, fontFamily: 'monospace', color: '#98A2B3' }}>{period.start}–{period.end}</div></>}
                    {period.type === 'BREAK' && <span style={{ fontSize: 9, fontStyle: 'italic', color: '#98A2B3' }}>课间</span>}
                    {period.type === 'BIG_BREAK' && <span style={{ fontSize: 9, fontWeight: 500, color: '#534AB7' }}>大课间</span>}
                    {period.type === 'LUNCH' && <span style={{ fontSize: 9, fontWeight: 500, color: '#1D9E75' }}>午休</span>}
                  </div>
                  {weekDates.map((_, dayIdx) => {
                    const items = grid[`${dayIdx}-${period.id}`] || []
                    const hasItem = items.length > 0 && period.type === 'CLASS'
                    return (
                      <div key={dayIdx} style={{ minHeight: h, borderRight: '0.5px solid #EEE7E1', borderBottom: '0.5px solid #EEE7E1', padding: 3, background: PERIOD_BG[period.type] }}>
                        {hasItem ? items.map((l) => {
                          const subject = getLessonSubject(l)
                          const color = getSubjectColor(subject)
                          const status = getLessonStatus(l)
                          return (
                            <div key={l.id} style={{ borderLeft: `3px solid ${color}`, background: `${color}10`, borderRadius: 5, padding: '5px 7px', height: '100%', minHeight: 54, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                              <div style={{ fontSize: 11, fontWeight: 500, color, lineHeight: 1.3 }}>{l.group?.course?.name || '-'}</div>
                              <div style={{ fontSize: 10, color, opacity: .8, lineHeight: 1.3 }}><TeamOutlined style={{ fontSize: 9 }} /> {l.teacher?.name || l.group?.teacher?.name || '-'}老师 · {subject || '学科待定'}</div>
                              <div style={{ fontSize: 9, color, opacity: .6, lineHeight: 1.3 }}><EnvironmentOutlined style={{ fontSize: 8 }} /> {l.group?.room?.name || '-'}</div>
                              <Tag className={status.text === '待老师确认' ? 'status-breathe' : undefined} color={status.color} style={{ alignSelf: 'flex-start', marginTop: 3, fontSize: 9, lineHeight: 1.4 }}>{status.text}</Tag>
                            </div>
                          )
                        }) : period.type === 'CLASS' ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 40 }}>
                            <span style={{ fontSize: 11, color: '#ddd' }}>—</span>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </ParentCard>
      )}

      {childCancelledLessons.length > 0 && (
        <section aria-label="本周停课记录" style={{ marginTop: 18 }}>
          <Title level={5} style={{ marginBottom: 10 }}>本周停课记录</Title>
          <div style={{ display: 'grid', gap: 8 }}>
            {childCancelledLessons.map((lesson, lessonIndex) => (
              <ParentCard key={lesson.id} className="stagger-item" style={{ padding: isMobile ? 12 : 16, animationDelay: `${Math.min(lessonIndex, 8) * 40}ms` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <Text strong>{lesson.group?.course?.name || '课程'} · {lesson.subject || lesson.group?.course?.subject || '学科待确认'}</Text>
                    <div style={{ color: 'var(--color-ink-muted)', fontSize: 13, marginTop: 4 }}>
                      {fmtDate(lesson.lessonDate)} {lesson.startTime}-{lesson.endTime}
                    </div>
                    {lesson.cancelReason && <div style={{ color: 'var(--color-ink-muted)', fontSize: 13, marginTop: 4 }}>原因：{lesson.cancelReason}</div>}
                  </div>
                  <Tag color="default" style={{ margin: 0, flexShrink: 0 }}>已停课</Tag>
                </div>
              </ParentCard>
            ))}
          </div>
        </section>
      )}

      {students.length > 0 && (intensiveEnrollments.length > 0 || childHistoryLessons.length > 0) && (
        <section style={{ marginTop: 18 }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 10,
          }}>
            <div>
              <Title level={5} style={{ margin: 0 }}>个性化课程上课记录</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                课时以管理员审核通过的实际授课分钟为准
              </Text>
            </div>
            <Tag color="purple" style={{ margin: 0, borderRadius: 999 }}>
              最近{Math.min(childHistoryLessons.length, 10)}节
            </Tag>
          </div>

          {childHistoryLessons.length === 0 ? (
            <ParentCard style={{ padding: 20 }}>
              <BrandEmpty title="暂无个性化课程上课记录" hint="教师提交考勤后会显示在这里" icon={<ReadOutlined />} />
            </ParentCard>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {childHistoryLessons.slice(0, 10).map((lesson, lessonIndex) => {
    const attendance = lesson.attendances?.find((item) => selectedStudentRecordIds.has(item.studentId))
                const review = lesson.intensiveReviews?.[0]
    const feedback = lesson.classroomFeedbacks?.find((item) => item.studentIds?.some((studentId) => selectedStudentRecordIds.has(studentId)))
                const reviewStatus = lesson.intensiveReviewStatus || review?.status
                const statusMeta = reviewStatus === 'APPROVED'
                  ? { label: '已审核', color: 'green' }
                  : reviewStatus === 'REJECTED'
                    ? { label: '已驳回待修改', color: 'red' }
                    : { label: '待管理员审核', color: 'orange' }
                const minutes = Number(attendance?.actualMinutes || lesson.actualMinutes || review?.actualMinutes || 0)
                const approvedTeachingHours = reviewStatus === 'APPROVED'
                  ? calculateIntensiveDeductHours(attendance?.status || '', minutes)
                  : 0
                return (
                  <ParentCard
                    key={lesson.id}
                    className="stagger-item"
                    style={{
                      padding: isMobile ? 14 : 16,
                      borderLeft: `3px solid ${reviewStatus === 'APPROVED' ? '#1D9E75' : '#E8784A'}`,
                      animationDelay: `${Math.min(lessonIndex, 8) * 40}ms`,
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 10,
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <Text strong style={{ display: 'block', overflowWrap: 'anywhere' }}>
                          {getLessonSubject(lesson) || lesson.group?.course?.name || '个性化课程'}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {lesson.teacher?.name || lesson.group?.teacher?.name || '-'}老师 · {intensiveTeachingTypeLabel(lesson.group?.teachingType)}
                        </Text>
                      </div>
                      <Tag color={statusMeta.color} style={{ margin: 0, borderRadius: 999, flexShrink: 0 }}>
                        {statusMeta.label}
                      </Tag>
                    </div>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, minmax(0, 1fr))',
                      gap: 8,
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 10,
                      background: '#faf8f5',
                      fontSize: 12,
                    }}>
                      <span><ClockCircleOutlined /> 日期<br /><strong>{fmtDate(lesson.lessonDate)}</strong></span>
                      <span>时间<br /><strong>{lesson.startTime}-{lesson.endTime}</strong></span>
                      <span>实际授课<br /><strong>{minutes ? `${minutes}分钟` : '待确认'}</strong></span>
                      <span><CheckCircleOutlined /> 计入授课<br /><strong>{approvedTeachingHours.toFixed(2)}小时</strong></span>
                    </div>
                    <div style={{
                      marginTop: 10,
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 8,
                      color: '#5a4e3a',
                      fontSize: 12,
                    }}>
                      <span>考勤：{attendance?.status === 'PRESENT' ? '出勤' : attendance?.status === 'LEAVE' ? '请假' : attendance?.status === 'ABSENT' ? '缺勤' : attendance?.status === 'MAKEUP' ? '补课' : '待确认'}</span>
                      {feedback ? (
                        <button
                          type="button"
                          onClick={() => router.push(`/parent/class-feedback/${feedback.id}?childId=${encodeURIComponent(selectedStudentId)}`)}
                          style={{
                            minHeight: 44,
                            border: '1px solid rgba(232,120,74,.24)',
                            borderRadius: 10,
                            padding: '6px 10px',
                            background: '#fff6f1',
                            color: '#E8784A',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          <MessageOutlined /> 查看课堂反馈
                        </button>
                      ) : (
                        <Tag style={{ margin: 0, borderRadius: 999 }}>暂无课堂反馈</Tag>
                      )}
                    </div>
                  </ParentCard>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
    </PullToRefresh>
  )
}
