'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { Button, Card, Empty, InputNumber, List, Space, Tag, Typography } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, CoffeeOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'
import { formatRemaining } from '@/lib/lesson-units'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { StudentAvatar } from '@/components/Common/StudentAvatar'
import { StudyHallWorkspace } from '@/components/study-hall/StudyHallWorkspace'
import dayjs from 'dayjs'
import {
  resolveAttendanceSubmissionStatus,
  toAttendanceDisplayStatus,
  type AttendanceDisplayStatus,
  type AttendanceRecordStatus,
} from '@/lib/attendance-status'

const { Title, Text } = Typography
const fetcher = (url: string) => fetch(url).then(res => res.json())

const STATUS_CONFIG: Record<AttStatus, { label: string; className: string }> = {
  PRESENT: { label: '出勤', className: 'is-present' },
  LEAVE: { label: '请假', className: 'is-leave' },
}
type AttStatus = AttendanceDisplayStatus
type TeacherLesson = {
  id: string
  groupName?: string
  courseName?: string
  courseType?: string
  lessonMinutes?: number
  lessonDate?: string
  time?: string
  startTime?: string
  room?: string
  attendanceCount?: number
  attendanceSubmittedAt?: string | null
  status?: string
  scheduleKind?: string
}
type AttendanceStudent = {
  studentId: string
  enrollmentId?: string
  status?: AttendanceRecordStatus
  name?: string
  gender?: string | null
  photoUrl?: string | null
  membershipLevel?: string | null
  remainHours?: number
  courseType?: string | null
  lessonMinutes?: number
  eating?: boolean
}
type AttendanceLessonDetail = {
  id?: string
  groupName?: string
  courseName?: string
  courseType?: string
  lessonMinutes?: number
  lessonDate?: string
  startTime?: string
  endTime?: string
  intensiveMode?: string
  teachingType?: string | null
  plannedMinutes?: number | null
  actualMinutes?: number | null
  settlementStatus?: 'UNSETTLED' | 'SETTLED' | 'ADJUSTED'
  intensiveReviewStatus?: 'NOT_REQUIRED' | 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'
  latestReview?: {
    id: string
    status: string
    actualMinutes: number
    reviewNote?: string | null
  } | null
  isTeacherFirstLessonToday?: boolean
  isSystemFirstPeriod?: boolean
}

const STUDENT_COLORS = ['#E8784A','#1D9E75','#534AB7','#D4537E','#BA7517','#185FA5','#27500A','#72243E']
function getStudentBg(id: string) { return STUDENT_COLORS[(id || '').split('').reduce((a,c) => a + c.charCodeAt(0), 0) % STUDENT_COLORS.length] }

