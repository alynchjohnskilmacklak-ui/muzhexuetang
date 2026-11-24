'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
  Alert,
  Button,
  Card,
  Drawer,
  Segmented,
  Select,
  Space,
  Tag,
  Typography,
  message,
  Input,
  InputNumber,
  Tooltip,
} from 'antd'
import {
  CheckCircleOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
  ExclamationCircleOutlined,
  FieldTimeOutlined,
} from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { BrandModal } from '@/components/Common/BrandModal'
import { format, addDays, subDays } from 'date-fns'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useDivision } from '@/contexts/DivisionContext'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { useSchedulePeriods } from '@/hooks/useSchedulePeriods'
import { isFirstTeachingPeriod } from '@/lib/schedule-periods'
import {
  markAllPresentPreservingLeave,
  normalizeAttendanceRecordStatus,
  resolveAttendanceSubmissionStatus,
} from '@/lib/attendance-status'
import { annotateConsecutiveLessons } from '@/lib/classroom-feedback/feedback-session-grouping'
import styles from './attendance.module.css'

const { Text } = Typography

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error('加载失败'); return r.json() })

type AttStatus = 'present' | 'leave'

const CLASS_TYPE_LABELS: Record<string, string> = {
  ONE_ON_ONE: '一对一',
  ONE_ON_TWO: '一对二',
  ONE_ON_THREE: '一对三',
  SMALL_GROUP: '小班课',
  GROUP: '班课',
  SMALL_CLASS: '小班课',
}

const STATUS_TAG: Record<string, { label: string; color: string }> = {
  pending: { label: '待考勤', color: 'orange' },
  done: { label: '已完成', color: 'green' },
}

function getPeriodGroup(startTime: string): string {
  const h = parseInt(startTime?.split(':')[0] || new Date(startTime).getHours().toString())
  if (h < 12) return '上午'
  if (h < 18) return '下午'
  return '晚上'
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch { return iso }
}

function toLocalStatus(status: unknown): AttStatus {
  const value = String(status || '').toUpperCase()
  if (value === 'LEAVE' || value === 'ABSENT') return 'leave'
  return 'present'
}

function toApiStatus(status: AttStatus) {
  if (status === 'leave') return 'LEAVE'
  return 'PRESENT'
}

function buildTimeIso(date: string, time: unknown) {
  const value = String(time || '00:00').slice(0, 5)
  return `${date}T${value}:00`
}

