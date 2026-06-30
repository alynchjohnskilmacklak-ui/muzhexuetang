'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import {
  Button,
  Card,
  Col,
  Drawer,
  Dropdown,
  Empty,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Tag,
} from 'antd'
import { toast } from 'sonner'
import {
  BookOutlined,
  CalendarOutlined,
  CheckOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  EnvironmentOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { addDays, format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { PageLayout } from '@/components/Layout/PageLayout'
import { MobileSelect } from '@/components/MobileSelect'
import { useIsMobile } from '@/hooks/useIsMobile'
import { CLASS_PERIODS_ONLY, HOURLY_PERIODS, SchedulePeriod } from '@/lib/schedule-periods'
import { useDivision } from '@/contexts/DivisionContext'
import { useSchedulePeriods } from '@/hooks/useSchedulePeriods'

type CourseType = 'GROUP' | 'ONE_ON_ONE' | 'SMALL_GROUP'
type ScheduleTemplateRow = {
  periodId: string
  periodName: string
  startTime: string
  endTime: string
  teacherId: string
  subject: string
}

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '地理', '历史', '政治']
const SUBJECT_COLOR: Record<string, string> = {
  语文: '#e8784a',
  数学: '#E8784A',
  英语: '#2f80ed',
  物理: '#7c5cff',
  化学: '#20a779',
  生物: '#6aaa2d',
  地理: '#1f9bb4',
  历史: '#b86b35',
  政治: '#d14d72',
}
const ALL_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const DAY_LABELS: Record<string, string> = {
  MON: '周一',
  TUE: '周二',
  WED: '周三',
  THU: '周四',
  FRI: '周五',
  SAT: '周六',
  SUN: '周日',
}
const GROUP_STATUS_MAP: Record<string, { color: string; label: string }> = {
  WAITING: { color: 'orange', label: '待开班' },
  ACTIVE: { color: 'green', label: '进行中' },
  COMPLETED: { color: 'blue', label: '已结束' },
  ARCHIVED: { color: 'default', label: '已归档' },
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('加载失败')
  return res.json()
}

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function generatePreview(startDate: string, recurringDays: string[], totalLessons: number) {
  if (!startDate || !recurringDays.length || totalLessons <= 0) return []
  const dates: Date[] = []
  let cursor = new Date(`${startDate}T00:00:00`)
  const dayMap: Record<string, number> = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 }
  const targets = recurringDays.map((day) => dayMap[day]).filter((day) => day !== undefined)
  const stopAt = addDays(cursor, 730)

  while (dates.length < totalLessons && cursor <= stopAt) {
    if (targets.includes(cursor.getDay())) dates.push(new Date(cursor))
    cursor = addDays(cursor, 1)
  }

  return dates
}

function buildScheduleTemplate(type: CourseType, periods: SchedulePeriod[] = CLASS_PERIODS_ONLY): ScheduleTemplateRow[] {
  if (type !== 'GROUP') return []
  return periods.filter(period => period.type === 'CLASS').map(p => ({
    periodId: p.id,
    periodName: p.name,
    startTime: p.start,
    endTime: p.end,
    teacherId: '',
    subject: '',
  }))
}