function attendanceTimeHint(lesson: Record<string, unknown> | undefined) {
  const startTime = (lesson?.startTime as string) || String(lesson?.time || '').slice(0, 5)
  const lessonDate = (lesson?.lessonDate as string) || new Date().toISOString()
  const dateStr = lessonDate.substring(0, 10)
  if (!startTime || !dateStr) return null
  const lessonStart = new Date(`${dateStr}T${startTime}:00`)
  const earliestAllowed = new Date(lessonStart.getTime() - 30 * 60 * 1000)
  if (new Date() >= earliestAllowed) return null
  return (
    <div style={{ fontSize: 12, color: '#98A2B3', textAlign: 'center', padding: '4px 0', marginBottom: 4 }}>
      {startTime} 开课，最早 {earliestAllowed.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 可考勤
    </div>
  )
}

export default function TeacherAttendancePage() {
  const isMobile = useIsMobile() ?? false
  const { data: dashboard, mutate: mutateDashboard } = useSWR('/api/teacher/dashboard', fetcher)
  const todayKey = useMemo(() => dayjs().format('YYYY-MM-DD'), [])
  const { data: studyHallSchedule } = useSWR(`/api/teacher/schedule?type=STUDY_HALL&startDate=${todayKey}&endDate=${todayKey}`, fetcher)
  const lessons = useMemo<TeacherLesson[]>(() => {
    const regular = (dashboard?.todayLessons || []) as TeacherLesson[]
    const studyHall = ((studyHallSchedule?.lessons || []) as Array<Record<string, unknown>>).map((item) => {
      const group = item.group as Record<string, unknown> | undefined
      const course = group?.course as Record<string, unknown> | undefined
      return {
        id: String(item.id),
        groupName: String(group?.name || '作业班'),
        courseName: String(course?.name || '晚托与作业辅导'),
        courseType: 'STUDY_HALL',
        lessonDate: String(item.lessonDate || todayKey),
        startTime: String(item.startTime || ''),
        time: `${String(item.startTime || '')}-${String(item.endTime || '')}`,
        room: '作业班教室',
        status: String(item.status || 'SCHEDULED'),
        scheduleKind: 'STUDY_HALL',
      } satisfies TeacherLesson
    })
    return [...regular, ...studyHall].sort((a, b) => String(a.startTime || a.time || '').localeCompare(String(b.startTime || b.time || '')))
  }, [dashboard?.todayLessons, studyHallSchedule?.lessons, todayKey])
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [queryReady, setQueryReady] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [students, setStudents] = useState<AttendanceStudent[]>([])
  const [attMap, setAttMap] = useState<Map<string, AttStatus>>(new Map())
  const [changedStudentIds, setChangedStudentIds] = useState<Set<string>>(new Set())
  const [mealStudentIds, setMealStudentIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const [lessonDetail, setLessonDetail] = useState<AttendanceLessonDetail | null>(null)
  const [actualMinutes, setActualMinutes] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const intensiveSettlementLocked = lessonDetail?.intensiveMode === 'INTENSIVE'
    && (
      lessonDetail.settlementStatus !== 'UNSETTLED'
      || lessonDetail.intensiveReviewStatus === 'PENDING'
      || lessonDetail.intensiveReviewStatus === 'APPROVED'
    )
  const summary = useMemo(() => {
    const vals = [...attMap.values()]
    return {
      present: vals.filter(v => v === 'PRESENT').length,
      leave: vals.filter(v => v === 'LEAVE').length,
    }
  }, [attMap])

  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId)
    || (selectedLessonId
      ? {
          id: selectedLessonId,
          groupName: lessonDetail?.groupName,
          courseName: lessonDetail?.courseName,
          courseType: lessonDetail?.courseType,
          lessonMinutes: lessonDetail?.lessonMinutes,
          lessonDate: lessonDetail?.lessonDate,
          startTime: lessonDetail?.startTime,
          time: `${lessonDetail?.startTime || ''}-${lessonDetail?.endTime || ''}`,
        }
      : lessons[0])
  const submitLabel = lessonDetail?.intensiveMode === 'INTENSIVE'
    ? lessonDetail.intensiveReviewStatus === 'PENDING'
      ? '等待管理员审核'
      : lessonDetail.intensiveReviewStatus === 'APPROVED'
        ? '审核已通过'
        : lessonDetail.intensiveReviewStatus === 'REJECTED'
          ? '重新提交审核'
          : '提交授课审核'
    : submitted
      ? '已提交 ✓'
      : '提交考勤'
  const remainingText = (student: AttendanceStudent) => formatRemaining(
    Number(student.remainHours || 0),
    student.courseType || selectedLesson?.courseType || null,
    Number(student.lessonMinutes || selectedLesson?.lessonMinutes || 40),
  )

  useEffect(() => {
    const lessonId = new URLSearchParams(window.location.search).get('lessonId')
    if (lessonId) setSelectedLessonId(lessonId)
    setQueryReady(true)
  }, [])

  useEffect(() => {
    if (queryReady && !selectedLessonId && lessons[0]?.id) setSelectedLessonId(lessons[0].id)
  }, [lessons, queryReady, selectedLessonId])

  useEffect(() => {
    if (!selectedLesson?.id) return
    if (selectedLesson.scheduleKind === 'STUDY_HALL' || selectedLesson.id.startsWith('study-hall:')) {
      setDetailLoading(false)
      setDetailError('')
      setStudents([])
      setLessonDetail(null)
      return
    }
    setDetailLoading(true)
    setDetailError('')
    fetch(`/api/teacher/attendance?lessonId=${selectedLesson.id}`)
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(payload.error || `课次加载失败：${res.status}`)
        return payload
      })
      .then(payload => {
        const list = (payload.students || []) as AttendanceStudent[]
        const detail = (payload.lesson || null) as AttendanceLessonDetail | null
        setLessonDetail(detail)
        setActualMinutes(detail?.actualMinutes || detail?.latestReview?.actualMinutes || detail?.plannedMinutes || null)
        setSubmitted(detail?.intensiveReviewStatus === 'PENDING' || detail?.intensiveReviewStatus === 'APPROVED')
        setStudents(list)
        const m = new Map<string, AttStatus>()
        list.forEach((student) => m.set(student.studentId, toAttendanceDisplayStatus(student.status)))
        setAttMap(m)
        setChangedStudentIds(new Set())
        setMealStudentIds(new Set(list.filter((student) => student.eating).map((student) => student.studentId)))
      })
      .catch((error) => {
        const errorText = error instanceof Error ? error.message : '请检查网络连接'
        setDetailError(errorText)
        toast.error(`学员列表加载失败：${errorText}`)
      })
      .finally(() => setDetailLoading(false))
  }, [selectedLesson?.id, selectedLesson?.scheduleKind])

  const setAttendance = (studentId: string, status: AttStatus) => {
    setAttMap((current) => new Map(current).set(studentId, status))
    setChangedStudentIds((current) => new Set(current).add(studentId))
  }

  const handleAllPresent = () => {
    const m = new Map(attMap)
    students.forEach(s => m.set(s.studentId, 'PRESENT'))
    setAttMap(m)
    setChangedStudentIds(new Set(students.map((student) => student.studentId)))
  }

  const toggleMeal = (studentId: string) => {
    setMealStudentIds((current) => {
      const next = new Set(current)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  const submitAttendance = async () => {
    if (submitting || submittingRef.current) return
    submittingRef.current = true
    if (!selectedLesson?.id) { submittingRef.current = false; return }
    if (intensiveSettlementLocked) {
      submittingRef.current = false
      toast.warning(
        lessonDetail?.intensiveReviewStatus === 'PENDING'
          ? '该授课记录正在等待管理员审核'
          : '该个性化课次已经审核结算，如需调整请联系管理员',
      )
      return
    }
    if (lessonDetail?.intensiveMode === 'INTENSIVE' && !actualMinutes) {
      submittingRef.current = false
      toast.warning('请填写实际授课分钟')
      return
    }
    const startTime = (selectedLesson.startTime as string) || String(selectedLesson.time || '').slice(0, 5)
    const lessonDate = (selectedLesson.lessonDate as string) || new Date().toISOString()
    if (startTime && lessonDate) {
      const dateStr = typeof lessonDate === 'string'
        ? lessonDate.substring(0, 10)
        : new Date(lessonDate).toISOString().substring(0, 10)
      const lessonStart = new Date(`${dateStr}T${startTime}:00`)
      const earliestAllowed = new Date(lessonStart.getTime() - 30 * 60 * 1000)
      if (new Date() < earliestAllowed) {
        submittingRef.current = false
        toast.warning(`未到考勤时间，课程 ${startTime} 开始，最早 30 分钟前可提交考勤`)
        return
      }
    }
    const records = students.map(s => ({
      studentId: s.studentId, enrollmentId: s.enrollmentId,
      status: resolveAttendanceSubmissionStatus({
        displayedStatus: attMap.get(s.studentId) || 'PRESENT',
        originalStatus: s.status,
        changed: changedStudentIds.has(s.studentId),
      }),
      actualMinutes: lessonDetail?.intensiveMode === 'INTENSIVE' ? actualMinutes : undefined,
      note: '',
    }))
    setSubmitting(true)
    const res = await fetch('/api/teacher/attendance', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonId: selectedLesson.id,
        records,
        mealStudentIds: lessonDetail?.isSystemFirstPeriod ? [...mealStudentIds] : undefined,
      }),
    })
    const payload = await res.json().catch(() => ({}))
    setSubmitting(false)
    submittingRef.current = false
    if (!res.ok) { toast.error(payload.error || '提交失败'); return }
    setSubmitted(true)
    mutateDashboard()
    fetch(`/api/teacher/attendance?lessonId=${selectedLesson.id}`)
      .then(r => r.json())
      .then(payload => {
        const list = (payload.students || []) as AttendanceStudent[]
        const detail = (payload.lesson || null) as AttendanceLessonDetail | null
        setLessonDetail(detail)
        setActualMinutes(detail?.actualMinutes || detail?.latestReview?.actualMinutes || detail?.plannedMinutes || null)
        setStudents(list)
        const m = new Map<string, AttStatus>()
        list.forEach((student) => m.set(student.studentId, toAttendanceDisplayStatus(student.status)))
        setAttMap(m)
        setChangedStudentIds(new Set())
        setMealStudentIds(new Set(list.filter((student) => student.eating).map((student) => student.studentId)))
      })
      .catch((error) => toast.warning(`考勤已提交，但最新考勤列表刷新失败，请手动刷新页面。原因：${error instanceof Error ? error.message : '未知错误'}`))
    if (payload.pendingReview) {
      toast.success(payload.message || '授课记录已提交，等待管理员审核', { duration: 2000 })
    } else if (payload.alreadyDeducted) {
      toast.success(`考勤已更新，本次课次已结算课时`, { duration: 2000 })
    } else {
      toast.success(`考勤已提交，本次课次状态已更新`, { duration: 2000 })
    }
  }

  return (
    <div className="teacher-attendance-page">
      <Title level={4} style={{ marginTop: 0 }}>考勤录入</Title>

      <div style={isMobile ? { display: 'flex', flexDirection: 'column', gap: 12 } : { display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        {/* LEFT: Lesson list — pill tabs on mobile (grouped by time period), Card list on desktop */}
        {isMobile ? (
          (() => {
            const timeBucket = (startTime: string): '上午' | '下午' | '晚上' => {
              const h = parseInt((startTime || '00').split(':')[0])
              if (h < 12) return '上午'
              if (h < 18) return '下午'
              return '晚上'
            }
            const buckets = ['上午', '下午', '晚上'] as const
            const grouped = buckets.map(b => ({
              label: b,
              items: lessons.filter(l => timeBucket(l.time || l.startTime || '') === b)
            })).filter(g => g.items.length > 0)
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {grouped.map(g => (
                  <div key={g.label}>
                    <div style={{ fontSize: 11, color: '#98A2B3', marginBottom: 6, fontWeight: 500 }}>{g.label}</div>
                    <div className="teacher-attendance-pills">
                      {g.items.map((lesson: TeacherLesson) => {
                        const selected = selectedLesson?.id === lesson.id
                        const done = Number(lesson.attendanceCount || 0) > 0 || lesson.status === 'COMPLETED'
                        return (
                          <button key={lesson.id} type="button" className={`teacher-attendance-pill${selected ? ' is-selected' : ''}`} onClick={() => setSelectedLessonId(lesson.id)}>
                            <div>
                              <span className={`teacher-attendance-pill__dot${done ? ' is-done' : ''}`} />
                              {lesson.groupName || lesson.courseName} {lesson.time}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()
        ) : (
        <Card bordered={false} className="teacher-attendance-lesson-card" title={`今日课次 (${lessons.length})`}>
          <List
            dataSource={lessons}
            locale={{
              emptyText: (
                <GuidedEmpty
                  compact
                  title="今天没有待考勤课次"
                  description="今天排定的课程会显示在这里，开课后即可登记出勤或请假。"
                  actionLabel="查看我的课表"
                  onAction={() => window.location.assign('/teacher/schedule')}
                />
              ),
            }}
            renderItem={(lesson: TeacherLesson) => {
              const selected = selectedLesson?.id === lesson.id
              const done = Boolean(lesson.attendanceSubmittedAt)
                || Number(lesson.attendanceCount || 0) > 0
                || lesson.status === 'COMPLETED'
              return (
                <List.Item onClick={() => setSelectedLessonId(lesson.id)} className={`teacher-attendance-lesson-row${selected ? ' is-selected' : ''}`}>
                  <div style={{ width: '100%' }}>
                    <Text strong style={{ fontSize: 12 }}>{lesson.groupName || lesson.courseName}</Text>
                    <div style={{ fontSize: 10, color: '#8d806f', marginTop: 2 }}>
                      <ClockCircleOutlined style={{ fontSize: 9 }} /> {lesson.time}
                    </div>
                    <div style={{ fontSize: 10, color: '#8d806f', marginTop: 1 }}>
                      <EnvironmentOutlined style={{ fontSize: 9 }} /> {lesson.room || '-'}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <Tag color={done ? 'green' : 'default'} style={{ borderRadius: 9999, fontSize: 9 }}>
                        {done ? '已完成' : '待考勤'}
                      </Tag>
                    </div>
                  </div>
                </List.Item>
              )
            }}
          />
          {/* Sticky summary */}
          {lessons.length > 0 && (
            <div style={{ borderTop: '1px solid #f0e7de', paddingTop: 12, fontSize: 11, position: 'sticky', bottom: 0, background: '#fff' }}>
              今日汇总：<Text style={{ color: '#1D9E75' }}>出勤{summary.present}</Text> / <Text style={{ color: '#BA7517' }}>请假{summary.leave}</Text>
            </div>
          )}
        </Card>
        )}

        {/* RIGHT: Attendance area */}
        <Card bordered={false} className="teacher-attendance-main-card"
          title={selectedLesson ? `${selectedLesson.groupName || selectedLesson.courseName} · ${selectedLesson.time}` : '选择课次'}
          extra={!isMobile && selectedLesson && selectedLesson.scheduleKind !== 'STUDY_HALL' && !selectedLesson.id.startsWith('study-hall:') ? (
            <Space>
              <Tag color="blue" style={{ borderRadius: 9999 }}>{students.length}人</Tag>
              <Button disabled={intensiveSettlementLocked} icon={<CheckCircleOutlined />} onClick={handleAllPresent} style={{ borderColor: '#1D9E75', color: '#1D9E75' }}>一键全勤</Button>
              {attendanceTimeHint(selectedLesson)}
              <Button type="primary" disabled={intensiveSettlementLocked} loading={submitting} onClick={submitAttendance} style={{ background: '#E8784A' }}>{submitLabel}</Button>
            </Space>
          ) : null}>
          {selectedLesson?.scheduleKind === 'STUDY_HALL' || selectedLesson?.id.startsWith('study-hall:') ? (
            <StudyHallWorkspace
              key={selectedLesson.id}
              admin={false}
              embedded
              initialClassId={selectedLesson.id.split(':')[1]}
              initialDate={selectedLesson.lessonDate || todayKey}
            />
          ) : !selectedLesson ? (
            <GuidedEmpty
              compact
              title="请选择一节课"
              description="选择左侧的今日课次后，这里会显示学员名单和考勤状态。"
            />
          ) : detailLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-ink-muted)' }}>
              正在加载目标课次…
            </div>
          ) : detailError ? (
            <Empty
              description={(
                <Space direction="vertical" size={8}>
                  <span>目标课次无法打开：{detailError}</span>
                  <Button onClick={() => window.location.reload()}>重新加载</Button>
                </Space>
              )}
            />
          ) : (
            <>
              {isMobile && attendanceTimeHint(selectedLesson)}
              {/* Progress bar */}
              {lessonDetail?.intensiveMode === 'INTENSIVE' && (
                <div className="teacher-attendance-intensive-card">
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
                    <Text strong style={{ fontSize: 12 }}>实际授课分钟</Text>
                    <InputNumber min={15} max={600} value={actualMinutes} disabled={intensiveSettlementLocked} onChange={(value) => setActualMinutes(value)} addonAfter="分钟" />
                    {lessonDetail.intensiveReviewStatus === 'PENDING' && <Tag color="orange">等待管理员审核</Tag>}
                    {lessonDetail.intensiveReviewStatus === 'APPROVED' && <Tag color="green">审核已通过</Tag>}
                    {lessonDetail.intensiveReviewStatus === 'REJECTED' && <Tag color="red">已驳回，可修改重提</Tag>}
                    <Text type="secondary" style={{ fontSize: 11 }}>计划 {lessonDetail.plannedMinutes || '-'} 分钟</Text>
                  </div>
                  {lessonDetail.intensiveReviewStatus === 'REJECTED' && lessonDetail.latestReview?.reviewNote && (
                    <Text style={{ display: 'block', marginTop: 8, color: 'var(--color-error)', fontSize: 12 }}>
                      驳回原因：{lessonDetail.latestReview.reviewNote}
                    </Text>
                  )}
                  <Text style={{ display: 'block', marginTop: 8, color: 'var(--color-ink-muted)', fontSize: 12 }}>
                    提交后不会立即计薪；管理员核对上课时间并审核通过后，才累计授课时长和生成工资。
                  </Text>
                </div>
              )}
              {lessonDetail?.isSystemFirstPeriod && (
                <div className="teacher-attendance-meal-note">
                  <CoffeeOutlined />
                  <span>这是系统第一课节，请在提交考勤时一并确认每位学员是否就餐。</span>
                </div>
              )}
              <div className="teacher-attendance-progress-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#5a4e3a' }}>签到进度</span>
                  <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75' }} />
                      <span style={{ color: '#1D9E75', fontWeight: 600 }}>{summary.present}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#BA7517' }} />
                      <span style={{ color: '#BA7517', fontWeight: 600 }}>{summary.leave}</span>
                    </div>
                    {lessonDetail?.isSystemFirstPeriod && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CoffeeOutlined style={{ color: 'var(--color-primary)' }} /><span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{mealStudentIds.size}</span></div>}
                  </div>
                </div>
                <div className="teacher-attendance-progress-track">
                  <span className="is-present" style={{ flex: summary.present || 0 }} />
                  <span className="is-leave" style={{ flex: summary.leave || 0 }} />
                </div>
              </div>

              {/* Student list */}
              <div className="teacher-attendance-student-grid" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                paddingBottom: isMobile ? 118 : 0,
              }}>
                {students.map((s) => {
                  const status: AttStatus = attMap.get(s.studentId) || 'PRESENT'
                  const cfg = STATUS_CONFIG[status]
                  const remaining = remainingText(s)
                  const isLowRemaining = remaining.value <= 5
                  const isSvip = s.membershipLevel === 'SVIP'
                  const isVip = s.membershipLevel === 'VIP'
                  const isLeave = status === 'LEAVE'
                  return (
                    <div key={s.studentId}
                      className={`teacher-attendance-student-card ${cfg.className}${isLeave ? ' is-leave-card' : ''}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px', borderRadius: 12,
                        background: '#fff',
                        border: `1.5px solid ${isLeave ? '#e5e0d8' : status === 'PRESENT' ? '#1D9E7533' : '#f0e7de'}`,
                        opacity: isLeave ? 0.75 : 1,
                      }}>
                      {/* Avatar */}
                      <StudentAvatar photoUrl={s.photoUrl} gender={s.gender} name={s.name} size={40} />
                      {/* Name + meta */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1201', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</span>
                          {isSvip && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, color: '#A8873D', background: '#FBF3DE' }}>SVIP</span>}
                          {isVip && !isSvip && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 99, color: '#D4622A', background: '#FFF1E8' }}>VIP</span>}
                        </div>
                        <div style={{ fontSize: 11, color: isLowRemaining ? '#E24B4A' : '#9a8e7a' }}>
                          {lessonDetail?.intensiveMode === 'INTENSIVE' ? '审核后按实际分钟计入' : `余${remaining.text}${isLowRemaining ? ' ⚠️' : ''}`}
                        </div>
                      </div>
                      {/* Buttons */}
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button type="button"
                          className={status === 'PRESENT' ? 'is-active is-present' : ''}
                          disabled={intensiveSettlementLocked}
                          onClick={() => setAttendance(s.studentId, 'PRESENT')}
                          style={{
                            minWidth: 52, minHeight: 36, borderRadius: 8, border: '1px solid',
                            borderColor: status === 'PRESENT' ? '#1D9E75' : '#e5e0d8',
                            background: status === 'PRESENT' ? '#1D9E75' : '#fff',
                            color: status === 'PRESENT' ? '#fff' : '#6b5d48',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          }}>出勤</button>
                        <button type="button"
                          className={status === 'LEAVE' ? 'is-active is-leave' : ''}
                          disabled={intensiveSettlementLocked}
                          onClick={() => {
                            setAttendance(s.studentId, 'LEAVE')
                            if (!isLeave) toast.info(`${s.name} 已请假，自动排除就餐和反馈`)
                          }}
                          style={{
                            minWidth: 52, minHeight: 36, borderRadius: 8, border: '1px solid',
                            borderColor: status === 'LEAVE' ? '#BA7517' : '#e5e0d8',
                            background: status === 'LEAVE' ? '#BA7517' : '#fff',
                            color: status === 'LEAVE' ? '#fff' : '#6b5d48',
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          }}>请假</button>
                        {lessonDetail?.isSystemFirstPeriod && (
                          <button type="button"
                            className={mealStudentIds.has(s.studentId) ? 'is-active is-meal' : ''}
                            disabled={intensiveSettlementLocked || isLeave}
                            onClick={() => toggleMeal(s.studentId)}
                            style={{
                              minWidth: 44, minHeight: 36, borderRadius: 8, border: '1px solid',
                              borderColor: mealStudentIds.has(s.studentId) ? '#9A4622' : '#e5e0d8',
                              background: mealStudentIds.has(s.studentId) ? '#9A4622' : '#fff',
                              color: mealStudentIds.has(s.studentId) ? '#fff' : '#6b5d48',
                              fontSize: 12, fontWeight: 600, cursor: isLeave ? 'not-allowed' : 'pointer',
                              opacity: isLeave ? 0.4 : 1,
                            }}>🍚</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

            </>
          )}
        </Card>
        {isMobile && selectedLesson && selectedLesson.scheduleKind !== 'STUDY_HALL' && !selectedLesson.id.startsWith('study-hall:') && !detailLoading && !detailError && (
          <div className="teacher-attendance-bottom-bar">
            <Button
              disabled={intensiveSettlementLocked}
              icon={<CheckCircleOutlined />}
              onClick={handleAllPresent}
              className="teacher-attendance-all-present">
              一键全勤
            </Button>
            <Button
              type="primary"
              disabled={intensiveSettlementLocked}
              loading={submitting}
              onClick={submitAttendance}
              className="teacher-attendance-submit">
              {submitLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
