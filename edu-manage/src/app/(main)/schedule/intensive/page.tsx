'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { addDays, subDays } from 'date-fns'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  InputNumber,
  message,
  Modal,
  Select,
  Spin,
  Tag,
  Typography,
} from 'antd'
import useSWR from 'swr'
import { useDivision } from '@/contexts/DivisionContext'
import { MobileSelect } from '@/components/MobileSelect'
import { HOURLY_PERIODS } from '@/lib/schedule-periods'
import { getPersonalClassLimit } from '@/lib/schedule-class-type'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Text } = Typography

const INTENSIVE_COLOR = '#534AB7'
const SLOT_HEIGHT = 92

const HOURLY_SLOTS = HOURLY_PERIODS
  .filter((period) => period.start < '22:00' && !['12:00', '13:00'].includes(period.start))
  .map((period) => ({ ...period, label: `${period.start}–${period.end}` }))

const TYPE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  ONE_ON_ONE:   { label:'一对一',   bg:'#EEEDFE', color:'#3C3489' },
  ONE_ON_TWO:   { label:'一对二',   bg:'#FBEAF0', color:'#72243E' },
  ONE_ON_THREE: { label:'一对三',   bg:'#EEF5FC', color:'#185FA5' },
}

const SUBJECT_CONFIG: Array<{ match: string; bg: string; color: string }> = [
  { match: '数学', bg: '#F0EEFF', color: '#534AB7' },
  { match: '物理', bg: '#EAF3FB', color: '#185FA5' },
  { match: '化学', bg: '#E8F7F1', color: '#1D7D62' },
  { match: '英语', bg: '#FBEAF0', color: '#A43F68' },
  { match: '语文', bg: '#FDF0EA', color: '#C95F35' },
]

const subjectStyle = (subject: string) => (
  SUBJECT_CONFIG.find((item) => subject.includes(item.match))
  || { bg: '#F3F0EB', color: '#5A4E3A' }
)

type ScheduleLesson = {
  lessonId?: string
  teacherName?: string
  teacherId?: string
  courseName?: string
  subject?: string
  grade?: string
  courseType?: string
  headcount?: number
  startTime?: string
}

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : Promise.reject('load error'))

type IntensiveCreateData = {
  roomId: string
  roomName: string
  startTime: string
  endTime: string
  date: string
  teacherId: string
  studentIds: string[]
  courseId: string
  teachingType: 'ONE_ON_ONE' | 'ONE_ON_TWO' | 'ONE_ON_THREE'
}

type HistoryStatus = 'PRESENT' | 'LEAVE' | 'ABSENT' | 'MAKEUP'

type IntensiveHistoryGroup = {
  id: string
  name: string
  teachingType: IntensiveCreateData['teachingType']
  expectedStudents: number
  courseName: string
  subject: string
  grade?: string | null
  teachers: Array<{ id: string; name: string; subject?: string | null }>
  students: Array<{
    id: string
    name: string
    grade?: string | null
    enrollmentStatus: string
    totalHours: number
    usedHours: number
    remainHours: number
  }>
}

type IntensiveHistoryDraft = {
  groupId: string
  teacherId: string
  lessonDate: string
  startTime: string
  endTime: string
  actualMinutes: number
  reason: string
  records: Array<{ studentId: string; status: HistoryStatus }>
}

type IntensiveReviewItem = {
  id: string
  lessonId: string
  revision: number
  teacherName: string
  groupName: string
  subject: string
  grade?: string | null
  lessonDate: string
  startTime: string
  endTime: string
  plannedMinutes?: number | null
  actualMinutes: number
  teacherNote?: string | null
  submittedAt: string
  students: Array<{
    id: string
    name: string
    grade?: string | null
    status: HistoryStatus
    remainHours: number
  }>
}

type IntensiveAppointmentItem = {
  id: string
  groupId: string
  groupName: string
  teachingType: string
  teachingTypeLabel: string
  teacherName: string
  subject: string
  grade?: string | null
  lessonDate: string
  startTime: string
  endTime: string
  note?: string | null
  isHistorical: boolean
  statusLabel: string
  students: Array<{ id: string; name: string; grade?: string | null }>
}

