'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { Card, Space, Tag, Typography } from 'antd'
import { BellOutlined, CalendarOutlined, CoffeeOutlined, DownOutlined, EnvironmentOutlined, RightOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
import { findSchedulePeriod, PERIOD_HEIGHTS, PERIOD_BG } from '@/lib/schedule-periods'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSchedulePeriods } from '@/hooks/useSchedulePeriods'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { PullToRefresh } from '@/components/PullToRefresh'
import { localDateKey } from '@/lib/date/local-day'

const { Title, Text } = Typography
const fetcher = (url: string) => fetch(url).then(r => r.json())

function dateKey(date: Date) {
  return date.toDateString()
}

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const INTENSIVE_SLOTS = [
  { id:'h08', start:'08:00', end:'09:00', label:'08:00–09:00' },
  { id:'h09', start:'09:00', end:'10:00', label:'09:00–10:00' },
  { id:'h10', start:'10:00', end:'11:00', label:'10:00–11:00' },
  { id:'h11', start:'11:00', end:'12:00', label:'11:00–12:00' },
  { id:'h14', start:'14:00', end:'15:00', label:'14:00–15:00' },
  { id:'h15', start:'15:00', end:'16:00', label:'15:00–16:00' },
  { id:'h16', start:'16:00', end:'17:00', label:'16:00–17:00' },
]
const INTENSIVE_CONFIG: Record<string, { label:string; color:string; bg:string }> = {
  ONE_ON_ONE:   { label:'一对一', color:'#534AB7', bg:'rgba(83,74,183,.1)' },
  ONE_ON_TWO:   { label:'一对二', color:'#D4537E', bg:'rgba(212,83,126,.1)' },
  ONE_ON_THREE: { label:'一对三', color:'#185FA5', bg:'rgba(24,95,165,.1)' },
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
  monday.setHours(0,0,0,0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23,59,59,999)
  return { start: monday, end: sunday }
}