export default function CoursesPage() {
  const router = useRouter()
  const { division } = useDivision()
  const { data: groups, mutate: mutateGroups, isLoading } = useSWR(`/api/class-groups?division=${division}`, fetcher)
  const { data: courses, mutate: mutateCourses } = useSWR(`/api/courses?division=${division}`, fetcher)
  const { data: teachers } = useSWR('/api/teachers?status=ACTIVE', fetcher)
  const { data: rooms } = useSWR('/api/rooms', fetcher)
  const { data: dashboard, mutate: mutateDashboard } = useSWR(`/api/dashboard?division=${division}`, fetcher)
  const { periods } = useSchedulePeriods(division)
  const classPeriods = useMemo(() => periods.filter(period => period.type === 'CLASS'), [periods])

  const [courseTab, setCourseTab] = useState<'GROUP'|'SMALL'>('GROUP')
  const [filterType, setFilterType] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState(0)
  const [createLoading, setCreateLoading] = useState(false)
  const [createData, setCreateData] = useState<Record<string, unknown>>({})
  const [copyOpen, setCopyOpen] = useState(false)
  const [copySource, setCopySource] = useState('')
  const [copyStartDate, setCopyStartDate] = useState('')
  const [copyName, setCopyName] = useState('')
  const [copyLoading, setCopyLoading] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerGroupId, setDrawerGroupId] = useState('')
  const [postponeOpen, setPostponeOpen] = useState(false)
  const [postponeLessonId, setPostponeLessonId] = useState('')
  const [postponeDays, setPostponeDays] = useState(7)
  const [startingGroupId, setStartingGroupId] = useState('')
  const [regeneratingGroupId, setRegeneratingGroupId] = useState('')
  const [deletingGroupId, setDeletingGroupId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{id:string;name:string}|null>(null)
  const isMobile = useIsMobile() ?? false

  const groupList = useMemo(() => Array.isArray(groups) ? groups : [], [groups])
  const courseList = (Array.isArray(courses) ? courses : []).filter((course: Record<string, unknown>) => {
    const type = course.type as string
    if (courseTab === 'GROUP') return type === 'GROUP'
    if (courseTab === 'SMALL') return type === 'ONE_ON_ONE' || type === 'SMALL_GROUP'
    return true
  })
  const teacherList = Array.isArray(teachers?.teachers) ? teachers.teachers : Array.isArray(teachers) ? teachers : []
  const roomList = Array.isArray(rooms) ? rooms : []
  const { data: drawerLessons } = useSWR(drawerGroupId ? `/api/class-groups/${drawerGroupId}/lessons` : null, fetcher)
  const drawerLessonList = useMemo(() => {
    const lessons = Array.isArray(drawerLessons) ? drawerLessons as Record<string, unknown>[] : []
    const today = format(new Date(), 'yyyy-MM-dd')
    const sorted = [...lessons].sort((a, b) => {
      const aDate = `${a.lessonDate || ''} ${a.startTime || ''}`
      const bDate = `${b.lessonDate || ''} ${b.startTime || ''}`
      return aDate.localeCompare(bDate)
    })
    const todayLessons = sorted.filter((lesson) => String(lesson.lessonDate || '').slice(0, 10) === today)
    if (todayLessons.length > 0) return todayLessons
    return sorted
      .filter((lesson) => String(lesson.lessonDate || '').slice(0, 10) >= today && lesson.status !== 'CANCELLED')
      .slice(0, 8)
  }, [drawerLessons])

  const filteredGroups = useMemo(() => groupList.filter((group: Record<string, unknown>) => {
    const course = group.course as Record<string, unknown> | undefined
    // Tab filter
    if (courseTab === 'GROUP' && course?.type !== 'GROUP') return false
    if (courseTab === 'SMALL' && !['ONE_ON_ONE', 'SMALL_GROUP'].includes(course?.type as string)) return false
    // Additional filters
    if (filterType && course?.type !== filterType) return false
    if (filterGrade && course?.grade !== filterGrade) return false
    if (filterStatus && group.status !== filterStatus) return false
    return true
  }), [groupList, courseTab, filterType, filterGrade, filterStatus])

  const grades = useMemo(() => {
    const set = new Set<string>()
    groupList.forEach((group: Record<string, unknown>) => {
      const course = group.course as Record<string, unknown> | undefined
      if (course?.grade) set.add(course.grade as string)
    })
    return [...set].sort()
  }, [groupList])

  const [slotConflicts, setSlotConflicts] = useState<Record<string, string>>({})

  const previewDates = useMemo(() => generatePreview(
    (createData.startDate as string) || todayString(),
    (createData.recurringDays as string[]) || [],
    Number(createData.totalLessons || 16)
  ), [createData.startDate, createData.recurringDays, createData.totalLessons])

  const stats = {
    activeGroups: dashboard?.metrics?.activeGroups ?? 0,
    waitingGroups: dashboard?.metrics?.waitingGroups ?? 0,
    monthlyHours: dashboard?.metrics?.monthlyHoursDeducted ?? 0,
    renewalWarnings: dashboard?.metrics?.renewalWarnings ?? 0,
  }

  const openCreate = () => {
    setCreateStep(0)
    setCreateLoading(false)
    const initialType: CourseType = courseTab === 'SMALL' ? 'ONE_ON_ONE' : 'GROUP'
    const isHourly = initialType !== 'GROUP'
    setCreateData({
      type: initialType,
      subjects: [] as string[],
      lessonMinutes: isHourly ? 60 : 40,
      totalLessons: 16,
      startDate: todayString(),
      lessonStartTime: '08:00',
      division: division,
      recurringDays: ['MON', 'WED', 'FRI'],
      maxStudents: initialType === 'ONE_ON_ONE' ? 1 : 20,
      teacherAssignments: [{ teacherId: '', subject: '' }],
      scheduleSlots: [] as string[],
      scheduleTemplate: buildScheduleTemplate(initialType, classPeriods),
    })
    setCreateOpen(true)
  }

  const resolveCreateScheduleTemplate = (templateOverride?: Record<string, unknown>[]) => {
    const isHourly = (createData.type as string) !== 'GROUP'
    const sourceTemplate = templateOverride ?? (Array.isArray(createData.scheduleTemplate) ? createData.scheduleTemplate as Record<string, unknown>[] : [])
    const rawTemplate = sourceTemplate
      .filter(row => row.teacherId && row.subject && row.startTime && row.endTime)

    if (!isHourly) {
      return rawTemplate.filter(row => !!(row.teacherId && row.subject))
    }

    if (rawTemplate.length > 0) return rawTemplate

    const selectedSlots = (createData.scheduleSlots as string[]) || []
    const validAssignments = (Array.isArray(createData.teacherAssignments) ? createData.teacherAssignments as Record<string, unknown>[] : [])
      .filter((item) => item.teacherId && item.subject)

    return HOURLY_PERIODS
      .filter((period) => selectedSlots.includes(period.id))
      .flatMap((period) => validAssignments.map((assignment) => ({
        periodId: period.id,
        periodName: period.name,
        startTime: period.start,
        endTime: period.end,
        teacherId: assignment.teacherId,
        subject: assignment.subject,
      })))
  }

  useEffect(() => {
    if (!createOpen) return
    const tpl = resolveCreateScheduleTemplate().filter(r => r.teacherId && r.startTime && r.endTime)
    const dates = previewDates.slice(0, 2).map(d => format(d, 'yyyy-MM-dd'))
    if (!tpl.length || !dates.length) { setSlotConflicts({}); return }
    const items = dates.flatMap(date => tpl.map(r => ({
      key: `${r.teacherId}::${r.startTime}-${r.endTime}`,
      teacherId: r.teacherId as string,
      date,
      startTime: r.startTime as string,
      endTime: r.endTime as string,
    })))
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/class-groups/check-teacher-conflict/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
        })
        const data = await res.json()
        const map: Record<string, string> = {}
        for (const r of (data.results || [])) if (r.conflict) map[r.key] = r.conflictDetail || '已有课程'
        setSlotConflicts(map)
      } catch { /* 静默，不打断填写 */ }
    }, 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen, createData.scheduleTemplate, createData.scheduleSlots, createData.teacherAssignments, createData.recurringDays, createData.startDate, previewDates])

  const handleNextStep = () => {
    if (createStep === 0) {
      if (!createData.courseId && !createData.courseName) {
        toast.error('请选择已有课程，或填写课程名称')
        return
      }
    }
    if (createStep === 1) {
      const teacherAssignments = Array.isArray(createData.teacherAssignments) ? createData.teacherAssignments as Record<string, unknown>[] : []
      const validAssignments = teacherAssignments.filter((item) => item.teacherId && item.subject)
      if (!createData.name || !validAssignments.length || !createData.startDate) {
        toast.error('请填写班级名称、授课教师、负责科目和开班日期')
        return
      }
    }
    setCreateStep((step) => step + 1)
  }

  const createCourseIfNeeded = async () => {
    if (createData.courseId) return createData.courseId as string
    const assignments = (Array.isArray(createData.teacherAssignments) ? createData.teacherAssignments as Record<string, unknown>[] : [])
      .filter((item) => item.teacherId && item.subject)
    const subjects = assignments.map((item) => String(item.subject)).filter(Boolean)
    const primarySubject = subjects[0] || '数学'

    const courseRes = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: createData.courseName,
        subject: subjects.join('、') || primarySubject,
        grade: createData.grade,
        type: createData.type || 'GROUP',
        lessonMinutes: createData.lessonMinutes || 90,
        totalLessons: createData.totalLessons || 16,
        color: SUBJECT_COLOR[primarySubject] || '#e8784a',
        division: createData.division || division,
      }),
    })

    const coursePayload = await courseRes.json().catch(() => ({}))
    if (!courseRes.ok) throw new Error(coursePayload.error || '课程创建失败')
    mutateCourses()
    return coursePayload.id as string
  }

  const doCreate = async () => {
    const recurringDays = (createData.recurringDays as string[]) || []
    if (!recurringDays.length) {
      toast.error('请选择至少一个上课日')
      return
    }
    if (!previewDates.length) {
      toast.error('无法生成课次，请检查开班日期、上课日和总课次数')
      return
    }

    setCreateLoading(true)
    try {
      // 一对一/小组课：如果 scheduleTemplate 为空但 scheduleSlots 有值，重建
      const isHourly = (createData.type as string) !== 'GROUP'
      let scheduleTemplateOverride: Record<string, unknown>[] | undefined
      if (isHourly) {
        const currentTemplate = (Array.isArray(createData.scheduleTemplate)
          ? createData.scheduleTemplate as Record<string, unknown>[]
          : []
        ).filter(row => row.teacherId && row.subject)

        const selectedSlots = (createData.scheduleSlots as string[]) || []
        if (currentTemplate.length === 0 && selectedSlots.length > 0) {
          const validAssignments = (
            (createData.teacherAssignments as Record<string, unknown>[]) || []
          ).filter(a => a.teacherId && a.subject)
          const rebuilt = HOURLY_PERIODS
            .filter(p => selectedSlots.includes(p.id))
            .flatMap(p => validAssignments.map(a => ({
              periodId: p.id, periodName: p.name,
              startTime: p.start, endTime: p.end,
              teacherId: a.teacherId, subject: a.subject,
            })))
          setCreateData(prev => ({ ...prev, scheduleTemplate: rebuilt }))
          scheduleTemplateOverride = rebuilt
        }
      }

      const courseId = await createCourseIfNeeded()
      const teacherAssignments = (Array.isArray(createData.teacherAssignments) ? createData.teacherAssignments as Record<string, unknown>[] : [])
        .filter((item) => item.teacherId && item.subject)
        .map((item) => ({ teacherId: item.teacherId, subject: item.subject }))
      if (!teacherAssignments.length) {
        toast.error('请至少选择一位老师和对应科目')
        setCreateLoading(false)
        return
      }
      const groupPayload = {
        name: createData.name,
        courseId,
        teacherId: teacherAssignments[0]?.teacherId || undefined,
        teacherIds: teacherAssignments.map((item) => item.teacherId),
        teacherAssignments,
        roomId: createData.roomId || null,
        startDate: createData.startDate || todayString(),
        maxStudents: createData.maxStudents || 20,
        recurringDays,
        lessonStartTime: createData.lessonStartTime || '19:00',
        lessonMinutes: createData.lessonMinutes || 90,
        totalLessons: Number(createData.totalLessons) || 16,
        division: createData.division || division,
      }

      const groupRes = await fetch('/api/class-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupPayload),
      })
      const group = await groupRes.json().catch(() => ({}))
      if (!groupRes.ok) throw new Error(group.error || '班级创建失败')

      const scheduleTemplate = resolveCreateScheduleTemplate(scheduleTemplateOverride)

      if (!scheduleTemplate.length) {
        toast.error(isHourly ? '请至少选择一个上课时间段' : '请至少为一个节次选择老师科目')
        setCreateLoading(false)
        return
      }

      const lessonRes = await fetch(`/api/class-groups/${group.id}/generate-lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...groupPayload, scheduleTemplate }),
      })
      const lessonPayload = await lessonRes.json().catch(() => ({}))
      if (!lessonRes.ok) throw new Error(lessonPayload.error || '课表生成失败')

      toast.success(`「${createData.name}」已创建，并生成 ${lessonPayload.count || previewDates.length} 节课`)
      mutateGroups()
      mutateDashboard()
      setCreateOpen(false)
      setCreateStep(0)
      setCreateData({})
    } catch (error) {
      console.error('[handleCreate]', error)
      toast.error(error instanceof Error ? error.message : '创建失败，请查看浏览器控制台')
    } finally {
      setCreateLoading(false)
    }
  }

  const handleCreate = async () => {
    // 前置检查：scheduleTemplate 有效条目数
    const validSlots = (Array.isArray(createData.scheduleTemplate)
      ? createData.scheduleTemplate as Record<string, unknown>[]
      : []
    ).filter(row => row.teacherId && row.subject && row.startTime && row.endTime)

    const isHourly = (createData.type as string) !== 'GROUP'
    const selectedSlots = (createData.scheduleSlots as string[]) || []

    if (validSlots.some(row => String(row.startTime) >= String(row.endTime))) {
      toast.error('结束时间必须晚于开始时间')
      return
    }
    const sortedSlots = [...validSlots].sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)))
    if (sortedSlots.some((row, index) => index > 0 && String(row.startTime) < String(sortedSlots[index - 1].endTime))) {
      toast.error('上课时间段不能重叠')
      return
    }

    if (isHourly && selectedSlots.length === 0 && validSlots.length === 0) {
      toast.error('请至少选择一个上课时间段')
      return
    }

    const recurringDays = (createData.recurringDays as string[]) || []
    if (!recurringDays.length) {
      toast.error('请选择至少一个上课日')
      return
    }
    if (!previewDates.length) {
      toast.error('无法生成课次，请检查开班日期、上课日和总课次数')
      return
    }

    // 防止班课生成过多课次导致超时（每天最多8节 × 总天数 ≤ 200节）
    if (!isHourly) {
      const validSlotCount = (Array.isArray(createData.scheduleTemplate)
        ? createData.scheduleTemplate as Record<string, unknown>[]
        : []
      ).filter(row => row.teacherId && row.subject).length
      const totalLessonsCount = Number(createData.totalLessons) || 16
      const estimatedTotal = validSlotCount * totalLessonsCount
      if (estimatedTotal > 250) {
        toast.error(`课次总数 ${estimatedTotal} 节过多（每天${validSlotCount}节×${totalLessonsCount}天），请控制在250节以内`)
        setCreateLoading(false)
        return
      }
    }

    const scheduleTemplate = resolveCreateScheduleTemplate()
      .filter(row => row.teacherId && row.startTime && row.endTime)
    const startDateStr = (createData.startDate as string) || todayString()

    if (scheduleTemplate.length > 0 && recurringDays.length > 0) {
      const checkDates = generatePreview(startDateStr, recurringDays, Math.min(2, Number(createData.totalLessons || 1)))
      const conflictMessages: string[] = []

      for (const date of checkDates.slice(0, 2)) {
        const dateStr = format(date, 'yyyy-MM-dd')
        for (const row of scheduleTemplate) {
          const res = await fetch('/api/class-groups/check-teacher-conflict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              teacherId: row.teacherId,
              date: dateStr,
              startTime: row.startTime,
              endTime: row.endTime,
            }),
          })
          const payload = await res.json().catch(() => ({}))
          if (payload.conflict) {
            const teacherName = teacherList.find((teacher: Record<string, unknown>) => teacher.id === row.teacherId)?.name || '该教师'
            conflictMessages.push(`${teacherName} 在 ${dateStr} ${row.startTime}-${row.endTime} 已有课次安排，${payload.conflictDetail || ''}`)
          }
        }
      }

      if (conflictMessages.length > 0) {
        Modal.confirm({
          title: '教师时间冲突',
          content: (
            <div>
              <div style={{ marginBottom: 8, color: '#98A2B3', fontSize: 13 }}>检测到以下教师在开班后的近期有时间冲突，是否仍要继续创建？</div>
              {conflictMessages.map((msg, index) => (
                <div key={index} style={{ color: '#E24B4A', fontSize: 13, marginBottom: 4 }}>• {msg}</div>
              ))}
            </div>
          ),
          okText: '忽略冲突，继续创建',
          cancelText: '返回修改',
          okButtonProps: { danger: true },
          onOk: async () => {
            await doCreate()
          },
        })
        return
      }
    }

    await doCreate()
  }

  const handleCopy = async () => {
    if (!copySource || !copyStartDate) {
      toast.error('请选择原班级和新开班日期')
      return
    }

    setCopyLoading(true)
    try {
      const res = await fetch(`/api/class-groups/${copySource}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStartDate: copyStartDate, name: copyName || undefined }),
      })
      if (!res.ok) throw new Error('复制失败')
      toast.success('班级复制成功')
      mutateGroups()
      setCopyOpen(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '复制失败')
    } finally {
      setCopyLoading(false)
    }
  }

  const handleCancelLesson = async (lessonId: string) => {
    Modal.confirm({
      title: '确认停课本次？',
      content: '停课后会标记本次课为已取消。',
      okText: '确认停课',
      okButtonProps: { danger: true },
      cancelText: '再想想',
      onOk: async () => {
        const res = await fetch(`/api/class-lessons/${lessonId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'CANCELLED' }),
        })
        if (!res.ok) throw new Error('停课失败')
        toast.success('课次已取消')
        mutateGroups()
      },
    })
  }

  const handlePostpone = async () => {
    const res = await fetch('/api/class-lessons/postpone-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: postponeLessonId, offsetDays: postponeDays }),
    })
    if (!res.ok) {
      toast.error('后移失败')
      return
    }
    toast.success(`已后移 ${postponeDays} 天`)
    setPostponeOpen(false)
  }

  const handleStartGroup = async (groupId: string) => {
    setStartingGroupId(groupId)
    try {
      const res = await fetch(`/api/class-groups/${groupId}/start`, { method: 'POST' })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || '开班失败')
      toast.success(payload.alreadyActive ? '班级已经是进行中' : `开班成功，已通知 ${payload.notifiedParents || 0} 位家长`)
      mutateGroups()
      mutateDashboard()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '开班失败')
    } finally {
      setStartingGroupId('')
    }
  }

  const handleDeleteGroup = (groupId: string, groupName: string) => {
    setDeleteTarget({ id: groupId, name: groupName })
  }

  const handleRegenerateLessons = async (groupId: string) => {
    setRegeneratingGroupId(groupId)
    try {
      const res = await fetch(`/api/class-groups/${groupId}/generate-lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(payload.error || '重新生成失败')
      toast.success(`课表已重新生成，共 ${payload.count || 0} 节课`)
      mutateGroups()
      mutateDashboard()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '重新生成失败')
    } finally {
      setRegeneratingGroupId('')
    }
  }

  return (
    <PageLayout
      title="课程管理"
      subtitle="课程设置、班级创建、课表生成和课次调整"
      actions={
        <Space>
          <Button icon={<CopyOutlined />} onClick={() => setCopyOpen(true)}>批量复制</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} style={{ background: '#e8784a' }}>
            新建班级
          </Button>
        </Space>
      }
    >
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          { label: '进行中班级', value: stats.activeGroups, color: '#27a644' },
          { label: '待开班', value: stats.waitingGroups, color: '#f5a623' },
          { label: '本月课耗', value: stats.monthlyHours, color: '#E8784A' },
          { label: '续报预警', value: stats.renewalWarnings, color: '#e03e2d' },
        ].map((item) => (
          <Col xs={12} lg={6} key={item.label}>
            <Card bordered={false} style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}>
              <div style={{ color: '#98A2B3', fontSize: 13 }}>{item.label}</div>
              <div style={{ color: item.color, fontSize: 28, fontWeight: 700 }}>{item.value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Type tabs */}
      <div style={{ display: 'flex', border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8, overflow: 'hidden', width: 'fit-content', marginBottom: 12 }}>
        <button onClick={() => setCourseTab('GROUP')} style={{
          padding: '7px 18px', background: courseTab === 'GROUP' ? '#E8784A' : 'transparent',
          color: courseTab === 'GROUP' ? '#fff' : 'var(--color-text-secondary, #666)',
          border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: courseTab === 'GROUP' ? 500 : 400,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>👥 精品班课</button>
        <button onClick={() => setCourseTab('SMALL')} style={{
          padding: '7px 18px', background: courseTab === 'SMALL' ? '#534AB7' : 'transparent',
          color: courseTab === 'SMALL' ? '#fff' : 'var(--color-text-secondary, #666)',
          border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: courseTab === 'SMALL' ? 500 : 400,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>👤 突击全能班（1对1/2/3）</button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="课程类型"
          allowClear
          style={{ width: 128 }}
          value={filterType || undefined}
          onChange={(value) => setFilterType(value || '')}
          options={courseTab === 'GROUP'
            ? [{ label: '班课', value: 'GROUP' }]
            : [
                { label: '1对1', value: 'ONE_ON_ONE' },
                { label: '小组课', value: 'SMALL_GROUP' },
              ]
          }
        />
        <Select
          placeholder="年级"
          allowClear
          style={{ width: 128 }}
          value={filterGrade || undefined}
          onChange={(value) => setFilterGrade(value || '')}
          options={grades.map((grade) => ({ label: grade, value: grade }))}
        />
        <Select
          placeholder="状态"
          allowClear
          style={{ width: 128 }}
          value={filterStatus || undefined}
          onChange={(value) => setFilterStatus(value || '')}
          options={[
            { label: '待开班', value: 'WAITING' },
            { label: '进行中', value: 'ACTIVE' },
            { label: '已结束', value: 'COMPLETED' },
          ]}
        />
        <Button icon={<ReloadOutlined />} onClick={() => mutateGroups()}>刷新</Button>
      </Space>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : filteredGroups.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 8, minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty description="暂无班级数据">
            <Button type="primary" onClick={openCreate} style={{ background: '#e8784a' }}>创建第一个班级</Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredGroups.map((group: Record<string, unknown>) => {
            const course = group.course as Record<string, unknown> | undefined
            const teacher = group.teacher as Record<string, unknown> | undefined
            const teacherAssignments = Array.isArray(group.teacherAssignments) ? group.teacherAssignments : []
            const teacherTeam = teacherAssignments.map((item: Record<string, unknown>) => {
              const name = (item.teacher as Record<string, unknown>)?.name
              return name ? `${name}${item.subject ? `(${item.subject})` : ''}` : ''
            }).filter(Boolean).join('、')
            const room = group.room as Record<string, unknown> | undefined
            const count = group._count as Record<string, number> | undefined
            const color = SUBJECT_COLOR[(course?.subject as string) || '数学'] || '#e8784a'
            const statusInfo = GROUP_STATUS_MAP[group.status as string] || { color: 'default', label: String(group.status || '-') }
            const completed = Number(group.completedLessons || 0)
            const total = Number(group.totalLessons || 0)
            const progress = total > 0 ? Math.round((completed / total) * 100) : 0

            return (
              <Col xs={24} lg={12} key={group.id as string}>
                <Card
                  bordered={false}
                  style={{ borderRadius: 8, background: '#ffffff', border: '1px solid #EEE7E1' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 8, background: `${color}22`, color, display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                        {String(course?.subject || '?')[0]}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: '#1F2329', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.name as string}</div>
                        <div style={{ color: '#98A2B3', fontSize: 12 }}>{course?.name as string}</div>
                      </div>
                    </div>
                    <Tag color={statusInfo.color} style={{ borderRadius: 999 }}>{statusInfo.label}</Tag>
                  </div>

                  <Space size={14} wrap style={{ marginBottom: 12 }}>
                    <span style={{ color: '#98A2B3', fontSize: 12 }}><TeamOutlined /> {teacherTeam || teacher?.name as string || '-'}</span>
                    <span style={{ color: '#98A2B3', fontSize: 12 }}><BookOutlined /> {course?.type === 'ONE_ON_ONE' ? '1对1' : course?.type === 'SMALL_GROUP' ? '小组课' : '班课'}</span>
                    <span style={{ color: '#98A2B3', fontSize: 12 }}><ClockCircleOutlined /> {group.lessonStartTime as string}</span>
                    <span style={{ color: '#98A2B3', fontSize: 12 }}><EnvironmentOutlined /> {room?.name as string || '未分配'}</span>
                  </Space>

                  <Row gutter={12} style={{ marginBottom: 12 }}>
                    <Col span={8}><SmallMetric label="在读/限额" value={`${count?.enrollments ?? 0}/${group.maxStudents || 0}`} /></Col>
                    <Col span={8}><SmallMetric label="剩余课次" value={String(Math.max(0, total - completed))} /></Col>
                    <Col span={8}><SmallMetric label="总课次" value={String(total)} /></Col>
                  </Row>

                  <Progress percent={progress} size="small" strokeColor={color} format={() => `已上 ${completed}/${total}`} />

                  <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <Button size="small" icon={<CalendarOutlined />} onClick={(e) => { e.stopPropagation(); setDrawerGroupId(group.id as string); setDrawerOpen(true) }}>课表</Button>
                    <Button size="small" icon={<ReloadOutlined />} loading={regeneratingGroupId === group.id} onClick={(e) => { e.stopPropagation(); handleRegenerateLessons(group.id as string) }}>重新生成</Button>
                    <Button size="small" icon={<TeamOutlined />} onClick={(e) => { e.stopPropagation(); router.push(`/courses/${group.id}`) }}>管理</Button>
                    <Button size="small" danger loading={deletingGroupId === group.id} onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id as string, group.name as string) }}>删除</Button>
                  </div>

                  {group.status === 'WAITING' && (
                    <Button
                      block
                      type="primary"
                      loading={startingGroupId === group.id}
                      onClick={() => handleStartGroup(group.id as string)}
                      style={{ marginTop: 14, background: '#27a644', borderColor: '#27a644' }}
                    >
                      开班并通知家长
                    </Button>
                  )}
                </Card>
              </Col>
            )
          })}
        </Row>
      )}

      <Modal
        title="新建班级"
        open={createOpen}
        onCancel={() => {
          setCreateOpen(false)
          setCreateLoading(false)
        }}
        footer={null}
        width={isMobile ? '100%' : 760}
        style={isMobile ? { top: 0, margin: 0, padding: 0, maxWidth: '100vw' } : undefined}
        styles={isMobile ? { body: { padding: '12px 16px', minHeight: 'calc(100dvh - 56px)', overflowY: 'auto' } } : undefined}
        destroyOnClose
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20 }}>
          {(['课程信息', '班级设置', '排课配置'] as const).map((label, index) => {
            const done = createStep > index
            const active = createStep === index
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', flex: index < 2 ? 1 : 'none', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: done ? '#1D9E75' : active ? '#E8784A' : '#EEE7E1',
                    color: (done || active) ? '#fff' : '#98A2B3',
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {done ? <CheckOutlined style={{ fontSize: 11 }} /> : index + 1}
                  </div>
                  <span style={{
                    fontSize: isMobile ? 11 : 12,
                    fontWeight: active ? 600 : 400,
                    color: active ? '#1F2329' : done ? '#1D9E75' : '#98A2B3',
                    whiteSpace: 'nowrap',
                  }}>
                    {label}
                  </span>
                </div>
                {index < 2 && (
                  <div style={{ flex: 1, height: 1, background: createStep > index ? '#1D9E75' : '#EEE7E1', margin: '0 8px' }} />
                )}
              </div>
            )
          })}
        </div>

        {createStep === 0 && (
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <MobileSelect
              allowClear
              placeholder="可选：从已有课程继承"
              style={{ width: '100%' }}
              value={(createData.courseId as string) || undefined}
              onChange={(value) => {
                const course = courseList.find((item: Record<string, unknown>) => item.id === value)
                const nextType = (course?.type || createData.type || 'GROUP') as CourseType
                const isHourly = nextType !== 'GROUP'
                setCreateData((prev) => ({
                  ...prev,
                  courseId: value,
                  courseName: course?.name || prev.courseName,
                  grade: course?.grade || prev.grade,
                  type: nextType,
                  lessonMinutes: course?.lessonMinutes || (isHourly ? 60 : 40),
                  totalLessons: course?.totalLessons || prev.totalLessons || 16,
                  maxStudents: nextType === 'ONE_ON_ONE' ? 1 : (prev.maxStudents === 1 ? 20 : prev.maxStudents),
                  scheduleSlots: [] as string[],
                  scheduleTemplate: buildScheduleTemplate(nextType, classPeriods),
                }))
              }}
              options={courseList.map((course: Record<string, unknown>) => ({
                label: `${course.name} / ${course.subject} / ${course.grade || '未设年级'}`,
                value: course.id as string,
              }))}
            />
            <Row gutter={[12, 10]}>
              <Col xs={24} sm={16}>
                <Input placeholder="课程名称，例如：高一全科同步提高" value={(createData.courseName as string) || ''} onChange={(event) => setCreateData((prev) => ({ ...prev, courseName: event.target.value, courseId: undefined }))} />
              </Col>
              <Col xs={24} sm={8}>
                <Input placeholder="年级，例如：高一" value={(createData.grade as string) || ''} onChange={(event) => setCreateData((prev) => ({ ...prev, grade: event.target.value, courseId: undefined }))} />
              </Col>
            </Row>
            <div>
              <div style={{ fontSize: 12, color: '#98A2B3', marginBottom: 6 }}>课程类型</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {([
                  { value: 'GROUP', label: '班课', sub: '每节40分', icon: '班' },
                  { value: 'ONE_ON_ONE', label: '1对1', sub: '每节60分', icon: '1' },
                  { value: 'SMALL_GROUP', label: '小组课', sub: '每节60分', icon: '组' },
                ] as { value: CourseType; label: string; sub: string; icon: string }[]).map((option) => {
                  const active = ((createData.type as CourseType) || 'GROUP') === option.value
                  return (
                    <div
                      key={option.value}
                      onClick={() => {
                        const isHourly = option.value !== 'GROUP'
                        setCreateData((prev) => ({
                          ...prev,
                          type: option.value,
                          lessonMinutes: isHourly ? 60 : 40,
                          maxStudents: option.value === 'ONE_ON_ONE' ? 1 : (Number(prev.maxStudents) === 1 ? 20 : prev.maxStudents),
                          scheduleSlots: [] as string[],
                          scheduleTemplate: buildScheduleTemplate(option.value, classPeriods),
                        }))
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 8,
                        cursor: 'pointer',
                        userSelect: 'none',
                        border: `1.5px solid ${active ? '#E8784A' : '#EEE7E1'}`,
                        background: active ? '#fff3ec' : '#fff',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                        minWidth: 74,
                      }}
                    >
                      <span style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        background: active ? '#E8784A' : '#F5F2EE',
                        color: active ? '#fff' : '#8D806F',
                        fontSize: 12,
                        fontWeight: 700,
                      }}>{option.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: active ? 700 : 400, color: active ? '#E8784A' : '#1F2329' }}>{option.label}</span>
                      <span style={{ fontSize: 11, color: '#98A2B3' }}>{option.sub}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, paddingTop: 12, borderTop: '1px solid #EEE7E1' }}>
              <Button type="primary" onClick={handleNextStep}>下一步</Button>
            </div>
          </Space>
        )}

        {createStep === 1 && (
          <Space direction="vertical" size={14} style={{ width: '100%' }}>
            <Input placeholder="班级名称，例如：高一全科同步班" value={(createData.name as string) || ''} onChange={(event) => setCreateData((prev) => ({ ...prev, name: event.target.value }))} />
            <div style={{ background: '#FCFBF9', border: '1px solid #EEE7E1', borderRadius: 8, padding: 12 }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700, color: '#1F2329' }}>老师-科目对应表</div>
                <div style={{ fontSize: 12, color: '#98A2B3' }}>先选老师，再指定这位老师负责的科目。教师端课表、考勤、课堂反馈都会按这里分配。</div>
              </div>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {(((createData.teacherAssignments as Record<string, unknown>[]) || [{ teacherId: '', subject: '' }])).map((assignment, index) => {
                  const subjectOptions = SUBJECTS.map((subject) => ({ label: subject, value: subject }))
                  return (
                    <Row gutter={8} key={index} align="middle">
                      <Col xs={11} sm={10}>
                        <MobileSelect
                          placeholder="选择授课老师"
                          style={{ width: '100%' }}
                          value={(assignment.teacherId as string) || undefined}
                          onChange={(value) => setCreateData((prev) => {
                            const rows = [...((prev.teacherAssignments as Record<string, unknown>[]) || [])]
                            while (rows.length <= index) rows.push({ teacherId: '', subject: '' })
                            rows[index] = { ...rows[index], teacherId: value }
                            return { ...prev, teacherAssignments: rows }
                          })}
                          options={teacherList.map((teacher: Record<string, unknown>) => ({
                            label: String(teacher.name || ''),
                            value: teacher.id as string,
                          }))}
                        />
                      </Col>
                      <Col xs={11} sm={10}>
                        <MobileSelect
                          placeholder="选择负责科目"
                          style={{ width: '100%' }}
                          value={(assignment.subject as string) || undefined}
                          onChange={(value) => setCreateData((prev) => {
                            const rows = [...((prev.teacherAssignments as Record<string, unknown>[]) || [])]
                            while (rows.length <= index) rows.push({ teacherId: '', subject: '' })
                            rows[index] = { ...rows[index], subject: value }
                            return { ...prev, teacherAssignments: rows, courseId: undefined }
                          })}
                          options={subjectOptions}
                        />
                      </Col>
                      <Col xs={2} sm={4}>
                        {index > 0 && (
                          <Button
                            block
                            size="small"
                            onClick={() => setCreateData((prev) => {
                              const rows = ((prev.teacherAssignments as Record<string, unknown>[]) || []).filter((_, i) => i !== index)
                              return { ...prev, teacherAssignments: rows.length ? rows : [{ teacherId: '', subject: '' }], courseId: undefined }
                            })}
                          >
                            移除
                          </Button>
                        )}
                      </Col>
                    </Row>
                  )
                })}
              </Space>
              <div style={{ marginTop: 12, borderTop: '1px solid #EEE7E1', paddingTop: 12 }}>
                <Button
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setCreateData((prev) => {
                    const rows = [...((prev.teacherAssignments as Record<string, unknown>[]) || []), { teacherId: '', subject: '' }]
                    return { ...prev, teacherAssignments: rows, courseId: undefined }
                  })}
                >
                  添加老师科目
                </Button>
              </div>
            </div>
            <Select allowClear placeholder="教室" style={{ width: '100%' }} value={(createData.roomId as string) || undefined} onChange={(value) => setCreateData((prev) => ({ ...prev, roomId: value }))} options={roomList.map((room: Record<string, unknown>) => ({ label: `${room.name} / ${room.capacity || 0}人`, value: room.id as string }))} />
            <Row gutter={[12, 10]}>
              <Col xs={24} sm={8}>
                <div style={{ fontSize: 12, color: '#98A2B3', marginBottom: 4 }}>开班日期</div>
                <Input type="date" value={(createData.startDate as string) || todayString()} onChange={(event) => setCreateData((prev) => ({ ...prev, startDate: event.target.value }))} style={{ width: '100%' }} />
              </Col>
              <Col xs={12} sm={8}><InputNumber min={1} max={100} addonBefore="限额" addonAfter="人" style={{ width: '100%' }} value={Number(createData.maxStudents || 20)} onChange={(value) => setCreateData((prev) => ({ ...prev, maxStudents: value || 20 }))} /></Col>
              <Col xs={12} sm={8}><InputNumber min={1} max={120} addonBefore="课次" style={{ width: '100%' }} value={Number(createData.totalLessons || 16)} onChange={(value) => setCreateData((prev) => ({ ...prev, totalLessons: value || 16 }))} /></Col>
            </Row>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '1px solid #EEE7E1' }}>
              <Button onClick={() => setCreateStep(0)}>上一步</Button>
              <Button type="primary" onClick={handleNextStep}>下一步</Button>
            </div>
          </Space>
        )}

        {createStep === 2 && (() => {
          const isHourly = (createData.type as string) !== 'GROUP'
          const selectedSlots = (createData.scheduleSlots as string[]) || []
          const validAssignments = ((createData.teacherAssignments as Record<string, unknown>[]) || [])
            .filter(assignment => assignment.teacherId && assignment.subject)
          const scheduledCount = (Array.isArray(createData.scheduleTemplate) ? createData.scheduleTemplate as Record<string, unknown>[] : [])
            .filter(row => row.teacherId && row.subject && row.startTime && row.endTime).length

          return (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div>
              <div style={{ color: '#98A2B3', marginBottom: 10 }}>选择上课日</div>
              <Space wrap>
                {ALL_DAYS.map((day) => {
                  const days = (createData.recurringDays as string[]) || []
                  const active = days.includes(day)
                  return (
                    <Tag
                      key={day}
                      onClick={() => setCreateData((prev) => ({ ...prev, recurringDays: active ? days.filter((item) => item !== day) : [...days, day] }))}
                      style={{
                        cursor: 'pointer',
                        borderRadius: 999,
                        padding: isMobile ? '8px 16px' : '5px 14px',
                        fontSize: isMobile ? 14 : 13,
                        border: 'none',
                        background: active ? '#E8784A' : '#202226',
                        color: active ? '#fff' : '#98A2B3',
                        userSelect: 'none',
                        WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      {DAY_LABELS[day]}
                    </Tag>
                  )
                })}
              </Space>
            </div>

            {/* Daily schedule template */}
            <div>
              <div style={{ color: '#98A2B3', marginBottom: 10, fontSize: 13 }}>
                {isHourly ? '每天上课时间段（可多选）' : '每日节次安排（空节次不会排课）'}
              </div>
              {isHourly ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(4, 1fr)' : 'repeat(8, 1fr)', gap: 8 }}>
                    {HOURLY_PERIODS.map(period => {
                      const selected = selectedSlots.includes(period.id)
                      return (
                        <div
                          key={period.id}
                          onClick={() => {
                            const nextSlots = selected
                              ? selectedSlots.filter(slot => slot !== period.id)
                              : [...selectedSlots, period.id]
                            const nextTemplate = HOURLY_PERIODS
                              .filter(item => nextSlots.includes(item.id))
                              .flatMap(item => validAssignments.map(assignment => ({
                                periodId: item.id,
                                periodName: item.name,
                                startTime: item.start,
                                endTime: item.end,
                                teacherId: assignment.teacherId as string,
                                subject: assignment.subject as string,
                              })))
                            setCreateData(prev => ({ ...prev, scheduleSlots: nextSlots, scheduleTemplate: nextTemplate }))
                          }}
                          style={{
                            padding: '8px 4px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            textAlign: 'center',
                            border: `1.5px solid ${selected ? '#E8784A' : '#EEE7E1'}`,
                            background: selected ? '#fff3ec' : '#FCFBF9',
                            userSelect: 'none',
                            WebkitTapHighlightColor: 'transparent',
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: selected ? 700 : 400, color: selected ? '#E8784A' : '#1F2329' }}>{period.name}</div>
                          <div style={{ fontSize: 10, color: '#C4BAB0' }}>{period.end}</div>
                          {selected && validAssignments.some(a =>
                            slotConflicts[`${a.teacherId}::${period.start}-${period.end}`]
                          ) && (
                            <div style={{ fontSize: 10, color: '#E24B4A', fontWeight: 700 }}>⚠ 冲突</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {selectedSlots.length === 0 && (
                    <div style={{ fontSize: 12, color: '#E24B4A', marginTop: 6 }}>请至少选择一个时间段</div>
                  )}
                  {selectedSlots.length > 0 && (
                    <div style={{ fontSize: 12, color: '#E8784A', marginTop: 6 }}>已选 {selectedSlots.length} 个时间段，每节 60 分钟</div>
                  )}
                </div>
              ) : (
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  {(Array.isArray(createData.scheduleTemplate) ? createData.scheduleTemplate as Record<string, unknown>[] : []).map((row, index) => {
                    const assignments = (Array.isArray(createData.teacherAssignments) ? createData.teacherAssignments as Record<string, unknown>[] : [])
                    const filled = !!(row.teacherId && row.subject)
                    return (
                      <div key={index} style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '52px minmax(0, 1fr)' : '58px 190px minmax(0, 1fr)',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: filled ? '#FCFBF9' : '#fff',
                        border: `1px solid ${filled ? '#E8784A33' : '#EEE7E1'}`,
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#E8784A' }}>{row.periodName as string}</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, minWidth: 0 }}>
                          <Input
                            size="small"
                            type="time"
                            aria-label={`${row.periodName as string}开始时间`}
                            value={row.startTime as string}
                            onChange={event => {
                              const template = [...(Array.isArray(createData.scheduleTemplate) ? createData.scheduleTemplate as Record<string, unknown>[] : [])]
                              template[index] = { ...template[index], startTime: event.target.value }
                              setCreateData(prev => ({ ...prev, scheduleTemplate: template }))
                            }}
                          />
                          <Input
                            size="small"
                            type="time"
                            aria-label={`${row.periodName as string}结束时间`}
                            value={row.endTime as string}
                            onChange={event => {
                              const template = [...(Array.isArray(createData.scheduleTemplate) ? createData.scheduleTemplate as Record<string, unknown>[] : [])]
                              template[index] = { ...template[index], endTime: event.target.value }
                              setCreateData(prev => ({ ...prev, scheduleTemplate: template }))
                            }}
                          />
                        </div>
                        <Select
                          size="small"
                          allowClear
                          placeholder="老师科目（空=不排课）"
                          style={{ width: '100%', gridColumn: isMobile ? '1 / -1' : undefined }}
                          value={row.teacherId && row.subject ? `${row.teacherId}::${row.subject}` : undefined}
                          onChange={v => {
                            const template = [...(Array.isArray(createData.scheduleTemplate) ? createData.scheduleTemplate as Record<string, unknown>[] : [])]
                            if (v) {
                              const [tid, subj] = String(v).split('::')
                              template[index] = { ...template[index], teacherId: tid, subject: subj }
                            } else {
                              template[index] = { ...template[index], teacherId: '', subject: '' }
                            }
                            setCreateData(prev => ({ ...prev, scheduleTemplate: template }))
                          }}
                          options={assignments.filter(a => a.teacherId && a.subject).map(a => ({
                            label: `${teacherList.find((teacher: Record<string, unknown>) => teacher.id === a.teacherId)?.name || '老师'} / ${a.subject}`,
                            value: `${a.teacherId}::${a.subject}`,
                          }))}
                        />
                        {!!(row.teacherId && row.startTime && row.endTime) &&
                          slotConflicts[`${row.teacherId}::${row.startTime}-${row.endTime}`] && (
                          <span style={{ fontSize: 11, color: '#E24B4A', gridColumn: '1 / -1' }}>
                            ⚠ {slotConflicts[`${row.teacherId}::${row.startTime}-${row.endTime}`]}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </Space>
              )}
            </div>

            <Row gutter={[12, 10]}>
              <Col xs={12} sm={8}><InputNumber min={isHourly ? 60 : 30} max={isHourly ? 120 : 240} step={isHourly ? 60 : 5} addonBefore="课时" addonAfter="分钟" style={{ width: '100%' }} value={Number(createData.lessonMinutes || (isHourly ? 60 : 40))} disabled={isHourly} onChange={(value) => setCreateData((prev) => ({ ...prev, lessonMinutes: value || (isHourly ? 60 : 40) }))} /></Col>
              <Col xs={12} sm={8}><InputNumber min={1} max={120} addonBefore="总天次" style={{ width: '100%' }} value={Number(createData.totalLessons || 16)} onChange={(value) => setCreateData((prev) => ({ ...prev, totalLessons: value || 16 }))} /></Col>
            </Row>
            <div style={{ background: '#FCFBF9', border: '1px solid #EEE7E1', borderRadius: 8, padding: 14, minHeight: 104 }}>
              <div style={{ color: '#1F2329', fontWeight: 700, marginBottom: 8 }}>课次预览（共{previewDates.length}天，每天{scheduledCount}节，合计{previewDates.length * scheduledCount}节）</div>
              {previewDates.length ? previewDates.slice(0, 6).map((date, index) => (
                <div key={date.toISOString()} style={{ color: '#98A2B3', fontSize: 12, lineHeight: '22px' }}>
                  第{index + 1}天 · {format(date, 'yyyy-MM-dd EEEE', { locale: zhCN })}
                </div>
              )) : <div style={{ color: '#98A2B3' }}>请选择上课日后生成预览</div>}
              {previewDates.length > 6 && <div style={{ color: '#98A2B3', fontSize: 12 }}>... 还有 {previewDates.length - 6} 天</div>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTop: '1px solid #EEE7E1' }}>
              <Button onClick={() => setCreateStep(1)}>上一步</Button>
              <Button type="primary" loading={createLoading} onClick={handleCreate} style={{ background: '#e8784a' }}>
                {createLoading ? '正在创建...' : '确认创建并生成课表'}
              </Button>
            </div>
          </Space>
          )
        })()}
      </Modal>

      <Modal title="批量复制班次" open={copyOpen} onCancel={() => setCopyOpen(false)} onOk={handleCopy} confirmLoading={copyLoading} okText="确认复制">
        <Space direction="vertical" style={{ width: '100%' }}>
          <MobileSelect placeholder="选择原班级" style={{ width: '100%' }} value={copySource || undefined} onChange={(value) => setCopySource(value)} options={filteredGroups.map((group: Record<string, unknown>) => ({ label: group.name as string, value: group.id as string }))} />
          <Input placeholder="新班级名称" value={copyName} onChange={(event) => setCopyName(event.target.value)} />
          <Input type="date" value={copyStartDate} onChange={(event) => setCopyStartDate(event.target.value)} />
        </Space>
      </Modal>

      <Drawer title="课次管理" open={drawerOpen} onClose={() => setDrawerOpen(false)} width={isMobile ? '100%' : 420}>
        {drawerLessons ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            {drawerLessonList.length === 0 && <Empty description="暂无待处理课次" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
            {drawerLessonList.map((lesson: Record<string, unknown>) => {
              const isCompleted = lesson.status === 'COMPLETED'
              const isCancelled = lesson.status === 'CANCELLED'
              return (
                <div key={lesson.id as string} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, background: '#FCFBF9', border: '1px solid #EEE7E1', borderRadius: 8, padding: 12, opacity: isCancelled ? 0.55 : 1 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#1F2329', fontWeight: 700, marginBottom: 4 }}>{format(new Date(lesson.lessonDate as string), 'M月d日 EEEE', { locale: zhCN })}</div>
                    <div style={{ color: '#98A2B3', fontSize: 12, marginBottom: 4 }}>{lesson.startTime as string}-{lesson.endTime as string}</div>
                    <div style={{ color: '#6B7280', fontSize: 12 }}>{String(lesson.subject || '')}</div>
                  </div>
                  {isCompleted ? <Tag color="green">已完成</Tag> : isCancelled ? <Tag color="red">已取消</Tag> : (
                    <Dropdown menu={{ items: [
                      { key: 'postpone', label: '一键后移', onClick: () => { setPostponeLessonId(lesson.id as string); setPostponeOpen(true) } },
                      { key: 'cancel', label: '停课本次', danger: true, onClick: () => handleCancelLesson(lesson.id as string) },
                    ]}}>
                      <Button type="text" icon={<MoreOutlined />} />
                    </Dropdown>
                  )}
                </div>
              )
            })}
          </Space>
        ) : <Spin />}
      </Drawer>

      <Modal title="一键后移课次" open={postponeOpen} onCancel={() => setPostponeOpen(false)} onOk={handlePostpone} okText="确认后移">
        <Space>
          <span>后移</span>
          <InputNumber min={1} max={90} value={postponeDays} onChange={(value) => setPostponeDays(value || 7)} />
          <span>天</span>
        </Space>
      </Modal>

      <Modal
        title="删除班级"
        open={!!deleteTarget}
        okText="备份并删除"
        okButtonProps={{ danger: true, loading: deletingGroupId === deleteTarget?.id }}
        cancelText="取消"
        onCancel={() => setDeleteTarget(null)}
        onOk={async () => {
          if (!deleteTarget) return
          setDeletingGroupId(deleteTarget.id)
          try {
            const res = await fetch(`/api/class-groups/${deleteTarget.id}`, { method: 'DELETE' })
            const payload = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(payload.error || '删除失败')
            toast.success('已备份并删除班级')
            mutateGroups()
            mutateDashboard()
            setDeleteTarget(null)
          } catch (error) {
            toast.error(error instanceof Error ? error.message : '删除失败')
          } finally {
            setDeletingGroupId('')
          }
        }}
      >
        确定删除「{deleteTarget?.name}」吗？系统会先备份班级及相关课次、报名、考勤、测评数据，然后从业务数据库中清除。
      </Modal>
    </PageLayout>
  )
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ color: '#98A2B3', fontSize: 11 }}>{label}</div>
      <div style={{ color: '#1F2329', fontSize: 15, fontWeight: 700 }}>{value}</div>
    </div>
  )
}