export default function AttendancePage() {
  const isMobile = useIsMobile() ?? false
  const router = useRouter()
  const { division } = useDivision()
  const { periods } = useSchedulePeriods(division)
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [filterTeacherId, setFilterTeacherId] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const query = `/api/attendance/today?date=${selectedDate}&division=${division}${filterTeacherId ? `&teacherId=${filterTeacherId}` : ''}`
  const { data: lessonsRaw, error: lessonsError, mutate: mutateData, isLoading } = useSWR(query, fetcher, { refreshInterval: 120_000 })
  const { data: teachersData } = useSWR('/api/teachers?status=ACTIVE&limit=100', fetcher)

  const [selectedSchedule, setSelectedSchedule] = useState<Record<string, unknown> | null>(null)
  const [attMap, setAttMap] = useState<Map<string, AttStatus>>(new Map())
  const [changedStudentIds, setChangedStudentIds] = useState<Set<string>>(new Set())
  const [mealStudentIds, setMealStudentIds] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [attendanceDrawerOpen, setAttendanceDrawerOpen] = useState(false)
  const [actualMinutes, setActualMinutes] = useState<number | null>(null)
  const [adjustmentOpen, setAdjustmentOpen] = useState(false)
  const [adjustmentMinutes, setAdjustmentMinutes] = useState<number | null>(null)
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [adjusting, setAdjusting] = useState(false)

  const teacherList: Record<string, unknown>[] = Array.isArray(teachersData?.teachers) ? teachersData.teachers : Array.isArray(teachersData) ? teachersData : []
  const rawSchedules: Record<string, unknown>[] = Array.isArray(lessonsRaw) ? lessonsRaw.map((lesson: Record<string, unknown>) => {
    const group = lesson.group as Record<string, unknown> | undefined
    const students: Record<string, unknown>[] = (Array.isArray(lesson.students) ? lesson.students as Record<string, unknown>[] : []).map((student) => ({
      ...student,
      originalStatus: normalizeAttendanceRecordStatus(student.status),
      status: toLocalStatus(student.status),
    }))
    const lessonDate = String(lesson.lessonDate || selectedDate).slice(0, 10)
    const classType = lesson.intensiveMode === 'INTENSIVE'
      ? lesson.teachingType as string || 'ONE_ON_ONE'
      : group?.type as string || ''
    return {
      id: lesson.id,
      lessonId: lesson.id,
      title: `${group?.courseName || ''} ${group?.name || ''}`.trim(),
      classType,
      startTime: buildTimeIso(lessonDate, lesson.startTime),
      endTime: buildTimeIso(lessonDate, lesson.endTime),
      teacherName: group?.teacherName || '-',
      teacherId: group?.teacherId || '',
      roomName: group?.roomName || '未分配',
      studentCount: lesson.totalStudents || students.length,
      attendanceStatus: Number(lesson.attendanceCount || 0) > 0 ? 'done' : 'pending',
      intensiveMode: lesson.intensiveMode,
      teachingType: lesson.teachingType,
      plannedMinutes: lesson.plannedMinutes,
      actualMinutes: lesson.actualMinutes,
      settlementStatus: lesson.settlementStatus,
      students,
      attendances: students.filter((student) => student.status).map((student) => ({
        studentId: student.studentId,
        status: student.status,
      })),
    }
  }) : []

  const consecutiveLessonMap = useMemo(() => {
    if (!Array.isArray(lessonsRaw)) return new Map()
    return annotateConsecutiveLessons(
      lessonsRaw.map((l: Record<string, unknown>) => ({
        id: String(l.id || ''),
        groupId: String(l.groupId || (l.group as Record<string, unknown>)?.id || ''),
        lessonDate: String(l.lessonDate || selectedDate),
        startTime: l.startTime ? String(l.startTime) : null,
        endTime: l.endTime ? String(l.endTime) : null,
        teacherId: l.teacherId ? String(l.teacherId) : null,
        subject: (l.subject ? String(l.subject) : null) || ((l.group as Record<string, unknown>)?.course as Record<string, unknown>)?.subject ? String(((l.group as Record<string, unknown>)?.course as Record<string, unknown>)?.subject) : null,
      }))
    )
  }, [lessonsRaw, selectedDate])

  const schedules: Record<string, unknown>[] = rawSchedules.map((schedule) => ({
    ...schedule,
    isSystemFirstPeriod: isFirstTeachingPeriod(periods, formatTime(String(schedule.startTime || ''))),
  }))

  // KPI 大盘指标聚合
  const kpiStats = useMemo(() => {
    const totalLessons = schedules.length
    const pendingLessons = schedules.filter(s => s.attendanceStatus === 'pending').length
    const doneLessons = schedules.filter(s => s.attendanceStatus === 'done').length

    let totalStudents = 0
    let presentStudents = 0
    let leaveStudents = 0

    schedules.forEach(s => {
      const students = Array.isArray(s.students) ? s.students : []
      totalStudents += students.length
      students.forEach((st: Record<string, unknown>) => {
        if (st.status === 'present') presentStudents++
        else if (st.status === 'leave') leaveStudents++
      })
    })

    const attendanceRate = totalStudents > 0 ? Math.round((presentStudents / totalStudents) * 100) : 100

    return {
      totalLessons,
      pendingLessons,
      doneLessons,
      totalStudents,
      presentStudents,
      leaveStudents,
      attendanceRate,
    }
  }, [schedules])

  // 综合筛选列表
  const allSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      if (filterType && schedule.classType !== filterType) return false
      if (filterStatus === 'pending' && schedule.attendanceStatus !== 'pending') return false
      if (filterStatus === 'done' && schedule.attendanceStatus !== 'done') return false
      return true
    })
  }, [schedules, filterType, filterStatus])

  const groupedSchedules = useMemo(() => {
    const groups: Record<string, Record<string, unknown>[]> = { '上午': [], '下午': [], '晚上': [] }
    allSchedules.forEach(s => {
      const period = getPeriodGroup(formatTime(s.startTime as string))
      groups[period].push(s)
    })
    return groups
  }, [allSchedules])

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const handleDateOffset = (offset: number) => {
    try {
      const cur = new Date(selectedDate)
      const nextDate = offset > 0 ? addDays(cur, offset) : subDays(cur, Math.abs(offset))
      setSelectedDate(format(nextDate, 'yyyy-MM-dd'))
    } catch {}
  }

  const handleSelectSchedule = (schedule: Record<string, unknown>) => {
    const startTimeStr = ((schedule.startTime as string) || '').substring(11, 16)
    const dateStr = ((schedule.startTime as string) || '').substring(0, 10)
    if (startTimeStr && dateStr) {
      const [hour, minute] = startTimeStr.split(':').map(Number)
      const lessonStart = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`)
      const earliestAllowed = new Date(lessonStart.getTime() - 30 * 60 * 1000)
      if (new Date() < earliestAllowed) {
        message.warning(`未到考勤时间，${startTimeStr} 开课，最早 ${earliestAllowed.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 可开始考勤`)
        return
      }
    }
    setSelectedSchedule(schedule)
    const students = (schedule.students as Array<Record<string, unknown>>) || []
    const existingAtts = (schedule.attendances as Array<Record<string, unknown>>) || []
    const newMap = new Map<string, AttStatus>()
    students.forEach((stu: Record<string, unknown>) => {
      const existing = existingAtts.find(a => a.studentId === stu.studentId)
      newMap.set(stu.studentId as string, (existing?.status as AttStatus) || 'present')
    })
    setAttMap(newMap)
    setChangedStudentIds(new Set())
    setMealStudentIds(new Set(
      students.filter((student) => Boolean(student.eating)).map((student) => String(student.studentId)),
    ))
    setActualMinutes(Number(schedule.actualMinutes || schedule.plannedMinutes || 0) || null)
    if (isMobile) {
      setAttendanceDrawerOpen(true)
    }
  }

  const setAllPresent = () => {
    const students = (selectedSchedule?.students as Array<Record<string, unknown>>) || []
    const currentStatuses = new Map<string, 'PRESENT' | 'LEAVE'>()
    students.forEach((student) => {
      const studentId = String(student.studentId)
      const displayedStatus = attMap.get(studentId) || toLocalStatus(student.status)
      currentStatuses.set(studentId, displayedStatus === 'leave' ? 'LEAVE' : 'PRESENT')
    })
    const result = markAllPresentPreservingLeave(students.map((student) => String(student.studentId)), currentStatuses)
    const newMap = new Map(attMap)
    result.statuses.forEach((status, studentId) => newMap.set(studentId, status === 'LEAVE' ? 'leave' : 'present'))
    setAttMap(newMap)
    setChangedStudentIds((current) => {
      const next = new Set(current)
      result.updatedStudentIds.forEach((studentId) => next.add(studentId))
      return next
    })
    if (result.preservedStudentIds.length > 0) {
      message.info(`已保留 ${result.preservedStudentIds.length} 位请假/未到校学员状态；如确认到课，请单独调整。`)
    }
  }

  const setStudentStatus = (studentId: string, status: AttStatus) => {
    setAttMap(prev => { const next = new Map(prev); next.set(studentId, status); return next })
    setChangedStudentIds(prev => new Set(prev).add(studentId))
  }

  const toggleMeal = (studentId: string) => {
    setMealStudentIds((current) => {
      const next = new Set(current)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  const summary = useMemo(() => {
    if (!attMap.size) return { present: 0, leave: 0 }
    const vals = [...attMap.values()]
    return {
      present: vals.filter(s => s === 'present').length,
      leave: vals.filter(s => s === 'leave').length,
    }
  }, [attMap])

  const handleSubmit = async () => {
    if (!selectedSchedule) return
    const students = (selectedSchedule.students as Array<Record<string, unknown>>) || []
    setSubmitting(true)
    const records = students.map(s => ({
      studentId: s.studentId,
      status: resolveAttendanceSubmissionStatus({
        displayedStatus: toApiStatus(attMap.get(s.studentId as string) || 'present'),
        originalStatus: s.originalStatus,
        changed: changedStudentIds.has(String(s.studentId)),
      }),
      actualMinutes: selectedSchedule.intensiveMode === 'INTENSIVE' ? actualMinutes : undefined,
    }))
    if (selectedSchedule.intensiveMode === 'INTENSIVE' && !actualMinutes) {
      message.warning('请填写实际授课分钟')
      setSubmitting(false)
      return
    }
    try {
      const lessonId = (selectedSchedule.lessonId || selectedSchedule.id) as string
      const res = await fetch('/api/admin/attendance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId,
          teacherId: typeof (selectedSchedule.group as Record<string, unknown> | undefined)?.teacherId === 'string'
            ? (selectedSchedule.group as Record<string, unknown>).teacherId
            : undefined,
          records,
          eatingStudentIds: selectedSchedule.isSystemFirstPeriod ? Array.from(mealStudentIds) : undefined,
          actualMinutes: selectedSchedule.intensiveMode === 'INTENSIVE' ? actualMinutes : undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '提交失败')
      }
      message.success('考勤提交成功')
      await mutateData()
      setSelectedSchedule((current) => current ? { ...current, attendanceStatus: 'done' } : current)
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '提交考勤失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const openSettlementAdjustment = () => {
    setAdjustmentMinutes(Number(selectedSchedule?.actualMinutes || selectedSchedule?.plannedMinutes || 0) || null)
    setAdjustmentReason('')
    setAdjustmentOpen(true)
  }

  const handleSettlementAdjustment = async () => {
    if (!selectedSchedule || !adjustmentMinutes || !adjustmentReason.trim()) {
      message.warning('请填写新的实际分钟和调整原因')
      return
    }
    setAdjusting(true)
    try {
      const lessonId = (selectedSchedule.lessonId || selectedSchedule.id) as string
      const res = await fetch('/api/admin/intensive-settlement/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, newMinutes: adjustmentMinutes, reason: adjustmentReason.trim() }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.error || '调整失败')
      message.success(payload.idempotent ? '结算数据未变化，无需重复调整' : '结算调整成功')
      setAdjustmentOpen(false)
      setActualMinutes(adjustmentMinutes)
      setSelectedSchedule((current) => current ? {
        ...current,
        actualMinutes: adjustmentMinutes,
        settlementStatus: 'ADJUSTED',
      } : current)
      await mutateData()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '调整失败')
    } finally {
      setAdjusting(false)
    }
  }

  return (
    <PageLayout title="考勤管理" subtitle="全校课程签到大盘 · 缺勤补课联动 · 课时审核">
      <div className={styles.container}>
        {/* 顶部 KPI 全校考勤大盘 */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className={styles.kpiLabel}>今日排课总数</div>
              <div className={styles.kpiValue} style={{ color: '#14574D' }}>
                {kpiStats.totalLessons} <span style={{ fontSize: 13, fontWeight: 400 }}>节</span>
              </div>
              <div className={styles.kpiSub}>涵盖全校所有在读班型</div>
            </div>
            <div className={styles.kpiIconWrapper} style={{ background: '#E8F2F0', color: '#14574D' }}>
              <FieldTimeOutlined />
            </div>
          </div>

          <div
            className={styles.kpiCard}
            style={{ cursor: 'pointer' }}
            onClick={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className={styles.kpiLabel}>待考勤课次</div>
              <div className={styles.kpiValue} style={{ color: kpiStats.pendingLessons > 0 ? '#E8784A' : '#14574D' }}>
                {kpiStats.pendingLessons} <span style={{ fontSize: 13, fontWeight: 400 }}>节</span>
              </div>
              <div className={styles.kpiSub}>
                {kpiStats.pendingLessons > 0 ? '点击快速筛选待录入课次' : '今日已全部考勤完毕'}
              </div>
            </div>
            <div className={styles.kpiIconWrapper} style={{ background: '#FFF1EB', color: '#E8784A' }}>
              <ClockCircleOutlined />
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className={styles.kpiLabel}>出勤率 / 实到人次</div>
              <div className={styles.kpiValue} style={{ color: '#1E8E3E' }}>
                {kpiStats.attendanceRate}%
                <span style={{ fontSize: 13, fontWeight: 400, color: '#6B7280', marginLeft: 8 }}>
                  ({kpiStats.presentStudents}/{kpiStats.totalStudents})
                </span>
              </div>
              <div className={styles.kpiSub}>应到总人次：{kpiStats.totalStudents} 人次</div>
            </div>
            <div className={styles.kpiIconWrapper} style={{ background: '#EAF7EE', color: '#1E8E3E' }}>
              <CheckCircleOutlined />
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className={styles.kpiLabel}>请假/缺勤学员</div>
              <div className={styles.kpiValue} style={{ color: kpiStats.leaveStudents > 0 ? '#8A6517' : '#6B7280' }}>
                {kpiStats.leaveStudents} <span style={{ fontSize: 13, fontWeight: 400 }}>人次</span>
              </div>
              <div className={styles.kpiSub}>可快捷发起一对一补课排期</div>
            </div>
            <div className={styles.kpiIconWrapper} style={{ background: '#FEF8E8', color: '#8A6517' }}>
              <ExclamationCircleOutlined />
            </div>
          </div>
        </div>

        {/* 紧凑工具栏与筛选器 */}
        <div className={styles.toolbarCard}>
          <div className={styles.toolbarRow}>
            <Space wrap size={10}>
              {/* 快捷日期切换胶囊 */}
              <div className={styles.quickDateGroup}>
                <button
                  type="button"
                  className={styles.quickDateBtn}
                  onClick={() => handleDateOffset(-1)}
                  title="查看前一天"
                >
                  前一天
                </button>
                <button
                  type="button"
                  className={`${styles.quickDateBtn} ${selectedDate === todayStr ? styles.quickDateBtnActive : ''}`}
                  onClick={() => setSelectedDate(todayStr)}
                >
                  今天
                </button>
                <button
                  type="button"
                  className={styles.quickDateBtn}
                  onClick={() => handleDateOffset(1)}
                  title="查看后一天"
                >
                  后一天
                </button>
              </div>

              <Input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ width: 150, borderRadius: 8 }}
              />

              <Select
                allowClear
                placeholder="按授课教师筛选"
                style={{ width: 160 }}
                value={filterTeacherId || undefined}
                onChange={v => setFilterTeacherId(v || '')}
                virtual={false}
                getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
                options={teacherList.map((t: Record<string, unknown>) => ({ label: t.name as string, value: t.id as string }))}
              />

              <Segmented
                aria-label="按班型筛选"
                value={filterType || 'all'}
                onChange={(value) => setFilterType(value === 'all' ? '' : String(value))}
                options={[
                  { label: '全部班型', value: 'all' },
                  { label: '一对一', value: 'ONE_ON_ONE' },
                  { label: '一对二', value: 'ONE_ON_TWO' },
                  { label: '一对三', value: 'ONE_ON_THREE' },
                  { label: '小班课', value: 'SMALL_CLASS' },
                ]}
              />

              <Segmented
                aria-label="按考勤状态筛选"
                value={filterStatus}
                onChange={(value) => setFilterStatus(String(value))}
                options={[
                  { label: '全部状态', value: 'all' },
                  { label: '待考勤', value: 'pending' },
                  { label: '已完成', value: 'done' },
                ]}
              />
            </Space>

            <div style={{ fontSize: 13, color: '#6B7280' }}>
              当前筛选：<span style={{ fontWeight: 600, color: '#14574D' }}>{allSchedules.length}</span> 节课
              {(filterType || filterTeacherId || filterStatus !== 'all') && (
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    setFilterType('')
                    setFilterTeacherId('')
                    setFilterStatus('all')
                  }}
                  style={{ color: '#E8784A', padding: '0 4px' }}
                >
                  重置筛选
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 考勤内容区 */}
        {lessonsError ? (
          <Alert
            type="error"
            showIcon
            message={lessonsError instanceof Error ? lessonsError.message : '课程考勤数据加载失败'}
            action={<Button size="small" onClick={() => void mutateData()}>重试</Button>}
            style={{ borderRadius: 8 }}
          />
        ) : isLoading ? (
          <CardSkeleton rows={3} />
        ) : allSchedules.length === 0 ? (
          <Card variant="borderless" style={{ borderRadius: 12, minHeight: 320, display: 'grid', placeItems: 'center', background: '#ffffff', border: '1px solid #EEE7E1' }}>
            <GuidedEmpty
              title={filterType || filterTeacherId || filterStatus !== 'all' ? '未找到符合筛选条件的课程' : `${selectedDate} 暂无排课记录`}
              description={filterType || filterTeacherId || filterStatus !== 'all' ? '可以重置当前筛选条件，查看该日期的其他课程安排。' : '可前往课程管理或排课工作台进行添加。'}
              actionLabel={filterType || filterTeacherId || filterStatus !== 'all' ? '清空筛选' : '去排课工作台'}
              onAction={() => {
                if (filterType || filterTeacherId || filterStatus !== 'all') {
                  setFilterType('')
                  setFilterTeacherId('')
                  setFilterStatus('all')
                } else {
                  router.push('/schedule/workbench')
                }
              }}
            />
          </Card>
        ) : (
          <div className={styles.workspace}>
            {/* 左侧课次列表 */}
            <div className={styles.scheduleColumn}>
              {(['上午', '下午', '晚上'] as const).map(period => {
                const items = groupedSchedules[period]
                if (!items.length) return null
                return (
                  <div key={period} style={{ marginBottom: 14 }}>
                    <div className={styles.periodBadge}>
                      <ClockCircleOutlined /> {period} · {items.length} 节
                    </div>
                    {items.map((s: Record<string, unknown>) => {
                      const isSelected = selectedSchedule?.id === s.id
                      const attStatus = s.attendanceStatus as string || 'pending'
                      const isOneOnOne = s.classType === 'ONE_ON_ONE'
                      const consecutiveMeta = consecutiveLessonMap.get(s.id as string)
                      return (
                        <div
                          key={s.id as string}
                          onClick={() => handleSelectSchedule(s)}
                          className={`${styles.scheduleCard} ${isSelected ? styles.scheduleCardActive : ''}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                            <Text strong style={{ fontSize: 14, color: '#1F2937', flex: 1, lineHeight: 1.35 }} ellipsis>
                              {s.title as string}
                            </Text>
                            <Space size={4}>
                              {consecutiveMeta?.isConsecutive && (
                                <Tag color="cyan" style={{ borderRadius: 9999, fontSize: 11, margin: 0 }}>
                                  连堂 {consecutiveMeta.consecutiveIndex}/{consecutiveMeta.totalInSession}
                                </Tag>
                              )}
                              <Tag color={isOneOnOne ? 'purple' : 'orange'} style={{ borderRadius: 9999, fontSize: 11, margin: 0 }}>
                                {CLASS_TYPE_LABELS[s.classType as string] || s.classType as string}
                              </Tag>
                            </Space>
                          </div>

                          <div style={{ fontSize: 12, color: '#4B5563', marginBottom: 4 }}>
                            <ClockCircleOutlined style={{ marginRight: 6, color: '#14574D' }} />
                            {formatTime(s.startTime as string)} - {formatTime(s.endTime as string)}
                          </div>

                          <div style={{ fontSize: 12, color: '#4B5563', marginBottom: 4 }}>
                            <UserOutlined style={{ marginRight: 6, color: '#14574D' }} />
                            教师：{s.teacherName as string}
                          </div>

                          <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
                            <span><EnvironmentOutlined style={{ marginRight: 4 }} />{s.roomName as string}</span>
                            <span><TeamOutlined style={{ marginRight: 4 }} />{s.studentCount as number} 人</span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTop: '1px dashed #F0EBE5' }}>
                            <Tag color={STATUS_TAG[attStatus]?.color || 'default'} style={{ borderRadius: 9999, fontSize: 10 }}>
                              {STATUS_TAG[attStatus]?.label || attStatus}
                            </Tag>
                            <Button
                              size="small"
                              type={isSelected ? 'primary' : 'default'}
                              style={{
                                background: isSelected ? 'var(--color-primary, #14574D)' : '#ffffff',
                                borderColor: 'var(--color-primary, #14574D)',
                                color: isSelected ? '#ffffff' : '#14574D',
                                borderRadius: 6,
                                fontSize: 11,
                              }}
                            >
                              {isSelected ? '正在考勤' : '选择考勤'}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            {/* 右侧考勤花名册与录入面板 */}
            <div>
              {!selectedSchedule ? (
                <Card variant="borderless" style={{ borderRadius: 12, minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', border: '1px solid #EEE7E1' }}>
                  <GuidedEmpty
                    title="请选择左侧课次开始考勤"
                    description="点击左侧任意课程卡片，即可调取该班级学员花名册，支持一键全勤、请假登记与智能补课排期。"
                    compact
                  />
                </Card>
              ) : (() => {
                const students = (selectedSchedule.students as Array<Record<string, unknown>>) || []
                return (
                  <div className={styles.rosterPanel}>
                    {/* 课次标题与快速操作 */}
                    <div className={styles.rosterHeader}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <Text strong style={{ fontSize: 16, color: '#1F2937' }}>{selectedSchedule.title as string}</Text>
                          {consecutiveLessonMap.get(selectedSchedule.id as string)?.isConsecutive && (
                            <Tag color="cyan" style={{ borderRadius: 9999 }}>
                              连堂 {consecutiveLessonMap.get(selectedSchedule.id as string)?.consecutiveIndex}/{consecutiveLessonMap.get(selectedSchedule.id as string)?.totalInSession}
                            </Tag>
                          )}
                          <Tag color={selectedSchedule.classType === 'ONE_ON_ONE' ? 'purple' : 'orange'} style={{ borderRadius: 9999 }}>
                            {CLASS_TYPE_LABELS[selectedSchedule.classType as string] || selectedSchedule.classType as string}
                          </Tag>
                          <Tag color={selectedSchedule.attendanceStatus === 'done' ? 'green' : 'orange'} style={{ borderRadius: 9999 }}>
                            {STATUS_TAG[selectedSchedule.attendanceStatus as string]?.label || (selectedSchedule.attendanceStatus as string)}
                          </Tag>
                        </div>
                        <Space size={16} wrap>
                          <span style={{ fontSize: 12, color: '#6B7280' }}>
                            <UserOutlined style={{ marginRight: 4, color: '#14574D' }} />{selectedSchedule.teacherName as string}
                          </span>
                          <span style={{ fontSize: 12, color: '#6B7280' }}>
                            <EnvironmentOutlined style={{ marginRight: 4, color: '#14574D' }} />{selectedSchedule.roomName as string}
                          </span>
                          <span style={{ fontSize: 12, color: '#6B7280' }}>
                            <ClockCircleOutlined style={{ marginRight: 4, color: '#14574D' }} />{formatTime(selectedSchedule.startTime as string)} - {formatTime(selectedSchedule.endTime as string)}
                          </span>
                          <span style={{ fontSize: 12, color: '#6B7280' }}>
                            <TeamOutlined style={{ marginRight: 4, color: '#14574D' }} />{students.length} 位学员
                          </span>
                        </Space>
                      </div>
                      <Button
                        type="default"
                        disabled={selectedSchedule.intensiveMode === 'INTENSIVE' && selectedSchedule.settlementStatus !== 'UNSETTLED'}
                        onClick={setAllPresent}
                        style={{ borderColor: '#14574D', color: '#14574D', borderRadius: 8 }}
                        icon={<CheckSquareOutlined />}
                      >
                        一键全勤（保留请假）
                      </Button>
                    </div>

                    {/* 突击班模式下的课时核对 */}
                    {selectedSchedule.intensiveMode === 'INTENSIVE' && (
                      <div style={{ background: '#FAF8F5', border: '1px solid #EEE7E1', borderRadius: 8, padding: '10px 14px' }}>
                        <Space wrap align="center">
                          <Text strong style={{ fontSize: 13, color: '#1F2937' }}>实际授课课时：</Text>
                          <InputNumber
                            min={1}
                            max={600}
                            value={actualMinutes}
                            disabled={selectedSchedule.settlementStatus !== 'UNSETTLED'}
                            onChange={(value) => setActualMinutes(value)}
                            addonAfter="分钟"
                            style={{ width: 140 }}
                          />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            (计划 {String(selectedSchedule.plannedMinutes || '-')} 分钟)
                          </Text>
                          {selectedSchedule.settlementStatus !== 'UNSETTLED' && (
                            <>
                              <Tag color="green">已结算锁定</Tag>
                              <Button size="small" onClick={openSettlementAdjustment}>调整结算</Button>
                            </>
                          )}
                        </Space>
                      </div>
                    )}

                    {Boolean(selectedSchedule.isSystemFirstPeriod) && (
                      <Alert
                        type="info"
                        showIcon
                        message="当前为系统第一课节，可在此同步登记学员午餐/晚餐就餐需求（绿色点亮即代表登记就餐）。"
                        style={{ borderRadius: 8 }}
                      />
                    )}

                    {/* 学员花名册列表 */}
                    <div className={styles.rosterStudentList}>
                      {students.map((s: Record<string, unknown>) => {
                        const studentId = String(s.studentId)
                        const status = attMap.get(studentId) || 'present'
                        const studentName = String(s.studentName || '学员')
                        const initial = studentName[0] || '?'
                        const isLeave = status === 'leave'

                        return (
                          <div key={studentId} className={styles.studentCard}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div className={styles.studentAvatar}>
                                {initial}
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span className={styles.studentName}>{studentName}</span>
                                  {isLeave && (
                                    <Tag color="warning" style={{ fontSize: 11, padding: '0 6px', borderRadius: 4, margin: 0 }}>
                                      请假 / 缺勤
                                    </Tag>
                                  )}
                                </div>
                                {isLeave && (
                                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                    <Tooltip title="针对当前请假缺席的学员，一键跳转突击排课工作台为其安排补课">
                                      <a
                                        href={`/schedule/intensive?studentId=${studentId}`}
                                        onClick={(e) => {
                                          e.preventDefault()
                                          router.push(`/schedule/intensive?studentId=${studentId}`)
                                        }}
                                        className={styles.makeupLinkBtn}
                                      >
                                        <CalendarOutlined style={{ fontSize: 11 }} /> 安排补课
                                      </a>
                                    </Tooltip>
                                    <Tooltip title="查看该学员的剩余课时与历史学情档案">
                                      <a
                                        href={`/student-archive?studentId=${studentId}`}
                                        onClick={(e) => {
                                          e.preventDefault()
                                          router.push(`/student-archive?studentId=${studentId}`)
                                        }}
                                        style={{
                                          fontSize: 11,
                                          color: '#14574D',
                                          background: '#EDF5F3',
                                          border: '1px solid #C4DFD9',
                                          padding: '2px 8px',
                                          borderRadius: 6,
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 4,
                                          textDecoration: 'none',
                                        }}
                                      >
                                        <FileTextOutlined style={{ fontSize: 11 }} /> 档案
                                      </a>
                                    </Tooltip>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className={styles.statusButtonGroup}>
                              {(['present', 'leave'] as AttStatus[]).map(t => {
                                const active = status === t
                                return (
                                  <button
                                    key={t}
                                    type="button"
                                    disabled={selectedSchedule.intensiveMode === 'INTENSIVE' && selectedSchedule.settlementStatus !== 'UNSETTLED'}
                                    onClick={() => setStudentStatus(studentId, t)}
                                    className={`${styles.statusBtn} ${active ? (t === 'present' ? styles.statusBtnPresentActive : styles.statusBtnLeaveActive) : ''}`}
                                  >
                                    {t === 'present' ? '出勤' : '请假'}
                                  </button>
                                )
                              })}
                              {Boolean(selectedSchedule.isSystemFirstPeriod) && (
                                <button
                                  type="button"
                                  className={`attendance-meal-toggle ${mealStudentIds.has(studentId) ? 'is-active' : ''}`}
                                  onClick={() => toggleMeal(studentId)}
                                >
                                  就餐
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* 底部结算与提交 Dock */}
                    <div className={styles.rosterFooter}>
                      <Space size={20}>
                        <span style={{ fontSize: 13, color: '#1E8E3E', fontWeight: 600 }}>
                          出勤 {summary.present} 人
                        </span>
                        <span style={{ fontSize: 13, color: '#E8784A', fontWeight: 600 }}>
                          请假 {summary.leave} 人
                        </span>
                        {Boolean(selectedSchedule.isSystemFirstPeriod) && (
                          <span style={{ fontSize: 13, color: '#8A6517', fontWeight: 600 }}>
                            就餐 {mealStudentIds.size} 人
                          </span>
                        )}
                      </Space>
                      <Button
                        type="primary"
                        loading={submitting}
                        onClick={handleSubmit}
                        disabled={selectedSchedule.intensiveMode === 'INTENSIVE' && selectedSchedule.settlementStatus !== 'UNSETTLED'}
                        style={{
                          background: 'var(--color-primary, #14574D)',
                          borderColor: 'var(--color-primary, #14574D)',
                          borderRadius: 8,
                          minWidth: 130,
                          height: 38,
                          fontWeight: 600,
                        }}
                        icon={<CheckCircleOutlined />}
                      >
                        提交考勤
                      </Button>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}

        {/* 手机端考勤 Drawer */}
        {isMobile && (
          <Drawer
            open={attendanceDrawerOpen}
            onClose={() => setAttendanceDrawerOpen(false)}
            placement="bottom"
            height="90vh"
            title={selectedSchedule ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700 }}>{selectedSchedule.title as string}</span>
                <Tag color={selectedSchedule.classType === 'ONE_ON_ONE' ? 'purple' : 'orange'} style={{ borderRadius: 9999, fontSize: 10 }}>
                  {CLASS_TYPE_LABELS[selectedSchedule.classType as string] || String(selectedSchedule.classType || '')}
                </Tag>
              </div>
            ) : '考勤'}
            styles={{ body: { padding: 0, overflowY: 'auto' } }}
            destroyOnClose={false}
          >
            {selectedSchedule && (() => {
              const students = (selectedSchedule.students as Array<Record<string, unknown>>) || []
              return (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ padding: '12px 16px', background: '#FCFBF9', borderBottom: '1px solid #EEE7E1' }}>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#98A2B3' }}>
                        <UserOutlined style={{ marginRight: 4 }} />{selectedSchedule.teacherName as string}
                      </span>
                      <span style={{ fontSize: 12, color: '#98A2B3' }}>
                        <EnvironmentOutlined style={{ marginRight: 4 }} />{selectedSchedule.roomName as string}
                      </span>
                      <span style={{ fontSize: 12, color: '#98A2B3' }}>
                        <ClockCircleOutlined style={{ marginRight: 4 }} />{formatTime(selectedSchedule.startTime as string)}-{formatTime(selectedSchedule.endTime as string)}
                      </span>
                      <span style={{ fontSize: 12, color: '#98A2B3' }}>
                        <TeamOutlined style={{ marginRight: 4 }} />{students.length}人
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                      <Button
                        size="small"
                        disabled={selectedSchedule.intensiveMode === 'INTENSIVE' && selectedSchedule.settlementStatus !== 'UNSETTLED'}
                        onClick={setAllPresent}
                      >一键全勤</Button>
                    </div>
                  </div>

                  {selectedSchedule.intensiveMode === 'INTENSIVE' && (
                    <div style={{ padding: '10px 16px', background: '#faf8f5', borderBottom: '1px solid #EEE7E1' }}>
                      <Space wrap>
                        <Text strong style={{ fontSize: 12 }}>实际授课分钟</Text>
                        <InputNumber
                          min={1}
                          max={600}
                          value={actualMinutes}
                          disabled={selectedSchedule.settlementStatus !== 'UNSETTLED'}
                          onChange={(value) => setActualMinutes(value)}
                          addonAfter="分钟"
                        />
                        {selectedSchedule.settlementStatus !== 'UNSETTLED' && (
                          <Button size="small" onClick={openSettlementAdjustment}>调整结算</Button>
                        )}
                      </Space>
                    </div>
                  )}

                  {Boolean(selectedSchedule.isSystemFirstPeriod) && (
                    <div className="attendance-meal-banner">这是系统第一课节，可同时登记学生是否就餐；未勾选表示不就餐。</div>
                  )}

                  <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
                    {students.map((s: Record<string, unknown>) => {
                      const studentId = String(s.studentId)
                      const status = attMap.get(studentId) || 'present'
                      const isLeave = status === 'leave'
                      const statusColors = {
                        present: { bg: 'rgba(39,166,68,0.1)', color: '#27a644', label: '出勤' },
                        leave:   { bg: 'rgba(245,166,35,0.1)', color: '#f5a623', label: '请假' },
                      } as const

                      return (
                        <div key={studentId} style={{
                          background: '#ffffff',
                          borderRadius: 12,
                          padding: '12px 14px',
                          marginBottom: 12,
                          border: '1px solid #F5F2EE',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 34, height: 34, borderRadius: '50%', background: '#FDFCFB',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 14, fontWeight: 600, color: '#14574D', border: '1px solid #E8F2F0'
                              }}>{(s.studentName as string)?.[0] || '?'}</div>
                              <span style={{ fontSize: 15, fontWeight: 600, color: '#1F2329' }}>{s.studentName as string}</span>
                            </div>
                            {isLeave && (
                              <Button
                                size="small"
                                type="dashed"
                                style={{ color: '#8A6517', borderColor: '#E5C37A', background: '#FEF8E8' }}
                                onClick={() => router.push(`/schedule/intensive?studentId=${studentId}`)}
                              >
                                安排补课
                              </Button>
                            )}
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${selectedSchedule.isSystemFirstPeriod ? 3 : 2}, 1fr)`, gap: 8 }}>
                            {(['present', 'leave'] as AttStatus[]).map(t => {
                              const active = status === t
                              const c = statusColors[t]
                              return (
                                <button key={t}
                                  disabled={selectedSchedule.intensiveMode === 'INTENSIVE' && selectedSchedule.settlementStatus !== 'UNSETTLED'}
                                  onClick={() => setStudentStatus(studentId, t)}
                                  style={{
                                    padding: '8px 0',
                                    borderRadius: 8,
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    border: `1px solid ${active ? c.color : '#F0EBE5'}`,
                                    background: active ? c.bg : '#FDFCFB',
                                    color: active ? c.color : '#98A2B3',
                                    fontWeight: active ? 600 : 400,
                                    transition: 'all 0.2s'
                                  }}>
                                  {c.label}
                                </button>
                              )
                            })}
                            {Boolean(selectedSchedule.isSystemFirstPeriod) && (
                              <button
                                type="button"
                                className={`attendance-meal-toggle ${mealStudentIds.has(studentId) ? 'is-active' : ''}`}
                                onClick={() => toggleMeal(studentId)}
                              >就餐</button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div style={{
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10,
                    padding: '16px',
                    background: '#ffffff',
                    borderTop: '1px solid #EEE7E1',
                    boxShadow: '0 -4px 12px rgba(0,0,0,0.03)',
                    paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#1E8E3E' }}>{summary.present}</div>
                          <div style={{ fontSize: 10, color: '#98A2B3' }}>出勤</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#E8784A' }}>{summary.leave}</div>
                          <div style={{ fontSize: 10, color: '#98A2B3' }}>请假</div>
                        </div>
                        {Boolean(selectedSchedule.isSystemFirstPeriod) && (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#8A6517' }}>{mealStudentIds.size}</div>
                            <div style={{ fontSize: 10, color: '#98A2B3' }}>就餐</div>
                          </div>
                        )}
                      </div>
                      <Button type="primary" loading={submitting} size="large"
                        disabled={selectedSchedule.intensiveMode === 'INTENSIVE' && selectedSchedule.settlementStatus !== 'UNSETTLED'}
                        onClick={async () => { await handleSubmit(); setAttendanceDrawerOpen(false) }}
                        style={{ background: 'var(--color-primary, #14574D)', borderColor: 'var(--color-primary, #14574D)', height: 44, borderRadius: 8, padding: '0 24px' }}
                        icon={<CheckCircleOutlined />}>
                        提交考勤
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </Drawer>
        )}

        <BrandModal
          title="调整突击班结算"
          open={adjustmentOpen}
          confirmLoading={adjusting}
          okText="确认调整"
          cancelText="取消"
          onOk={handleSettlementAdjustment}
          onCancel={() => setAdjustmentOpen(false)}
          destroyOnHidden
        >
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Text type="secondary">原实际授课分钟：{String(selectedSchedule?.actualMinutes || '-')}</Text>
            <div>
              <Text strong>调整后分钟</Text>
              <InputNumber
                min={1}
                max={600}
                value={adjustmentMinutes}
                onChange={(value) => setAdjustmentMinutes(value)}
                addonAfter="分钟"
                style={{ width: '100%', marginTop: 8 }}
              />
            </div>
            <div>
              <Text strong>调整原因</Text>
              <Input.TextArea
                value={adjustmentReason}
                onChange={(event) => setAdjustmentReason(event.target.value)}
                maxLength={500}
                rows={4}
                showCount
                placeholder="请填写实际授课时间变更原因"
                style={{ marginTop: 8 }}
              />
            </div>
          </Space>
        </BrandModal>
      </div>
    </PageLayout>
  )
}
