'use client'
import { AdaptiveSelect } from '@/components/AdaptiveSelect';

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import {
  Alert,
  Button,
  Card,
  Drawer,
  Input,
  Modal,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CrownOutlined,
  EditOutlined,
  PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { toast } from 'sonner'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text } = Typography
const fetcher = async (url: string) => {
  const controller = new AbortController()
  let timedOut = false
  const timeout = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, 15_000)

  try {
    const response = await fetch(url, { signal: controller.signal })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(payload.error || '加载失败')
    return payload
  } catch (fetchError) {
    if (timedOut) throw new Error('加载超时，请检查网络后重试')
    throw fetchError
  } finally {
    window.clearTimeout(timeout)
  }
}

type TeachingType = 'ONE_ON_ONE' | 'ONE_ON_TWO' | 'ONE_ON_THREE'

interface IntensiveStudent {
  id: string
  name: string
  grade?: string | null
  totalHours: number
  usedHours: number
  remainHours: number
  approvedHours: number
  pendingHours: number
}

interface IntensiveLesson {
  id: string
  lessonDate: string
  startTime: string
  endTime: string
  plannedMinutes?: number | null
  actualMinutes?: number | null
  status: string
  settlementStatus: string
  intensiveReviewStatus: 'NOT_REQUIRED' | 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'
  latestReview?: {
    id: string
    status: string
    actualMinutes: number
    reviewNote?: string | null
  } | null
  attendanceSubmitted: boolean
  attendanceCount: number
  feedbackCount: number
  students: Array<{ id: string; name: string }>
  canEdit: boolean
}

interface IntensiveGroup {
  id: string
  groupId: string
  name: string
  teachingType: TeachingType
  teachingTypeLabel: string
  subject: string
  grade?: string | null
  courseName: string
  room?: { id: string; name: string } | null
  defaultMinutes: number
  approvedHours: number
  approvedLessonCount: number
  pendingHours: number
  students: IntensiveStudent[]
  lessons: IntensiveLesson[]
}

interface IntensivePayload {
  teacher: { id: string; name: string; division: string }
  unclassifiedLessonCount: number
  groups: IntensiveGroup[]
}

interface ScheduleDraft {
  lessonId?: string
  scopeId: string
  groupId: string
  subject: string
  lessonDate: string
  startTime: string
  endTime: string
  studentIds: string[]
  note: string
}

type ScheduleMode = 'schedule' | 'history' | 'edit'

function localDateInput(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
}

function expectedStudents(type: TeachingType) {
  if (type === 'ONE_ON_TWO') return 2
  if (type === 'ONE_ON_THREE') return 3
  return 1
}

