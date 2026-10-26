'use client'

import { useMemo, useState } from 'react'
import { Select, Tag, Typography } from 'antd'
import {
  CheckCircleOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
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
import { fmtDate } from '@/lib/format-date'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { ParentCard } from '@/components/Parent/ParentCard'
import { PullToRefresh } from '@/components/PullToRefresh'
import { useRouter } from 'next/navigation'
import { isParentStudentInLesson } from '@/lib/parent-lesson-visibility'
import {
  calculateIntensiveDeductHours,
  intensiveTeachingTypeLabel,
} from '@/lib/intensive-class'

const { Title, Text } = Typography
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

type ScheduledStudent = { id: string; name: string; enrollments?: ScheduleEnrollment[] }
type ScheduleEnrollment = { id: string; group?: ScheduleGroup | null }
type ScheduleGroup = {
  id?: string; name?: string; intensiveMode?: string | null; teachingType?: string | null
  room?: { name?: string | null } | null
  course?: { name?: string | null; subject?: string | null } | null
  teacher?: { id?: string; name?: string | null } | null
  teacherAssignments?: Array<{ teacherId?: string; subject?: string | null }>
  enrollments?: Array<{ studentId?: string; subjects?: string[]; student?: { id?: string; name?: string | null } | null }>
}
type ScheduleLesson = {
  id: string; lessonDate: string | Date; startTime: string; endTime: string; subject?: string | null; isManual?: boolean; cancelReason?: string | null; _count?: { lessonStudents?: number }
  attendanceSubmittedAt?: string | null; actualMinutes?: number | null; intensiveReviewStatus?: string | null
  teacher?: { id?: string; name?: string | null } | null; group?: ScheduleGroup | null
  lessonStudents?: Array<{ studentId: string; student?: { name?: string | null } | null }>
  attendances?: Array<{ studentId: string; status?: string | null; actualMinutes?: number | null }>
  classroomFeedbacks?: Array<{ id: string; studentIds?: string[] }>
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

export function ParentScheduleClient({
  students,
  lessons,
  cancelledLessons,
  weekStart,
  historyLessons,
  intensiveSummary,
  periods,
}: {
  students: ScheduledStudent[]
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
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '')
  const [today] = useState(() => new Date())

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

  // Filter lessons for selected child
  const childLessons = useMemo(() => lessons.filter((lesson) =>
    isParentStudentInLesson(lesson, selectedStudentId)
  ), [lessons, selectedStudentId])
  const childCancelledLessons = useMemo(() => cancelledLessons.filter((lesson) =>
    isParentStudentInLesson(lesson, selectedStudentId)
  ), [cancelledLessons, selectedStudentId])

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

  const selectedStudent = students.find(s => s.id === selectedStudentId)
  const intensiveEnrollments = useMemo(() => selectedStudent?.enrollments || [], [selectedStudent?.enrollments])
  const childHistoryLessons = useMemo(() => (
    historyLessons.filter((lesson) => (
      lesson.lessonStudents?.some((item) => item.studentId === selectedStudentId)
    ))
  ), [historyLessons, selectedStudentId])
  const intensiveStatsByGroup = useMemo(() => {
    const result = new Map<string, { approvedHours: number; pendingCount: number; bookedCount: number }>()
    for (const enrollment of intensiveEnrollments) {
      const groupId = enrollment.group?.id
      if (!groupId) continue
      const summary = intensiveSummary.find((item) => (
        item.studentId === selectedStudentId && item.groupId === groupId
      ))
      result.set(groupId, summary || { approvedHours: 0, pendingCount: 0, bookedCount: 0 })
    }
    return result
  }, [intensiveEnrollments, intensiveSummary, selectedStudentId])
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

  const isDateExpanded = (key: string, index: number) => {
    if (key in expandedDates) return expandedDates[key]
    const todayKey = new Date().toDateString()
    const hasToday = mobileLessonGroups.some(group => group.key === todayKey)
    return hasToday ? key === todayKey : index === 0
  }

  return (
    <PullToRefresh onRefresh={async () => { router.refresh(); await new Promise((resolve) => setTimeout(resolve, 500)) }}>
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14, flexWrap: 'nowrap' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#1a1201', lineHeight: 1.2 }}>课程表</div>
          <div style={{ fontSize: 11.5, color: '#9a8e7a', marginTop: 2 }}>按周查看课程与停课记录</div>
        </div>
        <Select
          value={selectedStudentId || undefined}
          style={{ width: 108, flexShrink: 0 }}
          size="small"
          getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
          onChange={v => setSelectedStudentId(v)}
          options={students.map((student) => ({ label: student.name, value: student.id }))}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 16, width: '100%', maxWidth: '100%' }}>
        <button type="button" aria-label="查看上一周课程" disabled={!canChangeWeek(-1)} onClick={() => changeWeek(-1)}
          style={{ minWidth: 44, minHeight: 44, border: '1px solid var(--color-hairline-strong)', borderRadius: 10, background: 'var(--color-surface-1)', color: 'var(--color-ink-muted)' }}>
          <LeftOutlined />
        </button>
        <Text strong style={{ textAlign: 'center', fontSize: isMobile ? 13 : 15 }}>
          {fmtDate(weekDates[0])} 至 {fmtDate(weekDates[6])}
        </Text>
        <button type="button" aria-label="查看下一周课程" disabled={!canChangeWeek(1)} onClick={() => changeWeek(1)}
          style={{ minWidth: 44, minHeight: 44, border: '1px solid var(--color-hairline-strong)', borderRadius: 10, background: 'var(--color-surface-1)', color: 'var(--color-ink-muted)' }}>
          <RightOutlined />
        </button>
      </div>

      {intensiveEnrollments.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
          {intensiveEnrollments.map((enrollment) => (
            <ParentCard key={enrollment.id} style={{ padding: 14, width: '100%', maxWidth: '100%' }}>
              {(() => {
                const stats = intensiveStatsByGroup.get(enrollment.group?.id || '') || {
                  approvedHours: 0,
                  pendingCount: 0,
                  bookedCount: 0,
                }
                return (
                  <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                <div>
                  <Text strong>{enrollment.group?.course?.subject || enrollment.group?.course?.name}突击全能班</Text>
                  <div style={{ color: '#5a4e3a', fontSize: 12, marginTop: 3 }}>
                    {enrollment.group?.teacher?.name || '-'}老师 · {intensiveTeachingTypeLabel(enrollment.group?.teachingType)}
                  </div>
                </div>
                <Tag color="orange">突击全能班</Tag>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 12, fontSize: 12 }}>
                <span>已审核授课<br /><strong>{stats.approvedHours.toFixed(1)}小时</strong></span>
                <span>待审核授课<br /><strong>{stats.pendingCount}节</strong></span>
                <span>本周已约<br /><strong>{stats.bookedCount}节</strong></span>
              </div>
                  </>
                )
              })()}
            </ParentCard>
          ))}
        </div>
      )}

      {!students.length ? (
        <ParentCard style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BrandEmpty title="暂未绑定学员" hint="绑定孩子后即可查看课程安排" icon={<LinkOutlined />} />
        </ParentCard>
      ) : childLessons.length === 0 ? (
        <ParentCard style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BrandEmpty title="所选周暂无课程" hint="可切换其他周查看；临时加课后会出现在对应日期" icon={<CalendarOutlined />} />
        </ParentCard>
      ) : isMobile ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {mobileLessonGroups.map((group, groupIndex) => {
            const expanded = isDateExpanded(group.key, groupIndex)
            const isToday = group.key === today.toDateString()
            const isPast = group.date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
            return (
              <div className="stagger-item" key={group.key} style={{ display: 'grid', gap: 8, opacity: isPast ? .62 : 1, animationDelay: `${Math.min(groupIndex, 8) * 40}ms` }}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`parent-schedule-day-${groupIndex}`}
                  onClick={() => setExpandedDates(current => ({ ...current, [group.key]: !expanded }))}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(232,120,74,.18)',
                    borderLeft: '4px solid #E8784A', background: '#fff6f1', color: isToday ? '#E8784A' : '#5a4e3a', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {fmtDate(group.date)} · {group.lessons.length}节
                    {isToday && <span style={{ background: '#FFF3EC', color: '#E8784A', border: '1px solid #F5C9AE', borderRadius: 999, fontSize: 11, padding: '1px 8px' }}>今天</span>}
                  </span>
                  {expanded ? <DownOutlined style={{ color: '#E8784A' }} /> : <RightOutlined style={{ color: '#E8784A' }} />}
                </button>
                {expanded && <div id={`parent-schedule-day-${groupIndex}`} style={{ display: 'grid', gap: 8 }}>
                  {group.lessons.map((lesson, lessonIndex) => {
                  const status = getLessonStatus(lesson)
                  const statusBorder = { '已结束': '#1D9E75', '上课中': '#E8784A', '待上课': '#6B9FD8', '待老师确认': '#F0A24A' }[status.text] || '#EEE7E1'
                  const studentNames = lesson.isManual || lesson.group?.intensiveMode === 'INTENSIVE'
                    ? lesson.lessonStudents?.map((item) => item.student?.name).filter(Boolean).join('、') || selectedStudent?.name || '-'
                    : lesson.group?.enrollments?.map((enrollment) => enrollment.student?.name).filter(Boolean).join('、') || selectedStudent?.name || '-'
                  return (
                    <ParentCard key={lesson.id} className="stagger-item" style={{ padding: 14, borderLeft: `3px solid ${statusBorder}`, animationDelay: `${Math.min(lessonIndex, 8) * 40}ms` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                        <Text strong style={{ color: '#1F2329' }}>{lesson.group?.course?.name || '-'}</Text>
                        <Tag className={status.text === '待老师确认' ? 'status-breathe' : undefined} color={status.color}>{status.text}</Tag>
                      </div>
                      <div style={{ display: 'grid', gap: 5, fontSize: 12, color: '#5a4e3a' }}>
                        <span><ClockCircleOutlined style={{ marginRight: 5 }} />{fmtDate(lesson.lessonDate)} {lesson.startTime}-{lesson.endTime}</span>
                        <span><TeamOutlined style={{ marginRight: 5 }} />{lesson.teacher?.name || lesson.group?.teacher?.name || '-'}老师 · {getLessonSubject(lesson) || '学科待定'}</span>
                        <span><EnvironmentOutlined style={{ marginRight: 5 }} />{lesson.group?.room?.name || '-'}</span>
                        <span>学生：{studentNames}</span>
                        <span>考勤状态：{lesson.attendanceSubmittedAt ? '老师已确认' : '待老师确认'}</span>
                        <span>课时扣除：{status.deducted}</span>
                      </div>
                    </ParentCard>
                  )
                  })}
                </div>}
              </div>
            )
          })}
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
            {childCancelledLessons.map((lesson) => (
              <ParentCard key={lesson.id} style={{ padding: isMobile ? 12 : 16 }}>
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

      {students.length > 0 && (
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
              {childHistoryLessons.slice(0, 10).map((lesson) => {
                const attendance = lesson.attendances?.find((item) => item.studentId === selectedStudentId)
                const review = lesson.intensiveReviews?.[0]
                const feedback = lesson.classroomFeedbacks?.find((item) => item.studentIds?.includes(selectedStudentId))
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
                    style={{
                      padding: isMobile ? 14 : 16,
                      borderLeft: `3px solid ${reviewStatus === 'APPROVED' ? '#1D9E75' : '#E8784A'}`,
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
                          onClick={() => router.push(`/parent/class-feedback?childId=${encodeURIComponent(selectedStudentId)}&feedbackId=${encodeURIComponent(feedback.id)}`)}
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