export default function IntensiveSchedulePage() {
  const isMobile = useIsMobile() ?? false
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [createOpen, setCreateOpen] = useState(false)
  const [createData, setCreateData] = useState<IntensiveCreateData>({
    roomId: '', roomName: '', startTime: '', endTime: '', date: '', teacherId: '', studentIds: [], courseId: '', teachingType: 'ONE_ON_ONE',
  })
  const [saving, setSaving] = useState(false)
  const [conflictMsg, setConflictMsg] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historySaving, setHistorySaving] = useState(false)
  const [historyConfirmed, setHistoryConfirmed] = useState(false)
  const [reviewingId, setReviewingId] = useState('')
  const [targetReviewLessonId, setTargetReviewLessonId] = useState('')
  const [targetAppointmentLessonId, setTargetAppointmentLessonId] = useState('')
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [historyDraft, setHistoryDraft] = useState<IntensiveHistoryDraft>({
    groupId: '',
    teacherId: '',
    lessonDate: format(new Date(), 'yyyy-MM-dd'),
    startTime: '18:00',
    endTime: '19:00',
    actualMinutes: 60,
    reason: '',
    records: [],
  })

  const { division } = useDivision()
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const { data: daily, isLoading, mutate } = useSWR(`/api/schedules/daily?date=${dateStr}&courseType=SMALL&division=${division}`, fetcher, { refreshInterval: 180_000 })
  const { data: roomsData } = useSWR('/api/rooms', fetcher)
  const { data: teachersData } = useSWR('/api/teachers?status=ACTIVE&limit=100', fetcher)
  const { data: studentsData } = useSWR(`/api/students?limit=500&division=${division}`, fetcher)
  const { data: coursesData } = useSWR(`/api/courses?limit=200&division=${division}`, fetcher)
  const { data: historyData, mutate: mutateHistory } = useSWR(
    `/api/admin/intensive-history?division=${division}`,
    fetcher,
    { refreshInterval: 60_000 },
  )
  const { data: reviewData, mutate: mutateReviews } = useSWR(
    `/api/admin/intensive-reviews?division=${division}&status=PENDING`,
    fetcher,
    { refreshInterval: 5_000, revalidateOnFocus: true, revalidateOnReconnect: true },
  )
  const { data: appointmentData } = useSWR(
    `/api/admin/intensive-appointments?division=${division}`,
    fetcher,
    { refreshInterval: 10_000, revalidateOnFocus: true, revalidateOnReconnect: true },
  )

  const matrix = useMemo(() => (
    (daily?.matrix || {}) as Record<string, Record<string, ScheduleLesson[]>>
  ), [daily?.matrix])
  const allRooms: Record<string, unknown>[] = useMemo(() => (
    Array.isArray(roomsData) ? roomsData : []
  ), [roomsData])
  const teacherList: Record<string, unknown>[] = Array.isArray(teachersData?.teachers) ? teachersData.teachers : Array.isArray(teachersData) ? teachersData : []
  const studentList: Record<string, unknown>[] = Array.isArray(studentsData?.students) ? studentsData.students : Array.isArray(studentsData) ? studentsData : []
  const courseList: Record<string, unknown>[] = Array.isArray(coursesData) ? coursesData : []
  const historyGroups: IntensiveHistoryGroup[] = Array.isArray(historyData?.groups) ? historyData.groups : []
  const selectedHistoryGroup = historyGroups.find((group) => group.id === historyDraft.groupId)
  const pendingReviews: IntensiveReviewItem[] = useMemo(() => (
    Array.isArray(reviewData?.reviews) ? reviewData.reviews : []
  ), [reviewData])
  const pendingAppointments: IntensiveAppointmentItem[] = useMemo(() => (
    Array.isArray(appointmentData?.appointments) ? appointmentData.appointments : []
  ), [appointmentData])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setTargetReviewLessonId(params.get('reviewLessonId') || '')
    setTargetAppointmentLessonId(params.get('appointmentLessonId') || '')
    if (params.get('section') === 'appointments') {
      window.setTimeout(() => {
        document.getElementById('intensive-appointments')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 100)
    }
    if (params.get('review') === 'pending' || params.get('section') === 'reviews') {
      window.setTimeout(() => {
        document.getElementById('intensive-reviews')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 100)
    }
  }, [])

  useEffect(() => {
    if (!targetReviewLessonId || !pendingReviews.some((review) => review.lessonId === targetReviewLessonId)) return
    const timer = window.setTimeout(() => {
      document.getElementById(`review-lesson-${targetReviewLessonId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 100)
    return () => window.clearTimeout(timer)
  }, [pendingReviews, targetReviewLessonId])

  useEffect(() => {
    if (
      !targetAppointmentLessonId
      || !pendingAppointments.some((appointment) => appointment.id === targetAppointmentLessonId)
    ) return
    const timer = window.setTimeout(() => {
      document.getElementById(`appointment-lesson-${targetAppointmentLessonId}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 100)
    return () => window.clearTimeout(timer)
  }, [pendingAppointments, targetAppointmentLessonId])

  // Only ONE_ON_ONE rooms (desks/spots)
  const spots = useMemo(() => allRooms.filter(r => {
    const t = (r.type as string || '').toLowerCase()
    const u = (r.usageType as string || '').toLowerCase()
    return t.includes('一对一') || t.includes('one_on_one')
      || u.includes('one_on_one') || u.includes('一对一')
  }), [allRooms])

  // Build spot × hour grid
  const grid = useMemo(() => {
    const g: Record<string, Record<string, ScheduleLesson[]>> = {}
    spots.forEach(s => { g[s.id as string] = {} })
    Object.entries(matrix).forEach(([roomId, periods]) => {
      if (!spots.find(s => s.id === roomId)) return
      Object.entries(periods).forEach(([periodId, lessons]) => {
        // Daily matrix may contain standard-period ids or hourly ids. Prefer the
        // lesson's real start time so evening appointments are never dropped.
        const firstLesson = lessons[0]
        const hourSlot = HOURLY_SLOTS.find(h => h.id === periodId)
          || HOURLY_SLOTS.find(h => h.start === firstLesson?.startTime)
        if (hourSlot) {
          if (!g[roomId]) g[roomId] = {}
          if (!g[roomId][hourSlot.id]) g[roomId][hourSlot.id] = []
          for (const lesson of lessons) {
            if (!g[roomId][hourSlot.id].some((item) => item.lessonId === lesson.lessonId)) {
              g[roomId][hourSlot.id].push(lesson)
            }
          }
        }
      })
    })
    return g
  }, [matrix, spots])

  // Count intensive lessons
  const intensiveCount = useMemo(() => {
    let count = 0
    Object.values(grid).forEach(hours => {
      Object.values(hours).forEach((lessons) => { count += lessons.length })
    })
    return count
  }, [grid])

  const openCreate = (spotId: string, slotId: string) => {
    const spot = spots.find(s => s.id === spotId)
    const slot = HOURLY_SLOTS.find(s => s.id === slotId)
    setCreateData({
      roomId: spotId,
      roomName: (spot?.name as string) || '',
      startTime: slot?.start || '',
      endTime: slot?.end || '',
      date: dateStr,
      teacherId: '',
      studentIds: [],
      courseId: '',
      teachingType: 'ONE_ON_ONE',
    })
    setConflictMsg('')
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    const expectedStudents = getPersonalClassLimit(createData.teachingType)
    if (!createData.teacherId || !createData.courseId || createData.studentIds.length !== expectedStudents) {
      message.warning(`请选择老师、课程和${expectedStudents}名学员`)
      return
    }
    setSaving(true)
    setConflictMsg('')
    try {
      const selectedCourse = courseList.find((course) => course.id === createData.courseId)
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${selectedCourse?.subject || selectedCourse?.name || '突击全能班'}${TYPE_CONFIG[createData.teachingType].label}`,
          courseId: createData.courseId,
          teacherId: createData.teacherId,
          studentIds: createData.studentIds,
          classType: createData.teachingType,
          startDate: createData.date,
          startTimeVal: createData.startTime,
          endTimeVal: createData.endTime,
          roomId: createData.roomId,
          division,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (payload.conflicts?.length) {
          setConflictMsg(payload.conflicts.map((c: Record<string, unknown>) => c.detail || c.message).join('；'))
        } else {
          setConflictMsg(payload.error || '创建失败')
        }
        return
      }
      message.success('突击全能班排课成功')
      setCreateOpen(false)
      await mutate()
    } catch {
      message.error('网络错误')
    } finally { setSaving(false) }
  }

  const selectHistoryGroup = (groupId: string) => {
    const group = historyGroups.find((item) => item.id === groupId)
    const records = (group?.students || [])
      .slice(0, group?.expectedStudents || 1)
      .map((student) => ({ studentId: student.id, status: 'PRESENT' as HistoryStatus }))
    setHistoryDraft((current) => ({
      ...current,
      groupId,
      teacherId: group?.teachers[0]?.id || '',
      actualMinutes: 60,
      records,
    }))
    setHistoryConfirmed(false)
  }

  const openHistory = () => {
    const group = historyGroups[0]
    const records = (group?.students || [])
      .slice(0, group?.expectedStudents || 1)
      .map((student) => ({ studentId: student.id, status: 'PRESENT' as HistoryStatus }))
    setHistoryDraft({
      groupId: group?.id || '',
      teacherId: group?.teachers[0]?.id || '',
      lessonDate: format(
        selectedDate.getTime() <= Date.now() ? selectedDate : new Date(),
        'yyyy-MM-dd',
      ),
      startTime: '18:00',
      endTime: '19:00',
      actualMinutes: 60,
      reason: '',
      records,
    })
    setHistoryConfirmed(false)
    setHistoryOpen(true)
  }

  const submitHistory = async () => {
    if (!selectedHistoryGroup) return message.warning('请选择需要补录的突击全能班')
    if (historyDraft.records.length !== selectedHistoryGroup.expectedStudents) {
      return message.warning(`该班型必须选择${selectedHistoryGroup.expectedStudents}名学生`)
    }
    if (!historyDraft.teacherId || !historyDraft.lessonDate || !historyDraft.startTime || !historyDraft.endTime) {
      return message.warning('请完整填写教师、日期和时间')
    }
    if (historyDraft.reason.trim().length < 4) return message.warning('请填写至少4个字的补录原因')
    if (!historyConfirmed) return message.warning('请确认本次补录会同步课时与工资')

    setHistorySaving(true)
    try {
      const response = await fetch(`/api/admin/intensive-history?division=${division}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historyDraft),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '历史补录失败')
      const deducted = Array.isArray(payload.deductions)
        ? payload.deductions
            .filter((item: { hours?: number }) => Number(item.hours) > 0)
            .map((item: { studentName?: string; hours?: number }) => `${item.studentName}${item.hours}小时`)
            .join('、')
        : ''
      message.success(
        `历史课次补录成功${deducted ? `，已扣：${deducted}` : ''}，工资￥${Number(payload.salaryAmount || 0).toFixed(2)}`,
      )
      setHistoryOpen(false)
      await Promise.all([mutateHistory(), mutate()])
    } catch (error) {
      message.error(error instanceof Error ? error.message : '历史补录失败')
    } finally {
      setHistorySaving(false)
    }
  }

  const handleReview = async (review: IntensiveReviewItem, action: 'APPROVE' | 'REJECT') => {
    const reviewNote = (reviewNotes[review.id] || '').trim()
    if (action === 'REJECT' && reviewNote.length < 2) {
      return message.warning('驳回时请填写原因，方便教师修改后重新提交')
    }
    setReviewingId(review.id)
    try {
      const response = await fetch(`/api/admin/intensive-reviews/${review.id}?division=${division}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reviewNote }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '审核失败')
      if (action === 'APPROVE') {
        const uncovered = Number(payload.uncoveredHours || 0)
        message.success(
          `已审核通过，计入${(review.actualMinutes / 60).toFixed(2)}小时，工资￥${Number(payload.salaryAmount || 0).toFixed(2)}`
          + (uncovered > 0 ? `；其中${uncovered.toFixed(2)}学生课时未被余额覆盖` : ''),
        )
      } else {
        message.success('已驳回，教师可以修改后重新提交')
      }
      setReviewNotes((current) => {
        const next = { ...current }
        delete next[review.id]
        return next
      })
      await Promise.all([mutateReviews(), mutateHistory(), mutate()])
    } catch (error) {
      message.error(error instanceof Error ? error.message : '审核失败')
    } finally {
      setReviewingId('')
    }
  }

  return (
    <div>
      <div style={{
        marginBottom: 12,
        display: 'flex',
        alignItems: isMobile ? 'stretch' : 'center',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        gap: 10,
      }}>
        <div>
          <Text strong style={{ fontSize: 16, color: '#1F2329' }}>突击全能班</Text>
          <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>一对一/一对二/一对三 · 灵活排课</Text>
        </div>
        <Button
          type="primary"
          onClick={openHistory}
          style={{ minHeight: 42, borderRadius: 10, background: '#E8784A' }}
        >
          历史课程补录
        </Button>
      </div>

      <Card
        id="intensive-appointments"
        title={(
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span>教师约课记录</span>
            <Tag color={pendingAppointments.length ? 'blue' : 'green'} style={{ borderRadius: 999, margin: 0 }}>
              {pendingAppointments.length ? `${appointmentData?.total || pendingAppointments.length}节待上课/考勤` : '暂无待跟进约课'}
            </Tag>
          </div>
        )}
        style={{ marginBottom: 16, borderRadius: 14 }}
        styles={{ body: { padding: isMobile ? 12 : 16 } }}
      >
        <Alert
          type="info"
          showIcon
          message="约课与授课审核分开管理"
          description="这里展示教师已经安排的课次；教师上课并提交考勤后，记录才会进入下方“待审核授课记录”，审核通过后才累计课时和工资。"
          style={{ marginBottom: 12, borderRadius: 10 }}
        />
        {!pendingAppointments.length ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无教师新约的个性化课程" />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
            gap: 12,
          }}>
            {pendingAppointments.map((appointment) => {
              const highlighted = targetAppointmentLessonId === appointment.id
              return (
                <div
                  key={appointment.id}
                  id={`appointment-lesson-${appointment.id}`}
                  style={{
                    minWidth: 0,
                    border: highlighted
                      ? '2px solid var(--color-primary)'
                      : '1px solid var(--color-hairline)',
                    borderRadius: 14,
                    padding: isMobile ? 12 : 14,
                    background: highlighted
                      ? 'var(--color-primary-bg)'
                      : 'var(--color-surface-1)',
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
                        {appointment.groupName}
                      </Text>
                      <Text style={{ color: 'var(--color-ink-muted)', fontSize: 13 }}>
                        {appointment.teacherName} · {appointment.subject || '学科待确认'}
                      </Text>
                    </div>
                    <Tag
                      color={appointment.statusLabel === '待补交考勤' ? 'orange' : 'blue'}
                      style={{ borderRadius: 999, margin: 0, flexShrink: 0 }}
                    >
                      {appointment.statusLabel}
                    </Tag>
                  </div>
                  <div style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 10,
                    background: 'var(--color-surface-3)',
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: 8,
                    fontSize: 13,
                  }}>
                    <div>
                      <Text type="secondary">上课时间</Text>
                      <div>{format(new Date(appointment.lessonDate), 'M月d日')} {appointment.startTime}-{appointment.endTime}</div>
                    </div>
                    <div>
                      <Text type="secondary">班型与学生</Text>
                      <div style={{ fontWeight: 700 }}>
                        {appointment.teachingTypeLabel} · {appointment.students.map((student) => student.name).join('、') || '待确认'}
                      </div>
                    </div>
                  </div>
                  {appointment.note && (
                    <Text style={{ display: 'block', marginTop: 10, color: 'var(--color-ink-muted)', overflowWrap: 'anywhere' }}>
                      约课说明：{appointment.note}
                    </Text>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Card
        id="intensive-reviews"
        title={(
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span>待审核授课记录</span>
            <Tag color={pendingReviews.length ? 'orange' : 'green'} style={{ borderRadius: 999, margin: 0 }}>
              {pendingReviews.length ? `${pendingReviews.length}条待处理` : '全部处理完成'}
            </Tag>
          </div>
        )}
        style={{ marginBottom: 16, borderRadius: 14 }}
        styles={{ body: { padding: isMobile ? 12 : 16 } }}
      >
        {!pendingReviews.length ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无教师提交的待审核授课记录"
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {pendingReviews.map((review) => (
              <div
                key={review.id}
                id={`review-lesson-${review.lessonId}`}
                style={{
                  minWidth: 0,
                  border: targetReviewLessonId === review.lessonId
                    ? '2px solid var(--color-primary)'
                    : '1px solid var(--color-hairline)',
                  borderRadius: 14,
                  padding: isMobile ? 12 : 14,
                  background: targetReviewLessonId === review.lessonId
                    ? 'var(--color-primary-bg)'
                    : 'var(--color-surface-1)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <Text strong style={{ display: 'block', overflowWrap: 'anywhere' }}>
                      {review.groupName}
                    </Text>
                    <Text style={{ color: 'var(--color-ink-muted)', fontSize: 13 }}>
                      {review.subject} · {review.teacherName}
                    </Text>
                  </div>
                  <Tag color="orange" style={{ borderRadius: 999, margin: 0, flexShrink: 0 }}>待审核</Tag>
                </div>

                <div style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 10,
                  background: 'var(--color-surface-3)',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                  fontSize: 13,
                }}>
                  <div>
                    <Text type="secondary">上课时间</Text>
                    <div>{format(new Date(review.lessonDate), 'M月d日')} {review.startTime}-{review.endTime}</div>
                  </div>
                  <div>
                    <Text type="secondary">教师申报</Text>
                    <div style={{ fontWeight: 700 }}>{review.actualMinutes}分钟（{(review.actualMinutes / 60).toFixed(2)}小时）</div>
                  </div>
                </div>

                <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {review.students.map((student) => (
                    <Tag key={student.id} style={{ borderRadius: 999, margin: 0 }}>
                      {student.name} · {student.status === 'PRESENT' ? '出勤' : student.status === 'LEAVE' ? '请假' : student.status === 'ABSENT' ? '缺勤' : '补课'}
                    </Tag>
                  ))}
                </div>

                {review.teacherNote && (
                  <Text style={{ display: 'block', marginTop: 10, color: 'var(--color-ink-muted)', overflowWrap: 'anywhere' }}>
                    教师说明：{review.teacherNote}
                  </Text>
                )}

                <Input.TextArea
                  value={reviewNotes[review.id] || ''}
                  onChange={(event) => setReviewNotes((current) => ({
                    ...current,
                    [review.id]: event.target.value,
                  }))}
                  placeholder="审核备注（驳回时必填）"
                  rows={2}
                  maxLength={500}
                  style={{ marginTop: 12, resize: 'none' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                  <Button
                    danger
                    disabled={Boolean(reviewingId)}
                    onClick={() => handleReview(review, 'REJECT')}
                    style={{ minHeight: 42, borderRadius: 10 }}
                  >
                    驳回修改
                  </Button>
                  <Button
                    type="primary"
                    loading={reviewingId === review.id}
                    disabled={Boolean(reviewingId) && reviewingId !== review.id}
                    onClick={() => handleReview(review, 'APPROVE')}
                    style={{ minHeight: 42, borderRadius: 10, background: 'var(--color-primary)' }}
                  >
                    核对无误并通过
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Date navigation */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>←</button>
        <div style={{ padding: '0 16px', height: 34, display: 'flex', alignItems: 'center', gap: 8,
          background: '#fff', border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
          <span style={{ color: INTENSIVE_COLOR }}>📅</span>
          {format(selectedDate, 'M月d日 EEEE', { locale: zhCN })}
        </div>
        <button onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>→</button>
        <button onClick={() => setSelectedDate(new Date())}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>今天</button>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: INTENSIVE_COLOR, fontWeight: 500 }}>
          今日已排 {intensiveCount} 课时
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : spots.length === 0 ? (
        <Empty description="暂无突击全能班桌位，请在系统设置→教室管理中添加类型为'一对一'的教室/桌位" />
      ) : (
        <div style={{ overflowX: 'auto', border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${spots.length}, 1fr)`, minWidth: 80 + spots.length * 160 }}>
            {/* Header */}
            <div />
            {spots.map(spot => (
              <div key={spot.id as string} style={{
                padding: '10px 8px', textAlign: 'center',
                borderRight: '0.5px solid var(--color-border, #EEE7E1)',
                borderBottom: `2px solid ${INTENSIVE_COLOR}`,
                background: 'rgba(83,74,183,.03)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{spot.name as string}</div>
                <div style={{ fontSize: 9, color: INTENSIVE_COLOR, marginTop: 2 }}>突击全能班</div>
              </div>
            ))}

            {/* Hour slots */}
            {HOURLY_SLOTS.map(slot => (
              <div key={slot.id} style={{ display: 'contents' }}>
                <div style={{
                  minHeight: SLOT_HEIGHT, borderRight: '0.5px solid var(--color-border, #EEE7E1)',
                  borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
                  padding: '4px 8px', textAlign: 'right',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end',
                  background: '#fafafa',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: INTENSIVE_COLOR }}>{slot.start}</div>
                  <div style={{ fontSize: 9, color: 'var(--color-text-tertiary, #98A2B3)' }}>至 {slot.end}</div>
                </div>

                {spots.map(spot => {
                  const lessons = grid[spot.id as string]?.[slot.id] || []
                  return (
                    <div key={spot.id as string} style={{
                      minHeight: SLOT_HEIGHT, borderRight: '0.5px solid var(--color-border, #EEE7E1)',
                      borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
                      padding: 4, cursor: lessons.length ? 'default' : 'pointer',
                    }} onClick={() => { if (!lessons.length) openCreate(spot.id as string, slot.id) }}>
                      {lessons.length ? (
                        <div style={{ display: 'grid', gap: 4 }}>
                          {lessons.length > 1 && (
                            <div style={{
                              padding: '3px 6px',
                              borderRadius: 6,
                              background: 'rgba(245,166,35,.12)',
                              color: '#8A5B00',
                              fontSize: 9,
                              lineHeight: 1.35,
                            }}>
                              同地点同时间有 {lessons.length} 节课，请核对安排
                            </div>
                          )}
                          {lessons.map((lesson, lessonIndex) => {
                            const courseType = lesson.courseType || 'ONE_ON_ONE'
                            const typeConfig = TYPE_CONFIG[courseType] || TYPE_CONFIG.ONE_ON_ONE
                            const subject = lesson.subject || '其他学科'
                            const palette = subjectStyle(subject)
                            return (
                              <div key={lesson.lessonId || `${subject}-${lessonIndex}`} style={{
                                minHeight: 64,
                                borderRadius: 8,
                                padding: '6px 7px',
                                background: palette.bg,
                                border: `1px solid ${palette.color}33`,
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                minWidth: 0,
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 3 }}>
                                  <span style={{
                                    fontSize: 9,
                                    fontWeight: 700,
                                    color: typeConfig.color,
                                    background: typeConfig.bg,
                                    padding: '1px 5px',
                                    borderRadius: 999,
                                  }}>
                                    {typeConfig.label}
                                  </span>
                                  <span style={{ fontSize: 9, color: palette.color, fontWeight: 700 }}>{subject}</span>
                                </div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1201', lineHeight: 1.35, overflowWrap: 'anywhere' }}>
                                  {lesson.teacherName || '未分配教师'}
                                </div>
                                <div style={{ fontSize: 10, color: '#5A4E3A', lineHeight: 1.35, overflowWrap: 'anywhere' }}>
                                  {lesson.courseName || '个性化课程'}
                                </div>
                                <div style={{ fontSize: 9, color: '#7A6F61', lineHeight: 1.35 }}>
                                  {lesson.grade || '未填年级'} · {lesson.headcount || 1}人
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div style={{ minHeight: SLOT_HEIGHT - 8, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'transparent', transition: 'all .15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(83,74,183,.06)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                          <span style={{ fontSize: 10, color: 'rgba(0,0,0,.12)' }}>+ 安排</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '8px 14px', borderTop: '0.5px solid var(--color-border, #EEE7E1)', background: '#faf8f5' }}>
            {SUBJECT_CONFIG.map((cfg) => (
              <div key={cfg.match} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: cfg.bg, border: `1px solid ${cfg.color}55` }} />
                <span>{cfg.match}</span>
              </div>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--color-text-tertiary, #98A2B3)' }}>每小时为1课时单位 · 点击空格安排课程</span>
          </div>
        </div>
      )}

      <Modal
        title="历史课程补录"
        open={historyOpen}
        onCancel={() => setHistoryOpen(false)}
        footer={null}
        width={isMobile ? '100%' : 620}
        style={isMobile ? { top: 0, margin: 0, padding: 0, maxWidth: '100vw' } : undefined}
        styles={{
          body: {
            maxHeight: isMobile ? 'calc(100dvh - 58px)' : '72vh',
            overflowY: 'auto',
            padding: isMobile ? '12px 14px calc(18px + env(safe-area-inset-bottom))' : 20,
          },
        }}
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Alert
            type="warning"
            showIcon
            message="历史补录属于财务操作"
            description="提交后会同时生成课次、考勤、课时扣减和教师工资，并记录管理员、补录时间与原因。不会自动生成课堂反馈或反馈奖励。"
            style={{ borderRadius: 10 }}
          />

          <div>
            <Text strong style={{ display: 'block', marginBottom: 5 }}>突击全能班 *</Text>
            <Select
              showSearch
              optionFilterProp="label"
              value={historyDraft.groupId || undefined}
              onChange={selectHistoryGroup}
              options={historyGroups.map((group) => ({
                value: group.id,
                label: `${group.name} · ${TYPE_CONFIG[group.teachingType]?.label || group.teachingType}`,
              }))}
              placeholder={historyGroups.length ? '选择已有突击全能班' : '暂无可补录的突击全能班'}
              style={{ width: '100%', minHeight: 42 }}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
            />
          </div>

          {selectedHistoryGroup && (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: 12,
              }}>
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 5 }}>授课教师 *</Text>
                  <Select
                    value={historyDraft.teacherId || undefined}
                    onChange={(teacherId) => {
                      setHistoryDraft((current) => ({ ...current, teacherId }))
                      setHistoryConfirmed(false)
                    }}
                    options={selectedHistoryGroup.teachers.map((teacher) => ({
                      value: teacher.id,
                      label: `${teacher.name}${teacher.subject ? ` · ${teacher.subject}` : ''}`,
                    }))}
                    style={{ width: '100%' }}
                    getPopupContainer={(trigger) => trigger.parentElement || document.body}
                  />
                </div>
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 5 }}>历史上课日期 *</Text>
                  <Input
                    type="date"
                    max={format(new Date(), 'yyyy-MM-dd')}
                    value={historyDraft.lessonDate}
                    onChange={(event) => {
                      setHistoryDraft((current) => ({
                        ...current,
                        lessonDate: event.target.value,
                      }))
                      setHistoryConfirmed(false)
                    }}
                    style={{ minHeight: 42 }}
                  />
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr',
                gap: 10,
              }}>
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 5 }}>开始时间 *</Text>
                  <Input
                    type="time"
                    value={historyDraft.startTime}
                    onChange={(event) => {
                      setHistoryDraft((current) => ({
                        ...current,
                        startTime: event.target.value,
                      }))
                      setHistoryConfirmed(false)
                    }}
                    style={{ minHeight: 42 }}
                  />
                </div>
                <div>
                  <Text strong style={{ display: 'block', marginBottom: 5 }}>结束时间 *</Text>
                  <Input
                    type="time"
                    value={historyDraft.endTime}
                    onChange={(event) => {
                      setHistoryDraft((current) => ({
                        ...current,
                        endTime: event.target.value,
                      }))
                      setHistoryConfirmed(false)
                    }}
                    style={{ minHeight: 42 }}
                  />
                </div>
                <div style={{ gridColumn: isMobile ? '1 / -1' : undefined }}>
                  <Text strong style={{ display: 'block', marginBottom: 5 }}>实际授课 *</Text>
                  <InputNumber
                    min={15}
                    max={600}
                    step={5}
                    addonAfter="分钟"
                    value={historyDraft.actualMinutes}
                    onChange={(actualMinutes) => {
                      setHistoryDraft((current) => ({
                        ...current,
                        actualMinutes: Number(actualMinutes) || 60,
                      }))
                      setHistoryConfirmed(false)
                    }}
                    style={{ width: '100%', minHeight: 42 }}
                  />
                </div>
              </div>

              <div>
                <Text strong style={{ display: 'block', marginBottom: 5 }}>
                  上课学生（必须选择{selectedHistoryGroup.expectedStudents}人）*
                </Text>
                <Select
                  mode="multiple"
                  value={historyDraft.records.map((record) => record.studentId)}
                  onChange={(studentIds: string[]) => {
                    if (studentIds.length > selectedHistoryGroup.expectedStudents) {
                      message.warning(`最多选择${selectedHistoryGroup.expectedStudents}名学生`)
                      return
                    }
                    setHistoryDraft((current) => ({
                      ...current,
                      records: studentIds.map((studentId) => ({
                        studentId,
                        status: current.records.find((record) => record.studentId === studentId)?.status || 'PRESENT',
                      })),
                    }))
                    setHistoryConfirmed(false)
                  }}
                  options={selectedHistoryGroup.students.map((student) => ({
                    value: student.id,
                    label: `${student.name}（剩余${student.remainHours.toFixed(1)}小时）`,
                  }))}
                  maxTagCount="responsive"
                  style={{ width: '100%' }}
                  getPopupContainer={(trigger) => trigger.parentElement || document.body}
                />
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                {historyDraft.records.map((record) => {
                  const student = selectedHistoryGroup.students.find((item) => item.id === record.studentId)
                  const deductHours = record.status === 'PRESENT' || record.status === 'ABSENT'
                    ? historyDraft.actualMinutes / 60
                    : 0
                  return (
                    <div
                      key={record.studentId}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) 210px',
                        gap: 8,
                        padding: 10,
                        borderRadius: 10,
                        border: '1px solid var(--color-border, #EEE7E1)',
                        background: '#FCFBF9',
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <Text strong>{student?.name || '学生'}</Text>
                        <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>
                          当前剩余 {Number(student?.remainHours || 0).toFixed(1)} 小时 · 本次预计扣 {deductHours.toFixed(1)} 小时
                        </Text>
                      </div>
                      <Select
                        value={record.status}
                        onChange={(status: HistoryStatus) => {
                          setHistoryDraft((current) => ({
                            ...current,
                            records: current.records.map((item) => (
                              item.studentId === record.studentId ? { ...item, status } : item
                            )),
                          }))
                          setHistoryConfirmed(false)
                        }}
                        options={[
                          { value: 'PRESENT', label: '正常出勤（扣课）' },
                          { value: 'LEAVE', label: '学生请假（不扣课）' },
                          { value: 'ABSENT', label: '缺勤（扣课）' },
                          { value: 'MAKEUP', label: '补课标记（不扣课）' },
                        ]}
                        style={{ width: '100%' }}
                        getPopupContainer={(trigger) => trigger.parentElement || document.body}
                      />
                    </div>
                  )
                })}
              </div>

              <div>
                <Text strong style={{ display: 'block', marginBottom: 5 }}>补录原因 *</Text>
                <Input.TextArea
                  rows={3}
                  maxLength={500}
                  showCount
                  value={historyDraft.reason}
                  onChange={(event) => {
                    setHistoryDraft((current) => ({ ...current, reason: event.target.value }))
                    setHistoryConfirmed(false)
                  }}
                  placeholder="例如：系统上线前已完成授课，根据原始考勤表补录"
                  style={{ resize: 'none' }}
                />
              </div>

              <Checkbox
                checked={historyConfirmed}
                onChange={(event) => setHistoryConfirmed(event.target.checked)}
              >
                我已核对原始考勤记录，并确认同步扣减课时、生成对应教师工资。
              </Checkbox>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                paddingTop: 12,
                borderTop: '1px solid var(--color-border, #EEE7E1)',
              }}>
                <Button onClick={() => setHistoryOpen(false)} style={{ minHeight: 44, borderRadius: 10 }}>
                  取消
                </Button>
                <Button
                  type="primary"
                  loading={historySaving}
                  disabled={!historyConfirmed}
                  onClick={submitHistory}
                  style={{ minHeight: 44, borderRadius: 10, background: '#E8784A' }}
                >
                  确认补录并结算
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Create Modal */}
      <Modal title="安排突击全能班课程" open={createOpen}
        onCancel={() => setCreateOpen(false)} onOk={handleCreate}
        confirmLoading={saving} okText="确认排课" cancelText="取消" width={440}
        okButtonProps={{ style: { background: INTENSIVE_COLOR, borderColor: INTENSIVE_COLOR } }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>桌位</Text>
            <Input value={createData.roomName || ''} readOnly style={{ background: '#f5f5f5' }} />
          </div>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>时间</Text>
            <Input value={`${createData.date || ''} ${createData.startTime || ''}-${createData.endTime || ''}`} readOnly style={{ background: '#f5f5f5' }} />
          </div>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>班型 *</Text>
            <Select style={{ width: '100%' }} value={createData.teachingType}
              onChange={(value) => setCreateData((current) => ({ ...current, teachingType: value, studentIds: [] }))}
              options={[
                { label: '一对一', value: 'ONE_ON_ONE' },
                { label: '一对二', value: 'ONE_ON_TWO' },
                { label: '一对三', value: 'ONE_ON_THREE' },
              ]} />
          </div>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>老师 *</Text>
            <MobileSelect placeholder="选择老师" style={{ width: '100%' }}
              value={createData.teacherId || undefined} onChange={v => setCreateData(p => ({ ...p, teacherId: v }))}
              options={teacherList.map((t: Record<string, unknown>) => ({ label: t.name as string, value: t.id as string }))} />
          </div>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>学员（需要 {getPersonalClassLimit(createData.teachingType)} 人）*</Text>
            <Select mode="multiple" placeholder="选择学员" style={{ width: '100%' }}
              value={createData.studentIds} onChange={(value: string[]) => {
                const limit = getPersonalClassLimit(createData.teachingType)
                if (value.length > limit) return message.warning(`最多选择${limit}名学员`)
                setCreateData((current) => ({ ...current, studentIds: value }))
              }}
              options={studentList.map((s: Record<string, unknown>) => ({ label: `${s.name}${s.grade ? ` (${s.grade})` : ''}`, value: s.id as string }))} />
          </div>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>课程/科目 *</Text>
            <Select showSearch optionFilterProp="label" placeholder="选择课程" style={{ width: '100%' }}
              value={createData.courseId || undefined} onChange={(value) => setCreateData((current) => ({ ...current, courseId: value }))}
              options={courseList.map((course) => ({ label: `${course.name}${course.subject ? ` · ${course.subject}` : ''}`, value: course.id as string }))} />
          </div>
          {conflictMsg && (
            <div style={{ background: 'rgba(226,75,74,.08)', border: '1px solid rgba(226,75,74,.2)', borderRadius: 6, padding: 10, fontSize: 11, color: '#E24B4A' }}>
              {conflictMsg}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