function addMinutes(startTime: string, minutes: number) {
  const [hours, mins] = startTime.split(':').map(Number)
  const total = Math.min(23 * 60 + 59, hours * 60 + mins + Math.max(30, minutes))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function lessonTimestamp(lesson: IntensiveLesson) {
  return new Date(`${lesson.lessonDate.slice(0, 10)}T${lesson.startTime}:00+08:00`).getTime()
}

function statusLabel(lesson: IntensiveLesson) {
  if (lesson.intensiveReviewStatus === 'PENDING') return '待管理员审核'
  if (lesson.intensiveReviewStatus === 'REJECTED') return '已驳回待修改'
  if (lesson.intensiveReviewStatus === 'APPROVED') return '审核已通过'
  if (lesson.status === 'COMPLETED') return '已完成'
  if (lesson.status === 'IN_PROGRESS') return '上课中'
  if (lesson.settlementStatus !== 'UNSETTLED') return '已结算'
  return '待上课'
}

export default function TeacherIntensivePage() {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const { data, error, isLoading, isValidating, mutate } = useSWR<IntensivePayload>(
    '/api/teacher/intensive-lessons',
    fetcher,
    { refreshInterval: 15_000, revalidateOnFocus: true, revalidateOnReconnect: true },
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('schedule')
  const [saving, setSaving] = useState(false)
  const [subjectFilter, setSubjectFilter] = useState('ALL')
  const [draft, setDraft] = useState<ScheduleDraft>({
    scopeId: '',
    groupId: '',
    subject: '',
    lessonDate: localDateInput(),
    startTime: '18:00',
    endTime: '19:00',
    studentIds: [],
    note: '',
  })

  const groups = useMemo(() => data?.groups || [], [data?.groups])
  const [pageOpenedAt] = useState(() => Date.now())
  const approvedHours = groups.reduce((total, group) => total + Number(group.approvedHours || 0), 0)
  const pendingReviewHours = groups.reduce((total, group) => total + Number(group.pendingHours || 0), 0)
  const selectedGroup = groups.find((group) => group.id === draft.scopeId)
  const subjects = useMemo(() => [...new Set(groups.map((group) => group.subject))], [groups])
  const visibleGroups = subjectFilter === 'ALL'
    ? groups
    : groups.filter((group) => group.subject === subjectFilter)

  const openCreate = (group: IntensiveGroup) => {
    setScheduleMode('schedule')
    const startTime = '18:00'
    const limit = expectedStudents(group.teachingType)
    setDraft({
      scopeId: group.id,
      groupId: group.groupId,
      subject: group.subject,
      lessonDate: localDateInput(),
      startTime,
      endTime: addMinutes(startTime, group.defaultMinutes || 60),
      studentIds: group.students.slice(0, limit).map((student) => student.id),
      note: '',
    })
    setDrawerOpen(true)
  }

  const openHistory = (group: IntensiveGroup) => {
    openCreate(group)
    setScheduleMode('history')
    setDraft((current) => ({
      ...current,
      lessonDate: localDateInput(new Date(pageOpenedAt - 86400000)),
      note: '历史课次补录：',
    }))
  }

  const openEdit = (group: IntensiveGroup, lesson: IntensiveLesson) => {
    setScheduleMode('edit')
    setDraft({
      lessonId: lesson.id,
      scopeId: group.id,
      groupId: group.groupId,
      subject: group.subject,
      lessonDate: lesson.lessonDate.slice(0, 10),
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      studentIds: lesson.students.map((student) => student.id),
      note: '',
    })
    setDrawerOpen(true)
  }

  const selectScope = (scopeId: string) => {
    const group = groups.find((item) => item.id === scopeId)
    if (!group) return
    const limit = expectedStudents(group.teachingType)
    setDraft((current) => ({
      ...current,
      scopeId: group.id,
      groupId: group.groupId,
      subject: group.subject,
      endTime: addMinutes(current.startTime, group.defaultMinutes || 60),
      studentIds: group.students.slice(0, limit).map((student) => student.id),
    }))
  }

  // 本次上课时长（按开始/结束时间实时计算，支持学生提前结束的按实际时长预约）
  const durationMin = useMemo(() => {
    if (!draft.startTime || !draft.endTime) return 0
    const [sh, sm] = draft.startTime.split(':').map(Number)
    const [eh, em] = draft.endTime.split(':').map(Number)
    const diff = (eh * 60 + em) - (sh * 60 + sm)
    return diff > 0 ? diff : 0
  }, [draft.startTime, draft.endTime])

  const shiftEndTime = (minutes: number) => {
    if (!draft.startTime) return
    const [h, m] = draft.startTime.split(':').map(Number)
    const total = (h * 60 + m) + minutes
    const nh = Math.floor(total / 60) % 24
    const nm = total % 60
    setDraft((current) => ({
      ...current,
      endTime: `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`,
    }))
  }

  const saveSchedule = async () => {
    if (!selectedGroup) return toast.error('请选择个性化课程')
    const limit = expectedStudents(selectedGroup.teachingType)
    if (draft.studentIds.length !== limit) {
      return toast.warning(`${selectedGroup.teachingTypeLabel}需要选择${limit}名学生`)
    }
    if (!draft.lessonDate || !draft.startTime || !draft.endTime) {
      return toast.warning('请完整填写日期和时间')
    }
    if (draft.lessonDate < localDateInput() && draft.note.trim().length < 2) {
      return toast.warning('补录历史课程时请填写补录说明')
    }

    setSaving(true)
    try {
      const response = await fetch(
        draft.lessonId
          ? `/api/teacher/intensive-lessons/${draft.lessonId}`
          : '/api/teacher/intensive-lessons',
        {
          method: draft.lessonId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        },
      )
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const conflictText = Array.isArray(payload.conflicts)
          ? payload.conflicts.map((item: { message?: string }) => item.message).filter(Boolean).join('；')
          : ''
        throw new Error(conflictText || payload.error || '安排课程失败')
      }
      toast.success(draft.lessonId ? '上课时间已调整' : '课程安排成功', { duration: 1800 })
      setDrawerOpen(false)
      const historicalLessonId = !draft.lessonId
        && draft.lessonDate < localDateInput()
        && typeof payload.lesson?.id === 'string'
        ? payload.lesson.id
        : ''
      void mutate()
      if (historicalLessonId) {
        toast.info('历史课次已建立，请继续填写实际授课时长和考勤', { duration: 2200 })
        router.push(`/teacher/attendance?lessonId=${encodeURIComponent(historicalLessonId)}`)
      }
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : '安排课程失败', { duration: 2600 })
    } finally {
      setSaving(false)
    }
  }

  const cancelLesson = (lesson: IntensiveLesson) => {
    Modal.confirm({
      title: '确认取消这次课程？',
      content: '取消后不会扣减学生课时，也不会生成教师工资。',
      okText: '确认取消',
      cancelText: '暂不取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        const response = await fetch(`/api/teacher/intensive-lessons/${lesson.id}`, { method: 'DELETE' })
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(payload.error || '取消失败')
        toast.success('课次已取消')
        await mutate()
      },
    })
  }

  if (error && !data) {
    return (
      <div style={{ padding: isMobile ? 12 : 24 }}>
        <Alert
          type="error"
          showIcon
          message={error.message || '个性化课程加载失败'}
          description="页面加载未完成，可以检查网络后重新尝试。"
          action={<Button onClick={() => void mutate()} loading={isValidating}>重新加载</Button>}
        />
      </div>
    )
  }

  if (isLoading && !data) {
    return <div role="status" aria-live="polite" aria-busy="true" style={{ minHeight: '40vh', padding: isMobile ? 12 : 24 }}><Skeleton active paragraph={{ rows: 8 }} /></div>
  }

  return (
    <div style={{
      width: '100%',
      maxWidth: '100%',
      minHeight: '100%',
      padding: isMobile ? 12 : 24,
      background: 'var(--color-canvas)',
    }}>
      <div style={{
        maxWidth: 1180,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 12 : 18,
      }}>
        {/* Hero：VIP 课程预约 · 贵宾服务（深墨绿鎏金） */}
        <div style={{
          borderRadius: 18, overflow: 'hidden',
          border: '1px solid #C9A45C',
          boxShadow: '0 10px 26px rgba(18,60,53,.25)',
          background: 'linear-gradient(150deg,#17352F 0%,#0E5E4E 55%,#0B4B40 100%)',
          padding: 16, color: '#F5F1E8',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 700, letterSpacing: 1,
              color: '#F2E3B6', background: 'rgba(201,164,92,.16)',
              border: '1px solid rgba(201,164,92,.5)',
              padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap',
            }}>
              <CrownOutlined /> VIP 课程预约 · 贵宾服务
            </span>
            <Button
              icon={<CalendarOutlined />}
              onClick={() => router.push('/teacher/schedule')}
              style={{
                minHeight: 34, borderRadius: 999, fontSize: 12, fontWeight: 600,
                color: '#F2E3B6', background: 'rgba(201,164,92,.12)',
                border: '1px solid rgba(201,164,92,.55)',
              }}
            >
              查看课表
            </Button>
          </div>
          <div style={{ marginTop: 12, fontSize: 17, fontWeight: 800, color: '#F5F1E8', lineHeight: 1.4 }}>
            {groups.length ? `${groups.length} 门个性化课程待安排` : '我的个性化课程'}
          </div>
          <div style={{ marginTop: 4, fontSize: 11.5, color: 'rgba(245,241,232,.72)', lineHeight: 1.6 }}>
            预约提交后管理端可查看，课程完成并提交考勤后再审核结算课时与工资
          </div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
            {[
              { label: '个性化课程', value: groups.length, suffix: '门', icon: <TeamOutlined />, highlight: groups.length > 0 },
              { label: '已审核授课', value: approvedHours.toFixed(2), suffix: '小时', icon: <CheckCircleOutlined />, highlight: false },
              { label: '待审核授课', value: pendingReviewHours.toFixed(2), suffix: '小时', icon: <ClockCircleOutlined />, highlight: pendingReviewHours > 0 },
            ].map((item) => (
              <div key={item.label} style={{
                textAlign: 'center', padding: '10px 2px', borderRadius: 12,
                background: item.highlight ? 'linear-gradient(135deg,#F2E3B6,#D8BC7C)' : 'rgba(255,255,255,.08)',
                border: item.highlight ? '1px solid rgba(242,227,182,.7)' : '1px solid rgba(242,227,182,.18)',
              }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: item.highlight ? '#123C35' : '#F5F1E8', fontVariantNumeric: 'tabular-nums' }}>
                  {item.value}<span style={{ fontSize: 10.5, fontWeight: 600 }}> {item.suffix}</span>
                </div>
                <div style={{ marginTop: 2, fontSize: 10, color: item.highlight ? 'rgba(18,60,53,.7)' : 'rgba(245,241,232,.6)' }}>{item.label}</div>
              </div>
            ))}
          </div>
          {!!groups.length && (
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => openCreate(visibleGroups[0] || groups[0])}
                style={{
                  minHeight: 40, borderRadius: 10, fontWeight: 600, fontSize: 13,
                  background: 'linear-gradient(135deg,#F2E3B6,#D8BC7C)', color: '#123C35', border: 'none',
                  boxShadow: '0 4px 12px rgba(18,60,53,.3)',
                }}
              >
                约个性化课程
              </Button>
              <Button
                icon={<ClockCircleOutlined />}
                onClick={() => openHistory(visibleGroups[0] || groups[0])}
                style={{
                  minHeight: 40, borderRadius: 10, fontWeight: 600, fontSize: 13,
                  color: '#F2E3B6', background: 'rgba(201,164,92,.12)',
                  border: '1px solid rgba(201,164,92,.55)',
                }}
              >
                补录历史课次
              </Button>
            </div>
          )}
        </div>

        {error && <Alert type="error" showIcon message={error.message || '个性化课程刷新失败'} action={<Button onClick={() => void mutate()} loading={isValidating}>重新加载</Button>} />}
        {!!data?.unclassifiedLessonCount && (
          <Alert
            type="warning"
            showIcon
            message={`有${data.unclassifiedLessonCount}条历史课次缺少明确学科，已暂不计入分学科统计`}
            description="请联系管理员补齐历史课次学科，避免数学、英语、物理等数据混合。"
          />
        )}

        {!!subjects.length && (
          <div style={{ overflowX: 'auto', paddingBottom: 2 }}>
            <Space size={8} style={{ minWidth: 'max-content' }}>
              {['ALL', ...subjects].map((subject) => (
                <Button
                  key={subject}
                  type={subjectFilter === subject ? 'primary' : 'default'}
                  onClick={() => setSubjectFilter(subject)}
                  style={{ minHeight: 40, borderRadius: 999 }}
                >
                  {subject === 'ALL' ? '全部学科' : subject}
                </Button>
              ))}
            </Space>
          </div>
        )}

        {!groups.length ? (
          <div style={{
            borderRadius: 14, padding: '30px 18px', textAlign: 'center',
            background: 'linear-gradient(150deg,#FFFDF7,#FBF3E4)',
            border: '1px dashed rgba(201,164,92,.5)',
          }}>
            <div style={{
              width: 48, height: 48, margin: '0 auto 10px', borderRadius: 999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg,#F2E3B6,#D8BC7C)', color: '#123C35', fontSize: 21,
            }}>
              <CrownOutlined />
            </div>
            <div style={{ color: '#2B2110', fontSize: 14, fontWeight: 700 }}>暂无 VIP 个性化课程</div>
            <div style={{ marginTop: 6, color: '#9A8E7A', fontSize: 12, lineHeight: 1.7, maxWidth: 320, margin: '6px auto 0' }}>
              管理员为一对一 / 一对二 / 一对三学员分配课程后，会第一时间出现在这里，届时即可自主预约上课时段。
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
            gap: 14,
          }}>
            {visibleGroups.map((group) => {
              const groupLessons = group.lessons
                .filter((lesson) => lesson.status === 'SCHEDULED' && lessonTimestamp(lesson) >= pageOpenedAt - 30 * 60_000)
                .sort((a, b) => lessonTimestamp(a) - lessonTimestamp(b))
              const nextLesson = groupLessons[0]
              const reviewLesson = group.lessons.find((lesson) => (
                lesson.intensiveReviewStatus === 'PENDING'
                || lesson.intensiveReviewStatus === 'REJECTED'
              ))
              return (
                <Card
                  key={group.id}
                  style={{
                    borderRadius: 16,
                    border: '1px solid rgba(201,164,92,.4)',
                    boxShadow: '0 3px 12px rgba(58,50,39,.07)',
                    background: 'linear-gradient(160deg,#FFFDF7,#FDF6E9)',
                  }}
                  styles={{ body: { padding: isMobile ? 14 : 18 } }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <Space size={6} wrap>
                        <Tag color="gold" style={{ borderRadius: 999, fontWeight: 600 }}>{group.teachingTypeLabel}</Tag>
                        <Tag color="green" style={{ borderRadius: 999 }}>{group.subject}</Tag>
                        {group.grade && <Tag style={{ borderRadius: 999 }}>{group.grade}</Tag>}
                      </Space>
                      <Title level={4} style={{ margin: '8px 0 2px', color: '#2B2110' }}>
                        {group.students.map((student) => student.name).join('、')}
                      </Title>
                      <Text style={{ color: '#9A8E7A', fontSize: 12 }}>
                        {group.name} · 上课地点灵活安排 · 默认{group.defaultMinutes || 60}分钟
                      </Text>
                    </div>
                    {!isMobile && (
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => openCreate(group)}
                        style={{
                          minHeight: 40, borderRadius: 10, flexShrink: 0, fontWeight: 600,
                          background: 'linear-gradient(135deg,#123C35,#0E5E4E)', border: '1px solid rgba(201,164,92,.55)',
                        }}
                      >
                        约新课
                      </Button>
                    )}
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                    marginTop: 14,
                  }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => openCreate(group)}
                      style={{
                        minHeight: 44, borderRadius: 10, fontWeight: 600,
                        background: 'linear-gradient(135deg,#123C35,#0E5E4E)', border: '1px solid rgba(201,164,92,.55)',
                      }}
                    >
                      约个性化课程
                    </Button>
                    <Button
                      icon={<ClockCircleOutlined />}
                      onClick={() => openHistory(group)}
                      style={{ minHeight: 44, borderRadius: 10, fontWeight: 600, color: '#A06E0B', border: '1px solid rgba(201,164,92,.5)' }}
                    >
                      补录历史课次
                    </Button>
                  </div>

                  <div style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg,#FFF9EF,#FDF1DE)',
                    border: '1px solid rgba(232,120,74,.18)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 8,
                      paddingBottom: 10,
                      marginBottom: 2,
                      borderBottom: '1px solid rgba(201,164,92,.3)',
                    }}>
                      <div>
                        <Text style={{ display: 'block', color: 'var(--color-ink-subtle)', fontSize: 12 }}>已审核授课</Text>
                        <Text strong style={{ color: 'var(--color-success)' }}>{group.approvedHours.toFixed(2)}小时</Text>
                      </div>
                      <div>
                        <Text style={{ display: 'block', color: 'var(--color-ink-subtle)', fontSize: 12 }}>待管理员审核</Text>
                        <Text strong style={{ color: 'var(--color-warning-text)' }}>{group.pendingHours.toFixed(2)}小时</Text>
                      </div>
                    </div>
                    {group.students.map((student) => (
                      <div key={student.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                        <div style={{ minWidth: 0 }}>
                          <Text strong>{student.name}</Text>
                          {student.grade && <Text style={{ marginLeft: 6, color: 'var(--color-ink-subtle)', fontSize: 12 }}>{student.grade}</Text>}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <Text style={{ display: 'block', color: 'var(--color-success)', fontWeight: 700 }}>
                            已上 {student.approvedHours.toFixed(2)}小时
                          </Text>
                          {student.pendingHours > 0 && (
                            <Text style={{ display: 'block', color: 'var(--color-warning-text)', fontSize: 12 }}>
                              待审 {student.pendingHours.toFixed(2)}小时
                            </Text>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {reviewLesson && (
                    <div style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 12,
                      background: reviewLesson.intensiveReviewStatus === 'REJECTED'
                        ? 'var(--color-error-bg, #fcebeb)'
                        : 'var(--color-warning-bg, #faeeda)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <Text strong>
                          {dateLabel(reviewLesson.lessonDate)} {reviewLesson.actualMinutes || reviewLesson.latestReview?.actualMinutes || reviewLesson.plannedMinutes || '-'}分钟
                        </Text>
                        <Tag color={reviewLesson.intensiveReviewStatus === 'REJECTED' ? 'red' : 'orange'} style={{ margin: 0, borderRadius: 999 }}>
                          {reviewLesson.intensiveReviewStatus === 'REJECTED' ? '审核已驳回' : '等待管理员审核'}
                        </Tag>
                      </div>
                      {reviewLesson.intensiveReviewStatus === 'REJECTED' && (
                        <>
                          {reviewLesson.latestReview?.reviewNote && (
                            <Text style={{ display: 'block', marginTop: 6, color: 'var(--color-error)', overflowWrap: 'anywhere' }}>
                              原因：{reviewLesson.latestReview.reviewNote}
                            </Text>
                          )}
                          <Button
                            onClick={() => router.push(`/teacher/attendance?lessonId=${reviewLesson.id}`)}
                            style={{ marginTop: 10, minHeight: 40, borderRadius: 10 }}
                          >
                            修改考勤并重新提交
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  <div style={{ marginTop: 12, borderTop: '1px solid var(--color-hairline)', paddingTop: 12 }}>
                    {nextLesson ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-ink)' }}>
                          <ClockCircleOutlined style={{ color: 'var(--color-success)' }} />
                          <Text strong>{dateLabel(nextLesson.lessonDate)} {nextLesson.startTime}-{nextLesson.endTime}</Text>
                          <Tag style={{ marginLeft: 'auto', borderRadius: 999 }}>{statusLabel(nextLesson)}</Tag>
                        </div>
                        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {nextLesson.canEdit && (
                            <>
                              <Button icon={<EditOutlined />} onClick={() => openEdit(group, nextLesson)} style={{ minHeight: 40, borderRadius: 10 }}>
                                调整时间
                              </Button>
                              <Button danger onClick={() => cancelLesson(nextLesson)} style={{ minHeight: 40, borderRadius: 10 }}>
                                取消本次
                              </Button>
                            </>
                          )}
                          {localDateInput() === nextLesson.lessonDate.slice(0, 10) && (
                            <Button type="primary" onClick={() => router.push('/teacher/attendance')} style={{ minHeight: 40, borderRadius: 10 }}>
                              去考勤
                            </Button>
                          )}
                        </div>
                      </>
                    ) : (
                      <Text style={{ color: 'var(--color-ink-subtle)' }}>暂无后续安排，可由你自主确定下一次上课时间。</Text>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Drawer
        title={scheduleMode === 'edit'
          ? '调整上课时间'
          : scheduleMode === 'history'
            ? '补录历史课次'
            : '预约个性化课程'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        placement={isMobile ? 'bottom' : 'right'}
        height={isMobile ? '88dvh' : undefined}
        width={isMobile ? '100%' : 440}
        styles={{
          body: { padding: isMobile ? 12 : 20 },
          footer: { padding: isMobile ? '10px 12px calc(10px + env(safe-area-inset-bottom))' : 16 },
        }}
        footer={(
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Button onClick={() => setDrawerOpen(false)} style={{ minHeight: 46, borderRadius: 10 }}>取消</Button>
            <Button type="primary" loading={saving} onClick={saveSchedule} style={{ minHeight: 46, borderRadius: 10 }}>
              {scheduleMode === 'edit' ? '保存调整' : scheduleMode === 'history' ? '确认补录' : '确认预约'}
            </Button>
          </div>
        )}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Alert
            type={scheduleMode === 'history' || draft.lessonDate < localDateInput() ? 'warning' : 'info'}
            showIcon
            message={scheduleMode === 'history' || draft.lessonDate < localDateInput()
              ? '这是历史补录：建立课次后还需填写实际时长和考勤，管理员审核通过后才累计课时和工资。'
              : scheduleMode === 'edit'
                ? '保存后会同步更新管理端约课记录。课程完成并提交考勤和实际时长后，才进入管理员审核与课时、工资结算。'
                : '预约提交后会列入管理端约课记录。课程完成并提交考勤和实际时长后，才进入管理员审核；审核通过后结算学生课时与教师工资。'}
          />

          <div>
            <Text strong>学生与授课学科</Text>
            <AdaptiveSelect
              disabled={Boolean(draft.lessonId)}
              value={draft.scopeId || undefined}
              onChange={selectScope}
              options={groups.map((group) => ({
                value: group.id,
                label: `${group.students.map((student) => student.name).join('、')} · ${group.subject} · ${group.teachingTypeLabel}`,
              }))}
              virtual={false}
              listHeight={260}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
              style={{ width: '100%', marginTop: 6 }}
              placeholder="选择本次授课的学生和学科"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
            <div>
              <Text strong>上课日期</Text>
              <Input
                type="date"
                value={draft.lessonDate}
                min={localDateInput(new Date(pageOpenedAt - 365 * 86400000))}
                onChange={(event) => setDraft((current) => ({ ...current, lessonDate: event.target.value }))}
                style={{ marginTop: 6, minHeight: 44 }}
              />
              {!draft.lessonId && (
                <Space size={6} style={{ marginTop: 8 }}>
                  <Button size="small" onClick={() => setDraft((current) => ({ ...current, lessonDate: localDateInput() }))}>
                    今天
                  </Button>
                  <Button
                    size="small"
                    onClick={() => setDraft((current) => ({
                      ...current,
                      lessonDate: localDateInput(new Date(pageOpenedAt - 86400000)),
                    }))}
                  >
                    昨天
                  </Button>
                </Space>
              )}
            </div>
            <div>
              <Text strong>班型</Text>
              <Input value={selectedGroup?.teachingTypeLabel || ''} readOnly style={{ marginTop: 6, minHeight: 44 }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <Text strong>开始时间</Text>
              <Input
                type="time"
                value={draft.startTime}
                onChange={(event) => setDraft((current) => ({ ...current, startTime: event.target.value }))}
                style={{ marginTop: 6, minHeight: 44 }}
              />
            </div>
            <div>
              <Text strong>结束时间</Text>
              <Input
                type="time"
                value={draft.endTime}
                onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))}
                style={{ marginTop: 6, minHeight: 44 }}
              />
            </div>
          </div>

          {/* 时长辅助：人性化快速调整 */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
            padding: '10px 12px', borderRadius: 10,
            background: 'linear-gradient(135deg,#FFF9EF,#FDF1DE)',
            border: '1px solid rgba(232,120,74,.25)',
          }}>
            <Text strong style={{ fontSize: 12, color: '#8A5B00' }}>本次时长</Text>
            <Tag color="gold" style={{ borderRadius: 999, margin: 0, fontWeight: 700 }}>
              {durationMin ? `${durationMin} 分钟` : '请选择时间'}
            </Tag>
            <Space size={4} wrap>
              {[30, 60, 90, 120].map((minutes) => (
                <Button
                  key={minutes}
                  size="small"
                  onClick={() => shiftEndTime(minutes)}
                  style={{ borderRadius: 999, fontSize: 11 }}
                >
                  {minutes}分钟
                </Button>
              ))}
            </Space>
            <Text style={{ color: '#B07A3C', fontSize: 11, width: '100%' }}>
              若学生提前结束（如原报2小时、实际只上1小时），按实际结束时间调整即可，管理员会按审核通过的时长结算。
            </Text>
          </div>

          <div>
            <Text strong>上课学生</Text>
            <AdaptiveSelect
              mode="multiple"
              disabled={Boolean(draft.lessonId)}
              value={draft.studentIds}
              maxCount={selectedGroup ? expectedStudents(selectedGroup.teachingType) : 1}
              onChange={(studentIds) => setDraft((current) => ({ ...current, studentIds }))}
              options={(selectedGroup?.students || []).map((student) => ({
                label: `${student.name}（已审核${student.approvedHours.toFixed(2)}小时）`,
                value: student.id,
              }))}
              virtual={false}
              listHeight={220}
              getPopupContainer={(trigger) => trigger.parentElement || document.body}
              style={{ width: '100%', marginTop: 6 }}
              placeholder="选择本次上课学生"
            />
            <Text style={{ display: 'block', marginTop: 5, color: 'var(--color-ink-subtle)', fontSize: 12 }}>
              {selectedGroup
                ? selectedGroup.teachingType === 'ONE_ON_ONE'
                  ? '一对一课程每次选择1名学生。'
                  : `该课程在管理端配置为${selectedGroup.teachingTypeLabel}，每次需要${expectedStudents(selectedGroup.teachingType)}名学生共同上课。若实际应分开授课，请管理员拆分为独立的一对一课程。`
                : ''}
            </Text>
          </div>

          <div>
            <Text strong>
              {draft.lessonDate < localDateInput() ? '补录说明（必填）' : '备注（可选）'}
            </Text>
            <Input.TextArea
              value={draft.note}
              onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
              rows={3}
              maxLength={500}
              showCount
              placeholder={draft.lessonDate < localDateInput()
                ? '例如：补录7月20日数学一对一课程，家长已确认上课时间'
                : '例如：家长确认临时调整时间'}
              style={{ marginTop: 6, resize: 'none' }}
            />
          </div>

          <Card styles={{ body: { padding: 14 } }} style={{ borderRadius: 12, background: 'var(--color-primary-bg)' }}>
            <Text style={{ color: 'var(--color-ink-muted)', lineHeight: 1.8 }}>
              个性化课程不锁定教室，可按当天实际空位上课。系统只检查同一天的教师和学生时间；不同日期的相同时段不会冲突。提交考勤后先进入管理员审核，审核通过才累计授课时长、处理学生课时并生成一份教师工资。
            </Text>
          </Card>
        </Space>
      </Drawer>
    </div>
  )
}