export default function TeacherSchedulePage() {
  const isMobile = useIsMobile() ?? false
  const isTablet = useIsMobile(1025) ?? false
  const [scheduleType, setScheduleType] = useState<'group'|'intensive'|'studyHall'>('group')
  const [weekOffset, setWeekOffset] = useState(0)
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})
  const { periods } = useSchedulePeriods()
  const { start, end } = getWeekRange(weekOffset)
  const startDate = localDateKey(start)
  const endDate = localDateKey(end)

  // Fetch both types for stats
  const { data: groupData, isLoading: loadingGroup, mutate: mutateGroup } = useSWR<ScheduleResponse>(
    `/api/teacher/schedule?startDate=${startDate}&endDate=${endDate}&type=GROUP`, fetcher
  )
  const { data: intensiveData, isLoading: loadingIntensive, mutate: mutateIntensive } = useSWR<ScheduleResponse>(
    `/api/teacher/schedule?startDate=${startDate}&endDate=${endDate}&type=INTENSIVE`, fetcher
  )
  const { data: studyHallData, isLoading: loadingStudyHall, mutate: mutateStudyHall } = useSWR<ScheduleResponse>(
    `/api/teacher/schedule?startDate=${startDate}&endDate=${endDate}&type=STUDY_HALL`, fetcher
  )

  const groupLessons = useMemo(() => Array.isArray(groupData?.lessons) ? groupData.lessons : [], [groupData])
  const intensiveLessons = useMemo(() => Array.isArray(intensiveData?.lessons) ? intensiveData.lessons : [], [intensiveData])
  const studyHallLessons = useMemo(() => Array.isArray(studyHallData?.lessons) ? studyHallData.lessons : [], [studyHallData])
  const allLessons = useMemo(() => [...groupLessons, ...intensiveLessons, ...studyHallLessons], [groupLessons, intensiveLessons, studyHallLessons])
  const isLoading = loadingGroup || loadingIntensive || loadingStudyHall

  // Stats
  const stats = useMemo(() => {
    const uniqueStudentIds = new Set<string>()
    allLessons.forEach((lesson) => {
      lesson.group?.enrollments?.forEach((enrollment) => { if (enrollment.student?.id) uniqueStudentIds.add(enrollment.student.id) })
    })
    return {
      total: allLessons.length,
      completed: allLessons.filter((lesson) => lesson.status === 'COMPLETED').length,
      students: uniqueStudentIds.size,
    }
  }, [allLessons])

  // Group grid: day × period matrix
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

  // Intensive grid: day × hour slot
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

  const weekDates = useMemo(() => {
    const d = new Date(`${startDate}T00:00:00`)
    return WEEKDAYS.map((_, i) => { const nd = new Date(d); nd.setDate(d.getDate() + i); return nd })
  }, [startDate])
  const visibleLessons = useMemo(
    () => scheduleType === 'group' ? groupLessons : scheduleType === 'intensive' ? intensiveLessons : studyHallLessons,
    [groupLessons, intensiveLessons, scheduleType, studyHallLessons],
  )
  const mobileLessonsByDay = useMemo(() => {
    const today = new Date().toDateString()
    const days = weekDates.map((date, index) => {
      const lessons = visibleLessons
        .filter((lesson) => localDateKey(lesson.lessonDate) === localDateKey(date))
        .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')))
      return { key: dateKey(date), date, label: WEEKDAYS[index], lessons, isToday: date.toDateString() === today }
    })
    return [...days].sort((a, b) => {
      if (a.isToday !== b.isToday) return a.isToday ? -1 : 1
      return a.date.getTime() - b.date.getTime()
    })
  }, [visibleLessons, weekDates])

  useEffect(() => {
    if (!isMobile) return
    const todayGroup = mobileLessonsByDay.find((day) => day.isToday)
    const fallbackGroup = mobileLessonsByDay.find((day) => day.lessons.length > 0) || mobileLessonsByDay[0]
    const openKey = todayGroup?.key || fallbackGroup?.key
    setExpandedDays(openKey ? { [openKey]: true } : {})
  }, [isMobile, mobileLessonsByDay])

  return (
    <PullToRefresh onRefresh={async () => { await Promise.all([mutateGroup(), mutateIntensive(), mutateStudyHall()]) }}>
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: 16, flexWrap: 'wrap', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>我的课表</Title>
          <Text type="secondary">{startDate} 至 {endDate}</Text>
        </div>
        <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : undefined }}>
          {/* Week nav */}
          <button onClick={() => setWeekOffset(o => o - 1)} style={{ ...navBtnStyle, flex: isMobile ? 1 : undefined }}>←</button>
          <button onClick={() => setWeekOffset(0)} style={{ ...navBtnStyle, flex: isMobile ? 1 : undefined }}>本周</button>
          <button onClick={() => setWeekOffset(o => o + 1)} style={{ ...navBtnStyle, flex: isMobile ? 1 : undefined }}>→</button>
        </div>
      </div>

      {/* Type tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', border: '1px solid var(--color-hairline)', borderRadius: 10, overflow: 'hidden', width: isMobile ? '100%' : 540, marginBottom: 12, background: 'var(--color-surface-1)' }}>
        <button onClick={() => setScheduleType('group')} style={{
          padding: '9px 10px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: scheduleType === 'group' ? 600 : 400,
          background: scheduleType === 'group' ? '#E8784A' : 'transparent',
          color: scheduleType === 'group' ? '#fff' : 'var(--color-text-secondary, #666)',
        }}>精品班课</button>
        <button onClick={() => setScheduleType('intensive')} style={{
          padding: '9px 10px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: scheduleType === 'intensive' ? 600 : 400,
          background: scheduleType === 'intensive' ? '#534AB7' : 'transparent',
          color: scheduleType === 'intensive' ? '#fff' : 'var(--color-text-secondary, #666)',
        }}>突击全能班</button>
        <button onClick={() => setScheduleType('studyHall')} style={{
          padding: '9px 10px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: scheduleType === 'studyHall' ? 600 : 400,
          background: scheduleType === 'studyHall' ? '#E8784A' : 'transparent',
          color: scheduleType === 'studyHall' ? '#fff' : 'var(--color-ink-muted)',
        }}>晚托作业班</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: isMobile ? 8 : 12, marginBottom: 16 }}>
        <Card bordered={false} style={{ borderRadius: 10 }}><Text type="secondary" style={{ fontSize: isMobile ? 11 : undefined }}>本周课次</Text><div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700 }}>{stats.total}</div></Card>
        <Card bordered={false} style={{ borderRadius: 10 }}><Text type="secondary" style={{ fontSize: isMobile ? 11 : undefined }}>已完成</Text><div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#1D9E75' }}>{stats.completed}</div></Card>
        <Card bordered={false} style={{ borderRadius: 10 }}><Text type="secondary" style={{ fontSize: isMobile ? 11 : undefined }}>在带学员</Text><div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#E8784A' }}>{stats.students}</div></Card>
      </div>

      {isLoading ? <CardSkeleton rows={3} /> : (
        isMobile ? (
          <Card bordered={false} title="本周课程列表" style={{ borderRadius: 10 }}>
            {visibleLessons.length === 0 ? <BrandEmpty title="本周暂无课程" icon={<CalendarOutlined />} /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mobileLessonsByDay.map((day, dayIndex) => (
                  <div className="stagger-item" key={day.key} style={{ animationDelay: `${Math.min(dayIndex, 8) * 40}ms`, border: '1px solid #EEE7E1', borderRadius: 12, background: day.isToday ? '#FFF8F4' : '#fff', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setExpandedDays((prev) => ({ ...prev, [day.key]: !prev[day.key] }))}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 10,
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontWeight: 800, color: day.isToday ? 'var(--color-primary)' : 'var(--color-ink)' }}>
                          {day.isToday ? '今天 · ' : ''}{day.label} {day.date.getMonth() + 1}月{day.date.getDate()}日
                        </span>
                        <span style={{ color: '#8D806F', fontSize: 12 }}>{day.lessons.length} 节课</span>
                      </span>
                      {expandedDays[day.key] ? <DownOutlined style={{ color: '#E8784A' }} /> : <RightOutlined style={{ color: '#E8784A' }} />}
                    </button>
                    <div style={{ display: 'none' }}>
                      {day.label} {day.date.getMonth() + 1}月{day.date.getDate()}日
                    </div>
                    {expandedDays[day.key] && (day.lessons.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 12px 12px' }}>
                        {day.lessons.map((lesson) => {
                          const teachingType = lesson.group?.teachingType || 'ONE_ON_ONE'
                          const intensiveCfg = INTENSIVE_CONFIG[teachingType] || INTENSIVE_CONFIG.ONE_ON_ONE
                          const accent = scheduleType === 'intensive' ? intensiveCfg.color : '#E8784A'
                          const lessonSubject = lesson.subject || lesson.group?.course?.subject
                          const workflowStatus = scheduleType === 'intensive'
                            ? getIntensiveWorkflowStatus(lesson)
                            : scheduleType === 'studyHall'
                              ? { label: '作业班安排', color: 'orange' }
                            : {
                                label: lesson.status === 'COMPLETED' ? '已完成' : '待上课',
                                color: lesson.status === 'COMPLETED' ? 'green' : 'orange',
                              }
                          return (
                            <div key={lesson.id} style={{ border: '1px solid #EEE7E1', borderTop: `3px solid ${accent}`, borderRadius: 10, padding: '10px 12px', background: '#fff', minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ color: accent, fontWeight: 700, fontSize: 13 }}>
                                  {lesson.startTime || '-'}{lesson.endTime ? `–${lesson.endTime}` : ''}
                                </span>
                                <Tag color={workflowStatus.color}
                                  style={{ marginInlineEnd: 0, fontSize: 11 }}>
                                  {workflowStatus.label}
                                </Tag>
                              </div>
                              <div style={{ fontWeight: 700, color: 'var(--color-ink)', fontSize: 14, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {lesson.group?.name || lesson.group?.course?.name || '-'}
                              </div>
                              {lessonSubject && (
                                <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 9999,
                                  background: `${accent}18`, color: accent, marginBottom: 4, display: 'inline-block' }}>
                                  {lessonSubject}
                                </span>
                              )}
                              <div style={{ display: 'flex', gap: 12, color: '#8D806F', fontSize: 12, marginTop: 4 }}>
                                <span><EnvironmentOutlined /> {lesson.group?.room?.name || '-'}</span>
                                <span><TeamOutlined /> {lesson.lessonStudents?.length || lesson.group?.enrollments?.length || 0}人</span>
                                {scheduleType === 'intensive' && (
                                  <span><UserOutlined /> {(lesson.lessonStudents?.map((item) => item.student?.name).filter(Boolean).join('、')) || '-'}</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--color-ink-subtle)', fontSize: 12, padding: '4px 0 8px' }}>暂无课程</div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) :
        scheduleType === 'studyHall' ? (
          studyHallLessons.length === 0 ? <BrandEmpty title="本周暂无晚托或作业辅导安排" icon={<CalendarOutlined />} /> : (
            <Card bordered={false} title="晚托与作业辅导" style={{ borderRadius: 12 }} styles={{ body: { padding: 12 } }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mobileLessonsByDay.filter((day) => day.lessons.length > 0).map((day) => (
                  <div key={day.key} style={{ padding: 12, borderRadius: 10, background: day.isToday ? 'var(--color-primary-bg)' : 'var(--color-surface-2)', border: '1px solid var(--color-hairline)' }}>
                    <Text strong style={{ display: 'block', marginBottom: 8, color: day.isToday ? 'var(--color-primary)' : 'var(--color-ink)' }}>{day.isToday ? '今天，' : ''}{day.label} {day.date.getMonth() + 1}月{day.date.getDate()}日</Text>
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      {day.lessons.map((lesson) => <div key={lesson.id} style={{ display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr) auto', gap: 12, alignItems: 'center', padding: '10px 12px', background: 'var(--color-surface-1)', borderRadius: 10 }}>
                        <Text strong style={{ color: 'var(--color-primary)' }}>{lesson.startTime} 至 {lesson.endTime}</Text>
                        <div><Text strong>{lesson.group?.name}</Text><br /><Text type="secondary">{lesson.subject}</Text></div>
                        <Tag color="orange">{lesson.group?.enrollments?.length || 0}名学员</Tag>
                      </div>)}
                    </Space>
                  </div>
                ))}
              </div>
            </Card>
          )
        ) : scheduleType === 'group' ? (
          groupLessons.length === 0 ? <BrandEmpty title="本周暂无精品班课" icon={<CalendarOutlined />} /> : (
            <Card bordered={false} style={{ borderRadius: 10, overflow: 'auto' }} styles={{ body: { padding: 0 } }}>
              <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '56px repeat(7, minmax(58px, 1fr))' : '72px repeat(7, minmax(72px, 1fr))', minWidth: isTablet ? 0 : 640 }}>
                <div style={{ padding: 8, background: 'var(--color-background-secondary, #faf8f5)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)' }} />
                {weekDates.map((date, i) => {
                  const today = date.toDateString() === new Date().toDateString()
                  return (
                    <div key={i} style={{ textAlign: 'center', padding: '8px 4px', background: today ? '#FFF6F1' : undefined, borderBottom: '0.5px solid var(--color-border, #EEE7E1)' }}>
                      <div style={{ fontSize: 10, color: 'var(--color-ink-subtle)' }}>{WEEKDAYS[i]}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: today ? 'var(--color-primary)' : 'var(--color-ink)' }}>{date.getDate()}</div>
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
                              <div key={lesson.id} style={{ background: 'rgba(232,120,74,.1)', borderRadius: 5, padding: '5px 7px', minHeight: 58, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ fontSize: 11, fontWeight: 500, color: '#E8784A', lineHeight: 1.3 }}>{lesson.group?.course?.name || lesson.group?.name || '-'}</div>
                                <div style={{ fontSize: 10, color: '#993C1D', lineHeight: 1.3 }}><EnvironmentOutlined style={{ fontSize: 9 }} /> {lesson.group?.room?.name || '-'}</div>
                                <div style={{ fontSize: 10, color: '#993C1D', lineHeight: 1.3 }}><TeamOutlined style={{ fontSize: 9 }} /> {lesson.group?.enrollments?.length || 0}人</div>
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
          intensiveLessons.length === 0 ? <BrandEmpty title="本周暂无突击全能班课程" icon={<CalendarOutlined />} /> : (
            <Card bordered={false} style={{ borderRadius: 10, overflow: 'auto' }} styles={{ body: { padding: 0 } }}>
              <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '56px repeat(7, minmax(58px, 1fr))' : '72px repeat(7, minmax(72px, 1fr))', minWidth: isTablet ? 0 : 640 }}>
                <div style={{ padding: 8, background: 'var(--color-background-secondary, #faf8f5)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)' }} />
                {weekDates.map((date, i) => {
                  const today = date.toDateString() === new Date().toDateString()
                  return (
                    <div key={i} style={{ textAlign: 'center', padding: '8px 4px', background: today ? '#F5F0FF' : undefined, borderBottom: '0.5px solid var(--color-border, #EEE7E1)' }}>
                      <div style={{ fontSize: 10, color: 'var(--color-ink-subtle)' }}>{WEEKDAYS[i]}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: today ? '#534AB7' : 'var(--color-ink)' }}>{date.getDate()}</div>
                    </div>
                  )
                })}
                {INTENSIVE_SLOTS.map((slot) => {
                  const isNoon = slot.start === '12:00'
                  const h = isNoon ? 22 : 68
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
                              const feedbackStudentIds = new Set((lesson.classroomFeedbacks || []).flatMap((item) => item.studentIds || []))
                              const pendingFeedback = lesson.status === 'COMPLETED'
                                ? (lesson.lessonStudents || []).filter((item) => !item.studentId || !feedbackStudentIds.has(item.studentId)).length
                                : 0
                              return (
                                <div key={lesson.id} style={{ background: cfg.bg, borderRadius: 5, padding: '5px 7px', minHeight: 56, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                  <div style={{ fontSize: 9, fontWeight: 500, color: cfg.color, background: `${cfg.color}18`, padding: '0 4px', borderRadius: 3, alignSelf: 'flex-start', marginBottom: 3 }}>{cfg.label}</div>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: cfg.color, lineHeight: 1.3 }}>{lesson.teacher?.name || lesson.teacherId || '-'}</div>
                                  <div style={{ fontSize: 11, color: cfg.color, lineHeight: 1.3 }}><UserOutlined style={{ fontSize: 10 }} /> {studentName}</div>
                                  <div style={{ fontSize: 10, color: cfg.color, opacity: .8, lineHeight: 1.3 }}>{lesson.subject || lesson.group?.course?.subject || '-'}</div>
                                  <div style={{ fontSize: 9, color: cfg.color, fontWeight: 700, lineHeight: 1.3 }}>{workflowStatus.label}</div>
                                  <div style={{ fontSize: 9, color: cfg.color, opacity: .75, lineHeight: 1.3 }}>
                                    本节 {((Number(lesson.actualMinutes || lesson.plannedMinutes || 0)) / 60).toFixed(2)} 小时 · 待反馈 {pendingFeedback} 人
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

const navBtnStyle: React.CSSProperties = { border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 13 }
