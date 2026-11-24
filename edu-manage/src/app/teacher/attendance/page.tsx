'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { Button, Card, Empty, InputNumber, Modal, Space, Tag, Typography } from 'antd'
import {
  CheckCircleOutlined,
  CoffeeOutlined,
  CloseOutlined,
  LeftOutlined,
  FullscreenOutlined,
  RightOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'
import { formatRemaining } from '@/lib/lesson-units'
import { canAppendTeacherMealAttendance, getTeacherAttendanceSubmissionState, teacherAttendanceOpenAt } from '@/lib/teacher-intensive-scheduling'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { BrandModal } from '@/components/Common/BrandModal'
import { StudentAvatar } from '@/components/Common/StudentAvatar'
import { StudentMembershipBadge } from '@/components/Common/StudentMembershipBadge'
import dayjs from 'dayjs'
import { localDateKey } from '@/lib/date/local-day'
import {
  getNextTeacherLesson,
  getTeacherAttendanceDisplayLessons,
  getTeacherLessonAttendanceState,
} from '@/lib/teacher-lesson-navigation'
import {
  markAllPresentPreservingLeave,
  resolveAttendanceSubmissionStatus,
  toAttendanceDisplayStatus,
  canSubmitTeacherAttendance,
  type AttendanceDisplayStatus,
  type AttendanceRecordStatus,
} from '@/lib/attendance-status'

const { Title, Text } = Typography
const fetcher = (url: string) => fetch(url).then(res => res.json())

function safeLessonDateKey(value: string | Date | null | undefined) {
  if (!value) return ''
  try {
    return localDateKey(value)
  } catch {
    return ''
  }
}

const STATUS_CONFIG: Record<AttStatus, { label: string; className: string }> = {
  PRESENT: { label: '出勤', className: 'is-present' },
  LEAVE: { label: '请假', className: 'is-leave' },
}
type AttStatus = AttendanceDisplayStatus
type TeacherLesson = {
  id: string
  groupName?: string
  courseName?: string
  subject?: string | null
  courseType?: string
  lessonMinutes?: number
  lessonDate?: string
  time?: string
  startTime?: string
  endTime?: string
  room?: string
  attendanceCount?: number
  attendanceSubmitted?: boolean
  attendanceSubmittedAt?: string | null
  studentCount?: number
  intensiveMode?: string | null
  status?: string
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
  subject?: string | null
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
  attendanceSubmitted?: boolean
  status?: string
  latestReview?: {
    id: string
    status: string
    actualMinutes: number
    reviewNote?: string | null
  } | null
  isTeacherFirstLessonToday?: boolean
  isSystemFirstPeriod?: boolean
  hasFirstPeriodMealSubmission?: boolean
}

function attendanceStateLabel(lesson: TeacherLesson, now: Date) {
  if (lesson.attendanceSubmitted || lesson.attendanceSubmittedAt || lesson.status === 'COMPLETED') return '已完成'
  const state = getTeacherLessonAttendanceState(lesson, now)
  if (state === 'READY' && Number(lesson.attendanceCount || 0) > 0) return '已有记录'
  if (state === 'READY') return '考勤开放'
  if (state === 'BACKFILL') {
    if (!lesson.lessonDate || !lesson.startTime || !lesson.endTime) return '时间待核对'
    const submissionState = getTeacherAttendanceSubmissionState({
      lessonDate: lesson.lessonDate,
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      intensiveMode: lesson.intensiveMode,
      now,
    })
    return submissionState === 'OPEN' ? '可补录至18:00' : '补录已截止'
  }
  if (state === 'UPCOMING') return '未到时间'
  return '时间待核对'
}

function getSubjectTagColor(subject?: string | null) {
  switch (subject) {
    case '数学': return 'blue'
    case '英语': return 'orange'
    case '语文': return 'volcano'
    case '物理': return 'purple'
    case '化学': return 'cyan'
    case '生物': return 'green'
    default: return 'geekblue'
  }
}

export default function TeacherAttendancePage() {
  const isMobile = useIsMobile() ?? false
  const router = useRouter()
  const [now, setNow] = useState(() => new Date())
  const { mutate: mutateDashboard } = useSWR('/api/teacher/dashboard', fetcher)
  const todayKey = localDateKey(now)
  const { data: termLessonsData, isLoading: termLessonsLoading, mutate: mutateTermLessons } = useSWR<TeacherLesson[]>('/api/teacher/attendance?scope=term', fetcher)
  const requestedLessonIdRef = useRef('')
  const regularLessons = useMemo<TeacherLesson[]>(() => (
    Array.isArray(termLessonsData) ? termLessonsData : []
  ), [termLessonsData])
  const displayRegularLessons = useMemo(() => getTeacherAttendanceDisplayLessons(regularLessons, now), [regularLessons, now])
  const lessons = displayRegularLessons
  const hasTodayLessons = lessons.some((lesson) => safeLessonDateKey(lesson.lessonDate) === todayKey)
  const isNextLessonPreview = lessons.length > 0 && !hasTodayLessons
  const completedLessonsCount = useMemo(() => {
    return lessons.filter(l => l.attendanceSubmitted || l.attendanceSubmittedAt || l.status === 'COMPLETED').length
  }, [lessons])
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false)
  const [completionModalOpen, setCompletionModalOpen] = useState(false)
  const [completionSummary, setCompletionSummary] = useState<{
    groupName: string
    subject: string
    time: string
    room?: string
    total: number
    present: number
    leave: number
    mealCount?: number
    nextLesson?: TeacherLesson | null
  } | null>(null)
  const [queryReady, setQueryReady] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [students, setStudents] = useState<AttendanceStudent[]>([])
  const [attMap, setAttMap] = useState<Map<string, AttStatus>>(new Map())
  const [changedStudentIds, setChangedStudentIds] = useState<Set<string>>(new Set())
  const [mealStudentIds, setMealStudentIds] = useState<Set<string>>(new Set())
  const [mealAppendStudentIds, setMealAppendStudentIds] = useState<Set<string>>(new Set())
  const [appendingMeals, setAppendingMeals] = useState(false)
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
          subject: lessonDetail?.subject,
          courseType: lessonDetail?.courseType,
          lessonMinutes: lessonDetail?.lessonMinutes,
          lessonDate: lessonDetail?.lessonDate,
          startTime: lessonDetail?.startTime,
          endTime: lessonDetail?.endTime,
          intensiveMode: lessonDetail?.intensiveMode,
          attendanceSubmitted: lessonDetail?.attendanceSubmitted,
          status: lessonDetail?.status,
          time: `${lessonDetail?.startTime || ''}-${lessonDetail?.endTime || ''}`,
        }
      : lessons[0])
  const attendanceSubmissionState = selectedLesson?.lessonDate && selectedLesson.startTime && selectedLesson.endTime
    ? getTeacherAttendanceSubmissionState({
        lessonDate: selectedLesson.lessonDate,
        startTime: selectedLesson.startTime,
        endTime: selectedLesson.endTime,
        intensiveMode: lessonDetail?.intensiveMode || selectedLesson.intensiveMode,
        allowRejectedIntensiveResubmission: lessonDetail?.intensiveMode === 'INTENSIVE'
          && lessonDetail.intensiveReviewStatus === 'REJECTED',
        now,
      })
    : 'INVALID'
  const attendanceWindowOpen = attendanceSubmissionState === 'OPEN'
  const attendanceReadOnly = attendanceSubmissionState !== 'OPEN'
  const attendanceAlreadySubmitted = Boolean(
    selectedLesson?.attendanceSubmitted
    || selectedLesson?.attendanceSubmittedAt
    || selectedLesson?.status === 'COMPLETED'
    || lessonDetail?.attendanceSubmitted
    || submitted,
  )
  const attendanceRosterReady = Boolean(
    selectedLesson?.id
    && !detailLoading
    && !detailError
    && lessonDetail?.id === selectedLesson.id,
  )
  const attendanceActionsEnabled = canSubmitTeacherAttendance(attendanceRosterReady, students.length)
  const canAppendMealsNow = Boolean(
    lessonDetail?.hasFirstPeriodMealSubmission
    && selectedLesson?.lessonDate
    && selectedLesson.startTime
    && selectedLesson.endTime
    && canAppendTeacherMealAttendance({
      lessonDate: selectedLesson.lessonDate,
      startTime: selectedLesson.startTime,
      endTime: selectedLesson.endTime,
      now,
    }),
  )
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
    if (lessonId) {
      requestedLessonIdRef.current = lessonId
      setSelectedLessonId(lessonId)
    }
    setQueryReady(true)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAttendanceModalOpen(false)
        setCompletionModalOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!queryReady || termLessonsLoading) return
    if (selectedLessonId && (
      lessons.some((lesson) => lesson.id === selectedLessonId)
      || selectedLessonId === requestedLessonIdRef.current
    )) return
    const defaultLesson = lessons.find((lesson) => getTeacherLessonAttendanceState(lesson, now) === 'READY')
      || getNextTeacherLesson(lessons, now)
      || lessons.at(-1)
    setSelectedLessonId(defaultLesson?.id || '')
  }, [lessons, now, queryReady, selectedLessonId, termLessonsLoading])

  useEffect(() => {
    if (!selectedLesson?.id) {
      setDetailLoading(false)
      setDetailError('')
      setStudents([])
      setAttMap(new Map())
      setChangedStudentIds(new Set())
      setMealStudentIds(new Set())
      setMealAppendStudentIds(new Set())
      setLessonDetail(null)
      setActualMinutes(null)
      setSubmitted(false)
      return
    }
    const controller = new AbortController()
    setDetailLoading(true)
    setDetailError('')
    setStudents([])
    setAttMap(new Map())
    setChangedStudentIds(new Set())
    setMealStudentIds(new Set())
    setMealAppendStudentIds(new Set())
    setLessonDetail(null)
    setActualMinutes(null)
    setSubmitted(false)
    fetch(`/api/teacher/attendance?lessonId=${selectedLesson.id}`, { signal: controller.signal, cache: 'no-store' })
      .then(async (res) => {
        const payload = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(payload.error || `课次加载失败：${res.status}`)
        return payload
      })
      .then(payload => {
        const list = (payload.students || []) as AttendanceStudent[]
        const detail = (payload.lesson || null) as AttendanceLessonDetail | null
        if (detail?.id !== selectedLesson.id) throw new Error('返回的课次与当前选择不一致，请重新选择课次')
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
        if (controller.signal.aborted) return
        const errorText = error instanceof Error ? error.message : '请检查网络连接'
        setDetailError(errorText)
        toast.error(`学员列表加载失败：${errorText}`)
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false)
      })
    return () => controller.abort()
  }, [selectedLesson?.id])

  const setAttendance = (studentId: string, status: AttStatus) => {
    if (!attendanceRosterReady || intensiveSettlementLocked || !attendanceWindowOpen) return
    setAttMap((current) => new Map(current).set(studentId, status))
    setChangedStudentIds((current) => new Set(current).add(studentId))
    if (status === 'LEAVE') {
      if (!lessonDetail?.hasFirstPeriodMealSubmission) {
        setMealStudentIds((current) => {
          const next = new Set(current)
          next.delete(studentId)
          return next
        })
      }
      setMealAppendStudentIds((current) => {
        const next = new Set(current)
        next.delete(studentId)
        return next
      })
    }
  }

  const handleAllPresent = () => {
    if (!attendanceActionsEnabled || intensiveSettlementLocked || !attendanceWindowOpen) {
      if (attendanceRosterReady && students.length === 0) toast.warning('本课次暂无可操作名单，请联系管理端核对课次科目和有效报名。')
      return
    }
    const result = markAllPresentPreservingLeave(
      students.map((student) => student.studentId),
      attMap,
    )
    setAttMap(result.statuses)
    setChangedStudentIds((current) => {
      const next = new Set(current)
      result.updatedStudentIds.forEach((studentId) => next.add(studentId))
      return next
    })
    if (result.preservedStudentIds.length > 0) {
      toast.info(`已保留 ${result.preservedStudentIds.length} 位请假/未到校学员状态；如确认到课，请单独调整。`)
    }
  }

  const toggleMeal = (studentId: string) => {
    if (!attendanceRosterReady || intensiveSettlementLocked || !attendanceWindowOpen) return
    setMealStudentIds((current) => {
      const next = new Set(current)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  const toggleMealAppend = (studentId: string) => {
    if (!attendanceRosterReady || !canAppendMealsNow || appendingMeals) return
    setMealAppendStudentIds((current) => {
      const next = new Set(current)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  const saveMealAppend = async () => {
    if (!selectedLesson?.id || !mealAppendStudentIds.size || !canAppendMealsNow || appendingMeals) return
    setAppendingMeals(true)
    try {
      const response = await fetch('/api/teacher/meal-attendance/append', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId: selectedLesson.id, studentIds: [...mealAppendStudentIds] }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '追加就餐保存失败')
      setMealStudentIds((current) => new Set([
        ...current,
        ...(payload.addedStudentIds || []),
        ...(payload.alreadyEatingStudentIds || []),
      ]))
      setMealAppendStudentIds(new Set())
      const alreadyEating = Number(payload.alreadyEatingCount || 0)
      const skipped = Number(payload.skippedManualCount || 0)
      const resultMessages = [`已追加 ${Number(payload.addedCount || 0)} 位学员就餐`]
      if (alreadyEating) resultMessages.push(`${alreadyEating} 位已登记`)
      if (skipped) resultMessages.push(`${skipped} 位保留管理端手工设置`)
      toast.success(resultMessages.join('，'))
      mutateDashboard()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '追加就餐保存失败')
    } finally {
      setAppendingMeals(false)
    }
  }

  const submitAttendance = async () => {
    if (submitting || submittingRef.current) return
    submittingRef.current = true
    if (!selectedLesson?.id || !attendanceRosterReady) {
      submittingRef.current = false
      toast.warning('当前课次名单还未加载完成，请稍后再提交')
      return
    }
    if (!students.length) {
      submittingRef.current = false
      toast.warning('本课次暂无可录入名单，请联系管理端核对课次科目和有效报名。')
      return
    }
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
    if (!attendanceWindowOpen) {
      submittingRef.current = false
      if (attendanceSubmissionState === 'CLOSED') {
        toast.warning('教师只能在课程当天 18:00 前补录；超时请联系管理员处理。')
        return
      }
      const openAt = selectedLesson.lessonDate && selectedLesson.startTime
        ? teacherAttendanceOpenAt({
            lessonDate: selectedLesson.lessonDate,
            startTime: selectedLesson.startTime,
            intensiveMode: lessonDetail?.intensiveMode || selectedLesson.intensiveMode,
          })
        : null
      toast.warning(openAt
        ? `考勤将在 ${openAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Shanghai' })} 开放`
        : '当前课次缺少有效的开课时间，暂不能提交考勤')
      return
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
    const submittedLessonId = selectedLesson.id
    setSubmitting(true)
    try {
      const res = await fetch('/api/teacher/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lessonId: submittedLessonId,
          records,
          mealStudentIds: lessonDetail?.isSystemFirstPeriod ? [...mealStudentIds] : undefined,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(payload.error || '提交失败'); return }
      setSubmitted(true)
      mutateDashboard()
      mutateTermLessons()
      try {
        const refreshRes = await fetch(`/api/teacher/attendance?lessonId=${submittedLessonId}`, { cache: 'no-store' })
        const refreshPayload = await refreshRes.json().catch(() => ({}))
        if (!refreshRes.ok) throw new Error(refreshPayload.error || `课次刷新失败：${refreshRes.status}`)
        const list = (refreshPayload.students || []) as AttendanceStudent[]
        const detail = (refreshPayload.lesson || null) as AttendanceLessonDetail | null
        if (detail?.id !== submittedLessonId) throw new Error('刷新结果与已提交课次不一致')
        setLessonDetail(detail)
        setActualMinutes(detail?.actualMinutes || detail?.latestReview?.actualMinutes || detail?.plannedMinutes || null)
        setStudents(list)
        const m = new Map<string, AttStatus>()
        list.forEach((student) => m.set(student.studentId, toAttendanceDisplayStatus(student.status)))
        setAttMap(m)
        setChangedStudentIds(new Set())
        setMealStudentIds(new Set(list.filter((student) => student.eating).map((student) => student.studentId)))
      } catch (error) {
        toast.warning(`考勤已提交，但最新考勤列表刷新失败，请手动刷新页面。原因：${error instanceof Error ? error.message : '未知错误'}`)
      }

      // 统计考勤完成概览并弹出完成窗口
      const nextLesson = lessons.find((l) => {
        if (l.id === submittedLessonId) return false
        const state = getTeacherLessonAttendanceState(l, now)
        return state === 'READY' || state === 'BACKFILL'
      })

      setCompletionSummary({
        groupName: selectedLesson.groupName || selectedLesson.courseName || '课程',
        subject: selectedLesson.subject || '综合',
        time: `${selectedLesson.lessonDate ? dayjs(selectedLesson.lessonDate).format('M月D日 ') : ''}${selectedLesson.time || ''}`,
        room: selectedLesson.room,
        total: students.length,
        present: summary.present,
        leave: summary.leave,
        mealCount: lessonDetail?.isSystemFirstPeriod ? mealStudentIds.size : undefined,
        nextLesson: nextLesson || null,
      })
      setAttendanceModalOpen(false)
      setCompletionModalOpen(true)

      if (payload.pendingReview) {
        toast.success(payload.message || '授课记录已提交，等待管理员审核', { duration: 2000 })
      } else if (payload.alreadyDeducted) {
        toast.success(`考勤已更新，本次课次已结算课时`, { duration: 2000 })
      } else {
        toast.success(`考勤已提交，本次课次状态已更新`, { duration: 2000 })
      }
    } catch {
      toast.error('网络异常，未能确认考勤提交结果。请刷新课次状态后再重试。')
    } finally {
      setSubmitting(false)
      submittingRef.current = false
    }
  }

  const emptyLessonState = (
    <div className="teacher-attendance-empty-list">
      <GuidedEmpty
        compact
        title="暂时没有班课安排"
        description="今天没有班课，当前也没有下一节已安排的班课。晚托作业班在独立工作台管理。"
        actionLabel="查看我的课表"
        onAction={() => router.push('/teacher/schedule')}
      />
    </div>
  )
  const selectLesson = (lesson: TeacherLesson) => {
    if (submitting) {
      toast.info('考勤正在提交，请稍候再切换课次')
      return
    }
    setSelectedLessonId(lesson.id)
  }

  const handleGoToNextLesson = (nextLesson: TeacherLesson) => {
    setCompletionModalOpen(false)
    selectLesson(nextLesson)
    if (isMobile) {
      setAttendanceModalOpen(true)
    }
  }

  const renderLessonOption = (lesson: TeacherLesson) => {
    const selected = selectedLesson?.id === lesson.id
    const attendanceState = getTeacherLessonAttendanceState(lesson, now)
    const isDone = Boolean(lesson.attendanceSubmitted || lesson.attendanceSubmittedAt || lesson.status === 'COMPLETED')
    const stateClass = isDone ? 'done' : attendanceState.toLowerCase()
    const stateLabel = attendanceStateLabel(lesson, now)
    const groupName = lesson.groupName || lesson.courseName || '课程'
    const subject = lesson.subject || '综合'
    const time = lesson.time || `${lesson.startTime || ''}-${lesson.endTime || ''}`
    const dateKey = safeLessonDateKey(lesson.lessonDate) || null

    if (isMobile) {
      return (
        <div
          key={lesson.id}
          role="button"
          tabIndex={0}
          className={`teacher-attendance-card-item is-${stateClass}${selected ? ' is-selected' : ''}`}
          onClick={() => {
            selectLesson(lesson)
            setAttendanceModalOpen(true)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              selectLesson(lesson)
              setAttendanceModalOpen(true)
            }
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Tag color={getSubjectTagColor(subject)} style={{ margin: 0, fontWeight: 600 }}>{subject}</Tag>
              <span style={{ fontWeight: 650, fontSize: 14, color: 'var(--color-ink, #1a1201)' }}>{groupName}</span>
            </div>
            <Tag
              color={isDone ? 'success' : stateClass === 'ready' ? 'processing' : stateClass === 'backfill' ? 'warning' : 'default'}
              style={{ margin: 0, borderRadius: 999 }}
            >
              {isDone ? '✓ 已完成' : stateLabel}
            </Tag>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--color-ink-subtle, #786d5e)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {dateKey ? `${dayjs(dateKey).format('M月D日')} · ` : ''}{time}
              </span>
              {lesson.room && (
                <span>
                  <EnvironmentOutlined style={{ marginRight: 3 }} />
                  {lesson.room}
                </span>
              )}
              {typeof lesson.studentCount === 'number' && (
                <span>
                  <UserOutlined style={{ marginRight: 3 }} />
                  {lesson.studentCount}人
                </span>
              )}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              fontWeight: isDone ? 400 : 600,
              color: isDone ? 'var(--color-ink-subtle)' : 'var(--color-primary, #14574D)',
              fontSize: 12,
            }}>
              <span>{isDone ? '查看/更正' : '去考勤'}</span>
              <RightOutlined style={{ fontSize: 10 }} />
            </div>
          </div>
        </div>
      )
    }

    return (
      <button
        key={lesson.id}
        type="button"
        disabled={submitting}
        aria-pressed={selected}
        className={`teacher-attendance-lesson-option${selected ? ' is-selected' : ''} is-${stateClass}`}
        onClick={() => selectLesson(lesson)}
      >
        <span className="teacher-attendance-lesson-option__copy">
          <strong>{subject} · {groupName}</strong>
          <span>{dateKey ? `${dayjs(dateKey).format('M月D日')} · ` : ''}{time}{lesson.room ? ` · ${lesson.room}` : ''}</span>
        </span>
        <Tag color={isNextLessonPreview ? 'blue' : isDone ? 'success' : stateClass === 'ready' ? 'green' : 'default'}>
          {isNextLessonPreview ? '下一节' : isDone ? '已完成' : stateLabel}
        </Tag>
      </button>
    )
  }

  const renderAttendanceBody = () => {
    if (!selectedLesson) {
      return (
        <GuidedEmpty
          compact
          title="请选择一节课"
          description="选择今天的课程，或查看没有今日排课时展示的下一节课程名单。"
        />
      )
    }

    if (detailError) {
      return (
        <Empty
          description={(
            <Space direction="vertical" size={8}>
              <span>目标课次无法打开：{detailError}</span>
              <Button onClick={() => window.location.reload()}>重新加载</Button>
            </Space>
          )}
        />
      )
    }

    if (!attendanceRosterReady) {
      return (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-ink-muted)' }}>
          正在加载目标课次名单…
        </div>
      )
    }

    return (
      <>
        {attendanceSubmissionState === 'UPCOMING' && (
          <div className="teacher-attendance-window-note" role="status">
            {isNextLessonPreview ? '下次课程名单预览中。' : '课程名单预览中。'}
            {' '}{lessonDetail?.intensiveMode === 'INTENSIVE' ? '开课后' : '开课前 30 分钟'}开放考勤。
          </div>
        )}
        {attendanceSubmissionState === 'CLOSED' && !attendanceAlreadySubmitted && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            background: 'var(--color-warning-bg, #fffbf0)',
            border: '1px solid color-mix(in srgb, var(--color-warning) 30%, var(--color-hairline))',
            borderRadius: 10,
            marginBottom: 12,
            fontSize: 12.5,
            color: 'var(--color-warning-text, #8c5300)',
            lineHeight: 1.45,
          }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <span>教师考勤补录截止时间为课程当天 18:00；如需补录或更正，请联系管理员处理。</span>
          </div>
        )}

        {lessonDetail?.intensiveMode === 'INTENSIVE' && (
          <div className="teacher-attendance-intensive-card">
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
              <Text strong style={{ fontSize: 12 }}>实际授课分钟</Text>
              <InputNumber
                min={15}
                max={600}
                value={actualMinutes}
                disabled={intensiveSettlementLocked || attendanceReadOnly}
                onChange={(value) => setActualMinutes(value)}
                addonAfter="分钟"
              />
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
            <span>
              {lessonDetail.hasFirstPeriodMealSubmission
                ? '系统第一课节已上报。晚到学员可在正在进行的班课中追加就餐，追加不会修改考勤和课时。'
                : `这是系统第一课节，请在提交考勤时一并确认每位学员是否就餐。${attendanceWindowOpen ? '未勾选按不就餐记录。' : '当前为名单预览，考勤开放后即可确认。'}`}
            </span>
          </div>
        )}

        {lessonDetail?.hasFirstPeriodMealSubmission && !lessonDetail.isSystemFirstPeriod && (
          <div className="teacher-attendance-meal-note">
            <CoffeeOutlined />
            <span>系统第一课节的就餐已上报。晚到学员可在本节班课进行中追加；这只更新就餐台账，不改本节考勤或课时。</span>
          </div>
        )}

        {students.length === 0 ? (
          <div role="status" aria-live="polite" style={{ marginTop: 14, padding: 16, borderRadius: 12, background: 'var(--color-surface-3)', color: 'var(--color-ink-muted)', lineHeight: 1.6 }}>
            <strong style={{ display: 'block', marginBottom: 4, color: 'var(--color-ink)' }}>本课次暂无可录入名单</strong>
            教师端不支持自行补录学员。请联系管理端核对本课科目与当前有效报名，避免把其他科目的学员加入本课。
          </div>
        ) : null}

        {students.length > 0 && (
          <div style={{
            padding: '12px 14px',
            background: '#faf8f5',
            border: '1px solid rgba(0, 0, 0, 0.05)',
            borderRadius: 12,
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-ink, #1a1201)' }}>签到统计</span>
              <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75' }} />
                  <span style={{ color: '#1D9E75', fontWeight: 700 }}>实到 {summary.present}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#BA7517' }} />
                  <span style={{ color: '#BA7517', fontWeight: 700 }}>请假 {summary.leave}</span>
                </div>
                {lessonDetail?.isSystemFirstPeriod && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <CoffeeOutlined style={{ color: 'var(--color-primary)' }} />
                    <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>就餐 {mealStudentIds.size}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="teacher-attendance-progress-track" style={{ height: 6, borderRadius: 999, background: 'rgba(0,0,0,0.06)' }}>
              <span className="is-present" style={{ flex: summary.present || 0, background: '#1D9E75' }} />
              <span className="is-leave" style={{ flex: summary.leave || 0, background: '#BA7517' }} />
            </div>
          </div>
        )}

        {/* Student list */}
        {students.length > 0 && (
          <div
            className="teacher-attendance-student-grid"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              paddingBottom: isMobile ? 24 : 0,
            }}
          >
            {students.map((s) => {
              const status: AttStatus = attMap.get(s.studentId) || 'PRESENT'
              const cfg = STATUS_CONFIG[status]
              const remaining = remainingText(s)
              const isLowRemaining = remaining.value <= 5
              const isLeave = status === 'LEAVE'
              return (
                <div
                  key={s.studentId}
                  className={`teacher-attendance-student-card ${cfg.className}${isLeave ? ' is-leave-card' : ''}${lessonDetail?.isSystemFirstPeriod ? ' has-meal-actions' : ''}`}
                >
                  <StudentAvatar photoUrl={s.photoUrl} gender={s.gender} name={s.name} size={40} className="teacher-attendance-student-avatar" />
                  <div className="teacher-attendance-student-info">
                    <div className="teacher-attendance-student-name-row">
                      <span className="teacher-attendance-student-name" title={s.name}>{s.name}</span>
                      <StudentMembershipBadge level={s.membershipLevel} className="teacher-attendance-membership-badge" />
                    </div>
                    <div className={`teacher-attendance-student-meta${isLowRemaining ? ' is-low' : ''}`}>
                      {lessonDetail?.intensiveMode === 'INTENSIVE' ? '审核后按实际分钟计入' : `余${remaining.text}${isLowRemaining ? ' ⚠️' : ''}`}
                    </div>
                    {s.status === 'ABSENT' && (
                      <div className="teacher-attendance-student-absent-note">原记录：缺勤（按缺课处理，非请假）</div>
                    )}
                  </div>
                  <div className={`teacher-attendance-student-actions${lessonDetail?.isSystemFirstPeriod ? ' has-meal' : ''}`}>
                    {attendanceReadOnly && !attendanceAlreadySubmitted ? (
                      <span className="teacher-attendance-student-preview-status">
                        {attendanceSubmissionState === 'CLOSED' ? '联系管理员' : '待考勤'}
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={status === 'PRESENT' ? 'is-active is-present' : ''}
                          disabled={!attendanceRosterReady || intensiveSettlementLocked || attendanceReadOnly}
                          onClick={() => setAttendance(s.studentId, 'PRESENT')}
                          aria-label={`${s.name} 出勤`}
                        >
                          出勤
                        </button>
                        <button
                          type="button"
                          className={status === 'LEAVE' ? 'is-active is-leave' : ''}
                          disabled={!attendanceRosterReady || intensiveSettlementLocked || attendanceReadOnly}
                          onClick={() => {
                            setAttendance(s.studentId, 'LEAVE')
                            if (!isLeave) toast.info(`${s.name} 已请假，自动排除就餐和反馈`)
                          }}
                          aria-label={`${s.name} 请假`}
                        >
                          请假
                        </button>
                      </>
                    )}
                    {lessonDetail?.isSystemFirstPeriod && !lessonDetail.hasFirstPeriodMealSubmission && (
                      <button
                        type="button"
                        className={mealStudentIds.has(s.studentId) ? 'is-active is-meal' : ''}
                        disabled={!attendanceRosterReady || intensiveSettlementLocked || !attendanceWindowOpen || isLeave || submitting}
                        onClick={() => toggleMeal(s.studentId)}
                        aria-label={`${s.name} 就餐`}
                        title={attendanceWindowOpen ? '提交本节考勤时一并上报' : '考勤开放后可确认就餐'}
                      >
                        {mealStudentIds.has(s.studentId) ? '已选就餐' : '就餐'}
                      </button>
                    )}
                    {lessonDetail?.hasFirstPeriodMealSubmission && (
                      isLeave ? (
                        <span className="teacher-attendance-student-preview-status">请假不可追加</span>
                      ) : mealStudentIds.has(s.studentId) ? (
                        <span className="teacher-attendance-student-preview-status">已登记就餐</span>
                      ) : (
                        <button
                          type="button"
                          className={mealAppendStudentIds.has(s.studentId) ? 'is-active is-meal' : ''}
                          disabled={!attendanceRosterReady || !canAppendMealsNow || appendingMeals || submitting}
                          onClick={() => toggleMealAppend(s.studentId)}
                          aria-label={`${s.name} 追加就餐`}
                          title={canAppendMealsNow ? '追加后立即计入管理端就餐统计' : '课程进行中才可追加就餐'}
                        >
                          {mealAppendStudentIds.has(s.studentId) ? '已选追加' : '追加就餐'}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {students.length > 0 && lessonDetail?.hasFirstPeriodMealSubmission && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, marginBottom: isMobile ? 16 : 0 }}>
            <Button
              type="primary"
              disabled={!mealAppendStudentIds.size || !canAppendMealsNow || submitting}
              loading={appendingMeals}
              onClick={saveMealAppend}
              style={{ background: 'var(--color-primary)' }}
            >
              保存追加就餐（{mealAppendStudentIds.size}）
            </Button>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="teacher-attendance-page">
      <Title level={4} style={{ marginTop: 0 }}>考勤录入</Title>

      <div className="teacher-attendance-navigation">
        <div className="teacher-attendance-day-heading" style={{ padding: '12px 14px', borderRadius: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <strong>{hasTodayLessons ? '今日班课' : lessons.length ? '下次班课预览' : '班课安排'}</strong>
            {lessons.length > 0 && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                color: completedLessonsCount === lessons.length ? '#1D9E75' : 'var(--color-primary, #14574D)',
                background: completedLessonsCount === lessons.length ? 'rgba(29, 158, 117, 0.1)' : 'rgba(20, 87, 77, 0.08)',
                padding: '2px 9px',
                borderRadius: 999,
              }}>
                共 {lessons.length} 节 · 已完成 {completedLessonsCount} 节
              </span>
            )}
          </div>
          <span style={{ fontSize: 12, color: 'var(--color-ink-muted)', marginTop: 2 }}>
            {hasTodayLessons
              ? '考勤仅在班课开放时段内录入；轻触下方任意班课卡片即可弹出考勤窗口。'
              : lessons.length
                ? '今天暂无班课，先展示最近一节班课和学员名单；课程开放后即可录入。'
                : '今天没有班课，暂时也没有已安排的下一节班课。'}
          </span>
        </div>
      </div>

      <div style={isMobile ? { display: 'flex', flexDirection: 'column', gap: 12 } : { display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        {/* Class lessons: mobile shows rich card list; desktop shows left sidebar card */}
        {isMobile ? (
          <div className="teacher-attendance-lesson-options" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {termLessonsLoading ? (
              <div className="teacher-attendance-list-loading">正在加载课程…</div>
            ) : !lessons.length ? emptyLessonState : lessons.map(renderLessonOption)}
          </div>
        ) : (
          <Card
            bordered={false}
            className="teacher-attendance-lesson-card"
            title={`${hasTodayLessons ? '今日班课' : '下次班课'} (${lessons.length})`}
          >
            {termLessonsLoading ? (
              <div className="teacher-attendance-list-loading">正在加载课程…</div>
            ) : !lessons.length ? emptyLessonState : <div className="teacher-attendance-lesson-options">{lessons.map(renderLessonOption)}</div>}
            {/* Sticky summary */}
            {lessons.length > 0 && (
              <div style={{ borderTop: '1px solid #f0e7de', paddingTop: 12, fontSize: 11, position: 'sticky', bottom: 0, background: '#fff' }}>
                当前课次：<Text style={{ color: '#1D9E75' }}>出勤{summary.present}</Text> / <Text style={{ color: '#BA7517' }}>请假{summary.leave}</Text>
              </div>
            )}
          </Card>
        )}

        {/* RIGHT: Attendance area - Desktop only */}
        {!isMobile && (
          <Card
            bordered={false}
            className="teacher-attendance-main-card"
            title={selectedLesson ? `${selectedLesson.subject ? `${selectedLesson.subject} · ` : ''}${selectedLesson.groupName || selectedLesson.courseName} · ${selectedLesson.lessonDate ? `${dayjs(selectedLesson.lessonDate).format('M月D日')} ` : ''}${selectedLesson.time || ''}` : '选择课次'}
            extra={selectedLesson ? (
              <Space>
                <Tag color="blue" style={{ borderRadius: 9999 }}>{attendanceRosterReady ? `${students.length}人` : '名单加载中'}</Tag>
                <Button
                  icon={<FullscreenOutlined />}
                  onClick={() => setAttendanceModalOpen(true)}
                  style={{ borderRadius: 8 }}
                >
                  弹窗模式
                </Button>
                <Button
                  disabled={!attendanceActionsEnabled || intensiveSettlementLocked || attendanceReadOnly || submitting}
                  icon={<CheckCircleOutlined />}
                  onClick={handleAllPresent}
                  style={{ borderColor: '#1D9E75', color: '#1D9E75' }}
                >
                  一键全勤
                </Button>
                <Button
                  type="primary"
                  disabled={!attendanceActionsEnabled || intensiveSettlementLocked || attendanceReadOnly}
                  loading={submitting}
                  onClick={submitAttendance}
                  style={{ background: 'var(--color-primary)' }}
                >
                  {submitLabel}
                </Button>
              </Space>
            ) : null}
          >
            {renderAttendanceBody()}
          </Card>
        )}
      </div>

      {/* 居中浮层考勤弹窗 (采用项目标准 BrandModal，基于 Ant Design Modal 传送门至 document.body，彻底解决层级遮挡与滑动阻断) */}
      <BrandModal
        open={attendanceModalOpen}
        onClose={() => setAttendanceModalOpen(false)}
        width={580}
        mobileHeight="82dvh"
        maskClosable={true}
        destroyOnHidden={true}
        styles={{
          mask: {
            background: 'rgba(15, 23, 42, 0.48)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          },
          body: {
            padding: isMobile ? '12px 14px' : '16px 20px',
            overflowY: 'auto',
          },
        }}
        title={(
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, paddingRight: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Tag color={getSubjectTagColor(selectedLesson?.subject)} style={{ margin: 0, fontWeight: 700, borderRadius: 6, fontSize: 12 }}>
                {selectedLesson?.subject || '综合'}
              </Tag>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-ink, #1a1201)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedLesson?.groupName || selectedLesson?.courseName || '课程考勤'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--color-ink-subtle, #786d5e)', flexWrap: 'wrap', fontWeight: 400 }}>
              <span>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {selectedLesson?.lessonDate ? `${dayjs(selectedLesson.lessonDate).format('M月D日')} · ` : ''}
                {selectedLesson?.time || ''}
              </span>
              {selectedLesson?.room && (
                <span>
                  <EnvironmentOutlined style={{ marginRight: 3 }} />
                  {selectedLesson.room}
                </span>
              )}
              {attendanceRosterReady && (
                <span>
                  <UserOutlined style={{ marginRight: 3 }} />
                  共 {students.length} 人
                </span>
              )}
            </div>
          </div>
        )}
        footer={selectedLesson && attendanceRosterReady && students.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: attendanceReadOnly ? '1fr' : '1fr 1fr', gap: 10, width: '100%' }}>
            {attendanceReadOnly ? (
              <Button
                size="large"
                block
                onClick={() => setAttendanceModalOpen(false)}
                style={{
                  height: 44,
                  borderRadius: 10,
                  fontWeight: 600,
                  background: 'var(--color-surface-2, #f5f0ea)',
                  border: '1px solid var(--color-hairline, rgba(0,0,0,0.08))',
                  color: 'var(--color-ink, #1a1201)',
                }}
              >
                关闭窗口
              </Button>
            ) : (
              <>
                <Button
                  size="large"
                  disabled={!attendanceActionsEnabled || intensiveSettlementLocked || submitting}
                  icon={<CheckCircleOutlined />}
                  onClick={handleAllPresent}
                  style={{
                    height: 44,
                    borderRadius: 10,
                    fontWeight: 600,
                    borderColor: '#1D9E75',
                    color: '#1D9E75',
                    background: '#ffffff',
                  }}
                >
                  一键全勤
                </Button>
                <Button
                  type="primary"
                  size="large"
                  disabled={!attendanceActionsEnabled || intensiveSettlementLocked}
                  loading={submitting}
                  onClick={submitAttendance}
                  style={{
                    height: 44,
                    borderRadius: 10,
                    fontWeight: 600,
                    background: 'var(--color-primary, #14574D)',
                    borderColor: 'var(--color-primary, #14574D)',
                    boxShadow: '0 2px 8px rgba(20, 87, 77, 0.25)',
                  }}
                >
                  {submitLabel}
                </Button>
              </>
            )}
          </div>
        ) : null}
      >
        {renderAttendanceBody()}
      </BrandModal>

      {/* 考勤完成成功提示窗口 */}
      <Modal
        open={completionModalOpen}
        onCancel={() => setCompletionModalOpen(false)}
        footer={null}
        destroyOnHidden
        centered
        zIndex={1400}
        width={400}
        styles={{ body: { padding: '24px 20px 20px' } }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 54,
            height: 54,
            borderRadius: '50%',
            background: 'var(--color-success-bg, rgba(29, 158, 117, 0.12))',
            color: '#1D9E75',
            fontSize: 26,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            ✓
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: 'var(--color-ink)' }}>
            考勤录入成功！
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-ink-muted)' }}>
            <strong>{completionSummary?.subject} · {completionSummary?.groupName}</strong>
            <br />
            <span style={{ fontSize: 12, color: 'var(--color-ink-subtle)' }}>
              {completionSummary?.time}{completionSummary?.room ? ` · ${completionSummary.room}` : ''}
            </span>
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: completionSummary?.mealCount !== undefined ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
            gap: 8,
            padding: '12px 8px',
            background: 'var(--color-surface-2, #f5f0ea)',
            borderRadius: 12,
            marginBottom: 20,
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-ink-subtle)' }}>应到</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-ink)' }}>{completionSummary?.total || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-ink-subtle)' }}>实到</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1D9E75' }}>{completionSummary?.present || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--color-ink-subtle)' }}>请假</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#BA7517' }}>{completionSummary?.leave || 0}</div>
            </div>
            {completionSummary?.mealCount !== undefined && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-ink-subtle)' }}>就餐</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-primary)' }}>{completionSummary.mealCount}</div>
              </div>
            )}
          </div>

          <Space direction="vertical" size={10} style={{ width: '100%' }}>
            {completionSummary?.nextLesson ? (
              <Button
                type="primary"
                size="large"
                block
                onClick={() => {
                  if (completionSummary.nextLesson) {
                    handleGoToNextLesson(completionSummary.nextLesson)
                  }
                }}
                style={{
                  background: 'var(--color-primary, #14574D)',
                  borderColor: 'var(--color-primary, #14574D)',
                  height: 44,
                  borderRadius: 10,
                  fontWeight: 600,
                }}
              >
                前往下一节课：{completionSummary.nextLesson.groupName || completionSummary.nextLesson.courseName} ›
              </Button>
            ) : (
              <Button
                type="primary"
                size="large"
                block
                onClick={() => {
                  setCompletionModalOpen(false)
                  router.push(`/teacher/feedback?lessonId=${selectedLesson?.id || ''}`)
                }}
                style={{
                  background: 'var(--color-primary, #14574D)',
                  borderColor: 'var(--color-primary, #14574D)',
                  height: 44,
                  borderRadius: 10,
                  fontWeight: 600,
                }}
              >
                去写随堂反馈 ›
              </Button>
            )}
            <Button
              size="large"
              block
              onClick={() => setCompletionModalOpen(false)}
              style={{ height: 44, borderRadius: 10 }}
            >
              返回班课列表
            </Button>
          </Space>
        </div>
      </Modal>
    </div>
  )
}
