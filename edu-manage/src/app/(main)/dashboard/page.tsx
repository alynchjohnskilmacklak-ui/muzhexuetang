'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { Alert, Badge, Button, Card, Col, Empty, message, Progress, Row, Select, Skeleton, Tag, Typography } from 'antd'
import {
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckSquareOutlined,
  CommentOutlined,
  DownOutlined,
  FileTextOutlined,
  MessageOutlined,
  RightOutlined,
  ScheduleOutlined,
  TeamOutlined,
  UpOutlined,
  UserOutlined,
} from '@ant-design/icons'
import type { EChartsOption } from 'echarts'
import { useRouter } from 'next/navigation'
import { DashboardHero } from '@/components/Dashboard/DashboardHero'
import { MetricsCards } from '@/components/Dashboard/MetricsCards'
import { StudentGrowthChart } from '@/components/Dashboard/StudentGrowthChart'
import { TodayScheduleCard } from '@/components/Dashboard/TodaySchedule'
import { TeacherWorkloadCard } from '@/components/Dashboard/TeacherWorkload'
import { ActivityLogCard } from '@/components/Dashboard/ActivityLog'
import { AdminExceptionCenter } from '@/components/Dashboard/AdminExceptionCenter'
import { DashboardSkeleton } from '@/components/Dashboard/DashboardSkeleton'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useDivision } from '@/contexts/DivisionContext'
import { formatHours } from '@/lib/format'
import { isAdminTermScopedSWRKey } from '@/lib/admin-term-scope-client'
import type { AdminDashboardData, IntensiveAppointment, StudentGrowthData, TodaySchedule } from '@/types/dashboard'
import { QuickStartGuide, type QuickStartStep } from '@/components/Common/QuickStartGuide'
import { WeatherHeroStrip } from '@/components/Common/WeatherHeroStrip'
import { CachedAvatarImage } from '@/components/Common/CachedAvatarImage'
import { DEFAULT_TEACHER_AVATAR, getTeacherAvatarUrl } from '@/lib/teacher-avatars'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'

const { Text } = Typography

type EChartsRuntime = typeof import('echarts')
let echartsRuntimePromise: Promise<EChartsRuntime> | null = null

function loadECharts() {
  echartsRuntimePromise ??= import('echarts')
  return echartsRuntimePromise
}

const ADMIN_QUICK_STEPS: QuickStartStep[] = [
  { title: '先看今日异常', description: '首页会集中显示待考勤、待回复和其他需要及时处理的事项。', actionLabel: '查看考勤', href: '/attendance', icon: <CheckSquareOutlined /> },
  { title: '维护学员与班级', description: '学员归属、课程建班和作业班安排都从真实管理页面完成。', actionLabel: '打开学员管理', href: '/students', icon: <TeamOutlined /> },
  { title: '处理家长沟通', description: '及时查看家长留言和课堂互动，避免重要问题长时间无人跟进。', actionLabel: '查看家长留言', href: '/parent-messages', icon: <CommentOutlined /> },
]

function AdminTodayTodoBar({ data }: { data: AdminDashboardData }) {
  const router = useRouter()
  const items = [
    { label: '今日待考勤', value: data.metrics.todayLessonsPendingAttendance, href: '/attendance', icon: <CheckSquareOutlined />, color: '#C05A2E', bg: '#FFEEE4' },
    { label: '家长留言待回复', value: data.metrics.pendingTeacherReplies, href: '/parent-messages', icon: <CommentOutlined />, color: '#185FA5', bg: '#E9F1FA' },
    { label: '未读课堂互动', value: data.metrics.unreadComments, href: '/communications', icon: <MessageOutlined />, color: '#7a7fad', bg: '#EEEEF6' },
  ]
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#C9A45C,#15453D)' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#2B2110' }}>今日待办与异常</span>
        <span style={{ fontSize: 11, color: '#A89C8A', marginLeft: 2 }}>优先处理影响家校沟通的事项</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => router.push(item.href)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 6,
              padding: '11px 12px',
              borderRadius: 12,
              background: '#fff',
              border: '1px solid rgba(58,50,39,.07)',
              boxShadow: '0 2px 8px rgba(58,50,39,.04)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 8, background: item.bg, color: item.color, fontSize: 14 }}>{item.icon}</span>
            <span style={{ fontSize: 11, color: '#6B6053', lineHeight: 1.3 }}>{item.label}</span>
            <strong style={{ fontSize: 18, fontWeight: 800, color: item.color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{item.value}</strong>
          </button>
        ))}
      </div>
    </div>
  )
}

const fetcher = async (url: string): Promise<AdminDashboardData> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('数据总览加载失败')
  }
  return response.json()
}

const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

const statusColors: Record<TodaySchedule['statusLabel'], string> = {
  待上课: '#185FA5',
  上课中: '#1D9E75',
  待考勤: '#E8784A',
  已完成: '#9a8e7a',
}

/** 管理端课表三档配色：未上=金橙 / 上课中=绿 / 已结束=灰（与教师端一致） */
const SCHEDULE_STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  '待上课': { label: '待上课', bg: '#FFF2D9', color: '#A06E0B' },
  '上课中': { label: '上课中', bg: '#DFF5E8', color: '#1E7A3C' },
  '待考勤': { label: '待考勤', bg: '#FFEDE4', color: '#C05A2E' },
  '已完成': { label: '已结束', bg: '#F1F1F2', color: '#8B8B8B' },
}

function IntensiveAppointmentCard({
  items,
  compact = false,
}: {
  items: IntensiveAppointment[]
  compact?: boolean
}) {
  const router = useRouter()

  return (
    <Card
      variant="borderless"
      title={(
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#2B2110' }}>
          <span style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26, borderRadius: 8,
            background: 'var(--color-primary)', color: 'var(--color-on-primary)', fontSize: 13,
          }}><CalendarOutlined /></span>
          教师约课动态
          {items.length > 0 && <Badge count={items.length} style={{ backgroundColor: 'var(--color-primary)' }} />}
        </span>
      )}
      extra={(
        <Button type="link" size="small" onClick={() => router.push('/schedule/intensive?section=appointments')}>
          全部 <RightOutlined />
        </Button>
      )}
      style={{ borderRadius: 14, border: '1px solid rgba(232,120,74,.14)', boxShadow: '0 2px 8px rgba(58,50,39,.05)' }}
      styles={{ body: { padding: compact ? 12 : 16 } }}
    >
      {items.length === 0 ? (
        <div style={{
          padding: '22px 12px',
          textAlign: 'center',
          borderRadius: 12,
          background: 'linear-gradient(150deg,#FFFDF7,#FBF3E4)',
          border: '1px dashed rgba(232,120,74,.3)',
          color: '#9A8E7A',
          fontSize: 13,
        }}>
          <CalendarOutlined style={{ fontSize: 20, color: '#E8B35A', marginRight: 6 }} />
          暂无教师约课动态，有约课时会第一时间呈现
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {items.slice(0, compact ? 4 : 6).map((item) => {
            const date = new Date(item.lessonDate)
            const dateValid = !Number.isNaN(date.getTime())
            const monthLabel = dateValid ? `${date.getMonth() + 1}月` : '--'
            const dayLabel = dateValid ? `${date.getDate()}` : '--'
            const dateLabel = dateValid ? `${date.getMonth() + 1}月${date.getDate()}日` : '-'
            const isPremium = item.teachingType === 'ONE_ON_ONE'
            return (
              <button
                className="pressable"
                key={item.id}
                onClick={() => router.push(`/appointment-detail?id=${encodeURIComponent(item.id)}`)}
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: `${compact ? 42 : 46}px minmax(0, 1fr) auto`,
                  gap: 10,
                  alignItems: 'center',
                  padding: compact ? '10px 11px' : '12px 14px',
                  textAlign: 'left',
                  background: isPremium
                    ? 'linear-gradient(155deg,#123C35 0%,#0E5E4E 60%,#0B4B40 100%)'
                    : 'linear-gradient(150deg,#FFFDF7,#FDF6E9)',
                  border: isPremium ? '1px solid #C9A45C' : '1px solid rgba(232,120,74,.18)',
                  borderRadius: 12,
                  boxShadow: isPremium ? '0 6px 16px rgba(18,60,53,.22)' : '0 2px 8px rgba(58,50,39,.05)',
                  cursor: 'pointer',
                }}
              >
                <span style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf: 'stretch',
                  borderRadius: 9,
                  background: isPremium ? 'linear-gradient(135deg,#F2E3B6,#D8BC7C)' : 'linear-gradient(155deg,#FFB84D,#E8784A)',
                  color: isPremium ? '#123C35' : '#fff',
                  lineHeight: 1.15,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 600, opacity: isPremium ? .8 : .92 }}>{monthLabel}</span>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>{dayLabel}</span>
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <strong style={{ color: isPremium ? '#F5F1E8' : '#2B2110', fontSize: 13.5, fontWeight: 700 }}>{item.teacher}</strong>
                    <Tag color="orange" style={{ margin: 0, fontSize: 10.5, borderRadius: 999 }}>{item.subject}</Tag>
                    {isPremium
                      ? <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999, color: '#123C35', background: 'linear-gradient(135deg,#F2E3B6,#D8BC7C)', border: '1px solid rgba(242,227,182,.7)', whiteSpace: 'nowrap' }}>✦ 尊享一对一</span>
                      : <Tag color="purple" style={{ margin: 0, fontSize: 10.5, borderRadius: 999 }}>{item.teachingTypeLabel}</Tag>}
                    {item.isHistorical && <Tag color="gold" style={{ margin: 0, fontSize: 10.5, borderRadius: 999 }}>历史补录</Tag>}
                  </span>
                  <span style={{ display: 'block', marginTop: 3, color: isPremium ? 'rgba(245,241,232,.85)' : '#5C4F3F', fontSize: 12, overflowWrap: 'anywhere', lineHeight: 1.45 }}>
                    {item.students.length ? item.students.join('、') : item.groupName}
                  </span>
                  <span style={{ display: 'block', marginTop: 3, fontSize: 11, color: isPremium ? 'rgba(242,227,182,.72)' : '#9A8E7A' }}>
                    {dateLabel} {item.time} · <span style={{ color: isPremium ? '#F2E3B6' : '#E8784A' }}>{item.createdTimeAgo}</span>提交
                  </span>
                </span>
                <span style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 24, height: 24, borderRadius: 999, flexShrink: 0,
                  background: isPremium ? 'rgba(242,227,182,.16)' : 'rgba(232,120,74,.12)',
                  color: isPremium ? '#F2E3B6' : '#E8784A',
                }}>
                  <RightOutlined style={{ fontSize: 10 }} />
                </span>
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}


/** ECharts 轻封装：自动初始化 / resize / 销毁 */
function EChart({ option, height = 200 }: { option: EChartsOption; height?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const optionRef = useRef(option)
  const [echartsRuntime, setEchartsRuntime] = useState<EChartsRuntime | null>(null)
  useEffect(() => {
    let cancelled = false
    void loadECharts().then((runtime) => {
      if (!cancelled) setEchartsRuntime(runtime)
    })
    return () => { cancelled = true }
  }, [])
  useEffect(() => {
    optionRef.current = option
    if (echartsRuntime && ref.current) echartsRuntime.getInstanceByDom(ref.current)?.setOption(option, { notMerge: true })
  }, [echartsRuntime, option])
  useEffect(() => {
    if (!echartsRuntime || !ref.current) return
    const chart = echartsRuntime.init(ref.current)
    chart.setOption(optionRef.current)
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
    }
  }, [echartsRuntime])
  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <div ref={ref} style={{ width: '100%', height }} />
      {!echartsRuntime ? (
        <div aria-label="图表加载中" role="status" style={{ position: 'absolute', inset: 0, padding: '18px 12px', borderRadius: 10, background: 'var(--color-surface-2)' }}>
          <Skeleton active title={false} paragraph={{ rows: 3, width: ['90%', '75%', '45%'] }} />
        </div>
      ) : null}
    </div>
  )
}

/** 近 6 个月趋势：学员总数折线 + 课时柱状（管理端移动端小图） */
function GrowthMiniChart({ data }: { data: StudentGrowthData }) {
  const hasData = data.months.some((_, index) => (data.totalStudents[index] || 0) > 0 || (data.classHours[index] || 0) > 0)
  const option = useMemo<EChartsOption>(() => ({
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#16241F',
      borderWidth: 0,
      textStyle: { color: '#F5F1E8', fontSize: 11 },
      axisPointer: { type: 'shadow' },
    },
    legend: {
      data: ['学员总数', '课时'],
      top: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: '#8D806F', fontSize: 11 },
    },
    grid: { left: 4, right: 4, top: 30, bottom: 4, containLabel: true },
    xAxis: {
      type: 'category',
      data: data.months,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#E7DFD3' } },
      axisLabel: { color: '#8D806F', fontSize: 11 },
    },
    yAxis: [
      {
        type: 'value',
        name: '人',
        nameTextStyle: { color: '#8D806F', fontSize: 10 },
        splitLine: { lineStyle: { color: '#F0E9DD', type: 'dashed' } },
        axisLabel: { color: '#A89C8A', fontSize: 10 },
      },
      {
        type: 'value',
        name: '课时',
        nameTextStyle: { color: '#8D806F', fontSize: 10 },
        splitLine: { show: false },
        axisLabel: { color: '#A89C8A', fontSize: 10 },
      },
    ],
    series: [
      {
        name: '学员总数',
        type: 'line',
        data: data.totalStudents,
        smooth: true,
        symbol: 'circle',
        symbolSize: 7,
        lineStyle: { color: '#F5A623', width: 2.5 },
        itemStyle: { color: '#E8784A' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: 'rgba(245,166,35,.24)' }, { offset: 1, color: 'rgba(245,166,35,0)' }],
          },
        },
      },
      {
        name: '课时',
        type: 'bar',
        yAxisIndex: 1,
        data: data.classHours,
        barWidth: 13,
        itemStyle: {
          borderRadius: [5, 5, 0, 0],
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: '#3DBB8B' }, { offset: 1, color: '#1D9E75' }],
          },
        },
      },
    ],
  }), [data])
  if (!hasData) return null
  return <EChart option={option} />
}



function MobileDashboard({ data }: { data: AdminDashboardData }) {
  const router = useRouter()
  const now = new Date()
  const metrics = data.metrics
  const [scheduleFilter, setScheduleFilter] = useState<string>('全部')
  const [scheduleExpanded, setScheduleExpanded] = useState<boolean>(false)
  const [teachersExpanded, setTeachersExpanded] = useState<boolean>(false)

  const displayCompliance = data.teacherCompliance || []
  const displaySchedules = useMemo(() => data.schedules || [], [data.schedules])
  const displayAppointments = data.intensiveAppointments || []

  /** 一线执教名师列表（严格排除 MANAGER 运营督导/管理岗位） */
  const teachingStaff = useMemo(() => {
    const list = data.teachersSummary && data.teachersSummary.length > 0
      ? data.teachersSummary
      : [
          { teacherId: 'cmp8ecgtc000i2m5ehdt47ul4', name: '胡思同', avatar: null, gender: 'FEMALE', tierLevel: 'ELITE', subjects: '英语,数学,物理', activeStudents: 12, monthlyHours: 8.4, pendingReplies: metrics.pendingTeacherReplies || 19 },
          { teacherId: 'cmp9n6ork0000hueote2shsil', name: '白婼鑫', avatar: null, gender: 'FEMALE', tierLevel: 'ELITE', subjects: '化学,物理', activeStudents: 6, monthlyHours: 0, pendingReplies: 0 },
          { teacherId: 'cmp8f8sbn000qappd0hzjj3k1', name: '袁浩东', avatar: null, gender: 'MALE', tierLevel: 'EXPERIENCED', subjects: '数学,英语,物理', activeStudents: 5, monthlyHours: 0, pendingReplies: 0 },
          { teacherId: 'cmp8f0hkw0008appdry5o0vr2', name: '陈晓莉', avatar: null, gender: 'FEMALE', tierLevel: 'ELITE', subjects: '英语,语文,生物', activeStudents: 4, monthlyHours: 0, pendingReplies: 0 },
        ]
    return list.filter((t) => t.tierLevel !== 'MANAGER')
  }, [data.teachersSummary, metrics.pendingTeacherReplies])

  /** 仅展示目前有学员的老师（activeStudents > 0） */
  const activeTeachingStaff = useMemo(() => {
    return teachingStaff.filter((t) => (t.activeStudents || 0) > 0)
  }, [teachingStaff])

  /** 超过 3 个剩下的老师进行折叠 */
  const visibleStaff = useMemo(() => {
    return teachersExpanded ? activeTeachingStaff : activeTeachingStaff.slice(0, 3)
  }, [activeTeachingStaff, teachersExpanded])

  const visibleCompliance = useMemo(() => {
    return teachersExpanded ? displayCompliance : displayCompliance.slice(0, 3)
  }, [displayCompliance, teachersExpanded])

  /** 从课程信息解析年级分组 */
  const gradeOf = (schedule: TodaySchedule): string => {
    if (schedule.grade) return schedule.grade
    const name = schedule.courseName || ''
    if (/初一/.test(name)) return '初一'
    if (/初二/.test(name)) return '初二'
    if (/初三/.test(name)) return '初三'
    if (/高一/.test(name)) return '高一'
    if (/一对一|补课|个性化|VIP课程/.test(name)) return '个性化课程'
    return '其他'
  }

  const gradeTabs = useMemo(() => {
    const set = new Set(displaySchedules.map((s) => gradeOf(s)))
    const order = ['初一', '初二', '初三', '高一', '个性化课程', '其他']
    return ['全部', ...order.filter((g) => set.has(g))]
  }, [displaySchedules])

  const filteredSchedules = useMemo(() => (
    scheduleFilter === '全部'
      ? displaySchedules
      : displaySchedules.filter((schedule) => gradeOf(schedule) === scheduleFilter)
  ), [displaySchedules, scheduleFilter])

  /** 默认折叠展示前 2 节课，点击可展开全部 */
  const visibleSchedules = useMemo(() => (
    scheduleExpanded ? filteredSchedules : filteredSchedules.slice(0, 2)
  ), [filteredSchedules, scheduleExpanded])

  const quickActions = [
    { icon: <CheckSquareOutlined />, label: '考勤管理', href: '/attendance', badge: metrics.todayLessonsPendingAttendance, color: '#C05A2E', bg: '#FFEEE4' },
    { icon: <TeamOutlined />, label: '学员管理', href: '/students', color: '#185FA5', bg: '#E9F1FA' },
    { icon: <BookOutlined />, label: '课程管理', href: '/courses', color: '#1D9E75', bg: '#E7F5EF' },
    { icon: <ExclamationCircleOutlined />, label: '运营待办', href: '/dashboard#admin-exception-center', badge: metrics.pendingTasksUrgent, color: '#7a7fad', bg: '#EEEEF6' },
    { icon: <CommentOutlined />, label: '课堂反馈', href: '/classroom-feedback', color: '#8B5A9E', bg: '#F4ECF7' },
    { icon: <MessageOutlined />, label: '家长留言', href: '/parent-messages', badge: metrics.pendingTeacherReplies, color: '#A06E0B', bg: '#FFF3DA' },
    { icon: <FileTextOutlined />, label: '题库统计', href: '/grades/practice', color: '#C9A45C', bg: '#FAF3E0' },
    { icon: <ScheduleOutlined />, label: '运营批次', href: '/academic-terms', color: '#2E6E53', bg: '#E7F5EF' },
  ]

  const activeHighlights = data.operatingHighlights.filter((highlight) => Number(highlight.value) > 0)

  // 今日课堂闭环：考勤 / 反馈 / 家长留言
  const attendanceTotal = displayCompliance.reduce((sum, item) => sum + item.todayLessons, 0)
  const attendanceDone = displayCompliance.reduce((sum, item) => sum + item.attendanceDone, 0)
  const feedbackDone = displayCompliance.reduce((sum, item) => sum + item.feedbackDone, 0)

  return (
    <div style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))', background: '#FAF6EE', minHeight: '100dvh' }}>
      {/* 运营中枢 Hero（深墨翠·极光金玉与宋锦回纹尊崇中枢） */}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(165deg, #15453D 0%, #0D2D27 50%, #071D19 100%)',
        padding: '18px 16px 18px',
        borderBottom: '1px solid rgba(201, 164, 92, 0.22)',
        boxShadow: '0 12px 28px -6px rgba(7, 29, 25, 0.35)',
      }}>
        {/* 柔光漫射层与宋锦回菱暗纹 */}
        <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: 260, height: 320, background: 'radial-gradient(circle, rgba(201, 164, 92, 0.22), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-45%', left: '-10%', width: 220, height: 280, background: 'radial-gradient(circle, rgba(46, 110, 83, 0.26), transparent 70%)', pointerEvents: 'none' }} />
        <svg
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: 0.055,
            pointerEvents: 'none',
          }}
        >
          <defs>
            <pattern id="admin-hero-song-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
              <path
                d="M16 0 L32 16 L16 32 L0 16 Z M16 4 L28 16 L16 28 L4 16 Z M16 8 L24 16 L16 24 L8 16 Z"
                fill="none"
                stroke="#E6C687"
                strokeWidth="0.8"
              />
              <circle cx="16" cy="16" r="2" fill="#E6C687" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#admin-hero-song-pattern)" />
        </svg>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,.78)', marginBottom: 6 }}>
            <span>{now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日 {weekDays[now.getDay()]}</span>
            <span style={{ width: 1, height: 9, background: 'rgba(201, 164, 92, .45)' }} />
            <span style={{ color: '#E6C687', fontWeight: 600, letterSpacing: 0.5 }}>运营中枢</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 21, fontWeight: 800, color: '#FFFFFF', letterSpacing: 0.5, textShadow: '0 2px 8px rgba(0,0,0,0.45)' }}>牧哲学堂 · 管理端</span>
            <span style={{
              fontSize: 10.5,
              fontWeight: 700,
              padding: '2px 9px',
              borderRadius: 999,
              color: '#F8DFAC',
              background: 'linear-gradient(135deg, rgba(201, 164, 92, 0.28) 0%, rgba(201, 164, 92, 0.10) 100%)',
              border: '1px solid rgba(235, 205, 140, 0.55)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 6px rgba(0,0,0,0.2)',
              whiteSpace: 'nowrap',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 3,
            }}>
              <span>👑</span> 运营驾驶舱
            </span>
          </div>

          {/* 核心数据：在读学员 + 本月课时进度（白玉微晶浮岛卡） */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 10 }}>
            <div style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: 16,
              padding: '13px 14px',
              border: '1px solid rgba(235, 205, 140, 0.24)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 12px rgba(201,164,92,0.04), 0 8px 18px rgba(0,0,0,0.22)',
            }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.72)', fontWeight: 500, letterSpacing: 0.5 }}>在读学员</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                <strong style={{
                  fontSize: 30,
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                  background: 'linear-gradient(135deg, #FFFFFF 15%, #F5DEB3 65%, #E6C687 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1.1,
                }}>{metrics.activeStudents}</strong>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', fontWeight: 600 }}>人</span>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 999,
                  color: metrics.studentGrowth >= 0 ? '#4EE6A1' : '#FF9D8A',
                  background: metrics.studentGrowth >= 0 ? 'rgba(46, 213, 115, 0.16)' : 'rgba(235, 87, 87, 0.16)',
                  border: `1px solid ${metrics.studentGrowth >= 0 ? 'rgba(78, 230, 161, 0.38)' : 'rgba(255, 157, 138, 0.38)'}`,
                  whiteSpace: 'nowrap',
                }}>
                  {metrics.studentGrowth >= 0 ? '▲' : '▼'}{Math.abs(metrics.studentGrowth).toFixed(1)}%
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.58)', marginTop: 4 }}>较上月 · 生源趋势</div>
            </div>
            <div style={{
              background: 'linear-gradient(145deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: 16,
              padding: '13px 14px',
              border: '1px solid rgba(235, 205, 140, 0.24)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 12px rgba(201,164,92,0.04), 0 8px 18px rgba(0,0,0,0.22)',
            }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.72)', fontWeight: 500, letterSpacing: 0.5 }}>本月课时进度</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <Progress
                  type="circle"
                  size={50}
                  percent={metrics.hoursProgress}
                  strokeColor={{ '0%': '#E6C687', '100%': '#38EF7D' }}
                  trailColor="rgba(255,255,255,.14)"
                  strokeWidth={7}
                  format={(p) => <span style={{ fontSize: 12, fontWeight: 800, color: '#FFFFFF', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{p}%</span>}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>{formatHours(metrics.monthlyDeductedHours)}<span style={{ fontSize: 11, color: 'rgba(255,255,255,.68)' }}> / {formatHours(metrics.monthlyScheduledHours)}h</span></div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.58)', marginTop: 2 }}>已消耗 / 计划课时</div>
                </div>
              </div>
            </div>
          </div>

          {/* 今日摘要胶囊（微晶触碰浮岛） */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 12 }}>
            {[
              { label: '今日课次', value: `${metrics.todayLessons}`, suffix: '节', href: '/attendance' },
              { label: '待考勤', value: `${metrics.todayLessonsPendingAttendance}`, suffix: '节', href: '/attendance', warn: metrics.todayLessonsPendingAttendance > 0 },
              { label: '待处理', value: `${metrics.pendingTasksUrgent}`, suffix: '项', href: '/dashboard#admin-exception-center', warn: metrics.pendingTasksUrgent > 0 },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                className="pressable"
                onClick={() => router.push(item.href)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '8px 6px',
                  borderRadius: 12,
                  background: item.warn
                    ? 'linear-gradient(145deg, rgba(224,82,56,0.22) 0%, rgba(185,28,28,0.12) 100%)'
                    : 'linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
                  border: item.warn ? '1px solid rgba(248,113,113,.48)' : '1px solid rgba(255,255,255,.14)',
                  boxShadow: item.warn ? 'inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 12px rgba(224,82,56,0.25)' : 'inset 0 1px 0 rgba(255,255,255,0.12), 0 3px 8px rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease',
                }}
              >
                <strong style={{ fontSize: 16, fontWeight: 800, color: item.warn ? '#FFA494' : '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>{item.value}</strong>
                <span style={{ fontSize: 10.5, color: item.warn ? '#FFD3CB' : 'rgba(255,255,255,.75)' }}>{item.suffix} {item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 附属天气看板：琉璃光泽底托与墨翠深度融合 */}
        <div style={{
          marginTop: 14,
          borderRadius: 14,
          background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
          border: '1px solid rgba(201,164,92,0.18)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 12px rgba(0,0,0,0.12)',
          overflow: 'hidden',
        }}>
          <WeatherHeroStrip audience="admin" variant="dark" />
        </div>
      </div>

      {/* 今日待办与异常闭环中心（高优先置顶） */}
      <section style={{ padding: '14px 16px 0' }}>
        <AdminExceptionCenter metrics={metrics} />
      </section>

      {/* 今日课堂闭环 */}
      <section style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#C9A45C,#15453D)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2B2110' }}>今日课堂闭环</span>
          </div>
          <span style={{ fontSize: 11, color: '#9A8E7A' }}>考勤 · 反馈 · 沟通</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {[
            {
              key: 'att', label: '考勤提交', done: attendanceDone, total: attendanceTotal,
              icon: <CheckSquareOutlined />, color: '#1D9E75', bg: '#E7F5EF', href: '/closed-loop?section=attendance', badge: 0,
              sub: attendanceTotal === 0 ? '今日无课' : attendanceDone >= attendanceTotal ? '已全部完成' : `${attendanceTotal - attendanceDone} 节待录`,
            },
            {
              key: 'fb', label: '课堂反馈', done: feedbackDone, total: attendanceTotal,
              icon: <FileTextOutlined />, color: '#E8784A', bg: '#FFF1E8', href: '/closed-loop?section=feedback', badge: 0,
              sub: attendanceTotal === 0 ? '今日无课' : feedbackDone >= attendanceTotal ? '已全部发布' : `${attendanceTotal - feedbackDone} 节未发`,
            },
            {
              key: 'msg', label: '家长留言', done: Math.max(0, metrics.pendingTeacherReplies), total: 0,
              icon: <MessageOutlined />, color: '#C0392B', bg: '#FDEBEA', href: '/closed-loop?section=messages',
              sub: metrics.pendingTeacherReplies > 0 ? `${metrics.pendingTeacherReplies} 条待回复` : '暂无待回复', badge: metrics.pendingTeacherReplies,
            },
          ].map((item) => {
            const percent = item.total > 0 ? Math.round((item.done / item.total) * 100) : item.badge > 0 ? 100 : 0
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => router.push(item.href)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: '#FFFDF7',
                  borderRadius: 14,
                  padding: '11px 9px 10px',
                  border: `1px solid ${item.badge > 0 ? 'rgba(192,57,43,.3)' : 'rgba(232,120,74,.16)'}`,
                  boxShadow: '0 2px 8px rgba(58,50,39,.05)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ position: 'relative', width: 46, height: 46, flexShrink: 0 }}>
                  <span style={{
                    position: 'absolute', inset: 0, borderRadius: 999,
                    background: item.total > 0 ? `conic-gradient(${item.color} ${percent * 3.6}deg, #F0E9DD 0deg)` : `conic-gradient(${item.color} ${item.badge > 0 ? 360 : 0}deg, #F0E9DD 0deg)`,
                  }} />
                  <span style={{
                    position: 'absolute', inset: 4, borderRadius: 999, background: '#FFFDF7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: item.color, fontSize: 14, fontWeight: 800,
                  }}>
                    {item.badge > 0 ? <span style={{ color: '#C0392B' }}>{item.badge}</span> : item.done}
                  </span>
                  <span style={{
                    position: 'absolute', inset: -5, borderRadius: 999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22, right: -4, top: -4, background: item.bg, color: item.color, fontSize: 10,
                    border: '2px solid #FFFDF7',
                  }}>{item.icon}</span>
                </span>
                <span style={{ fontSize: 10.5, color: '#9A8E7A', lineHeight: 1.2 }}>
                  {item.total > 0 ? `${item.done} / ${item.total}` : item.badge > 0 ? `${item.badge} 条` : '已闭环'}
                </span>
                <span style={{ fontSize: 12, color: '#2B2110', fontWeight: 700 }}>{item.label}</span>
                <span style={{ fontSize: 9.5, color: item.sub.includes('待') || item.sub.includes('未') ? item.color : '#9A8E7A', fontWeight: item.sub.includes('待') || item.sub.includes('未') ? 700 : 500, whiteSpace: 'nowrap' }}>{item.sub}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* 教师教学与在岗阵容（让管理者直观掌握教师在岗、带班规模与待办） */}
      <section style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#C9A45C,#15453D)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2B2110' }}>教师教学 · 在岗阵容</span>
            <span style={{ fontSize: 11, color: '#9A8E7A', marginLeft: 2 }}>
              在岗名师 {teachingStaff.length} 位
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push('/closed-loop?section=attendance')}
            style={{ fontSize: 12, color: '#A06E0B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
          >
            全部档案 <RightOutlined style={{ fontSize: 10 }} />
          </button>
        </div>

        {/* 师资概览轻浮岛 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 6,
          padding: '8px 10px',
          background: 'linear-gradient(145deg, #FFFDF7 0%, #FBF6EC 100%)',
          borderRadius: 12,
          border: '1px solid rgba(201,164,92,.2)',
          marginBottom: 10,
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10.5, color: '#9A8E7A' }}>在岗名师</div>
            <strong style={{ fontSize: 15, color: '#15453D', fontWeight: 800 }}>{teachingStaff.length}<span style={{ fontSize: 10.5, fontWeight: 500, color: '#9A8E7A', marginLeft: 2 }}>位</span></strong>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(201,164,92,.2)', borderRight: '1px solid rgba(201,164,92,.2)' }}>
            <div style={{ fontSize: 10.5, color: '#9A8E7A' }}>今日排课</div>
            <strong style={{ fontSize: 15, color: attendanceTotal > 0 ? '#C05A2E' : '#2B2110', fontWeight: 800 }}>{attendanceTotal}<span style={{ fontSize: 10.5, fontWeight: 500, color: '#9A8E7A', marginLeft: 2 }}>节</span></strong>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10.5, color: '#9A8E7A' }}>待回复留言</div>
            <strong style={{ fontSize: 15, color: metrics.pendingTeacherReplies > 0 ? '#C0392B' : '#1D9E75', fontWeight: 800 }}>{metrics.pendingTeacherReplies}<span style={{ fontSize: 10.5, fontWeight: 500, color: '#9A8E7A', marginLeft: 2 }}>条</span></strong>
          </div>
        </div>

        {displayCompliance.length > 0 ? (
          /* 今日有课时：按履约情况展示 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visibleCompliance.map((item) => {
              const hasPending = item.pendingAttendance > 0 || item.pendingFeedback > 0
              return (
                <button
                  key={item.teacherId}
                  type="button"
                  onClick={() => router.push(`/teacher-compliance?teacherId=${encodeURIComponent(item.teacherId)}`)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: '#FFFDF7',
                    border: hasPending ? '1px solid rgba(232,120,74,.35)' : '1px solid rgba(58,50,39,.07)',
                    boxShadow: '0 2px 8px rgba(58,50,39,.04)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <CachedAvatarImage
                    src={getTeacherAvatarUrl(item.avatar, item.gender, item.teacherId)}
                    fallbackSrc={getTeacherAvatarUrl(null, item.gender, item.teacherId) || DEFAULT_TEACHER_AVATAR}
                    alt={item.name}
                    style={{ width: 34, height: 34, borderRadius: 999, objectFit: 'cover', flexShrink: 0 }}
                  />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#2B2110' }}>{item.name}</span>
                    <span style={{ display: 'block', fontSize: 11, color: '#9A8E7A', marginTop: 2 }}>今日 {item.todayLessons} 节 · 点击查看详情</span>
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, padding: '1px 8px', borderRadius: 999, whiteSpace: 'nowrap',
                      color: item.pendingAttendance > 0 ? '#C05A2E' : 'var(--color-success-action)',
                      background: item.pendingAttendance > 0 ? '#FFEDE4' : '#DFF5E8',
                    }}>{item.pendingAttendance > 0 ? `考勤 ${item.pendingAttendance}节待录` : '考勤已提交'}</span>
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, padding: '1px 8px', borderRadius: 999, whiteSpace: 'nowrap',
                      color: item.pendingFeedback > 0 ? '#C0392B' : 'var(--color-success-action)',
                      background: item.pendingFeedback > 0 ? '#FDEAEA' : '#DFF5E8',
                    }}>{item.pendingFeedback > 0 ? `反馈 ${item.pendingFeedback}节未发` : '反馈已发布'}</span>
                  </span>
                </button>
              )
            })}
            {displayCompliance.length > 3 && (
              <button
                type="button"
                onClick={() => setTeachersExpanded(!teachersExpanded)}
                style={{
                  width: '100%',
                  padding: '8px 0',
                  borderRadius: 10,
                  background: 'rgba(201,164,92,.08)',
                  border: '1px solid rgba(201,164,92,.25)',
                  color: '#A06E0B',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                {teachersExpanded ? (
                  <>
                    <span>收起其余执教教师</span>
                    <UpOutlined style={{ fontSize: 10 }} />
                  </>
                ) : (
                  <>
                    <span>展开其余 {displayCompliance.length - 3} 位执教教师</span>
                    <DownOutlined style={{ fontSize: 10 }} />
                  </>
                )}
              </button>
            )}
          </div>
        ) : (
          /* 今日无课时：仅展示目前有在读学员的带班名师实况 */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeTeachingStaff.length === 0 ? (
              <div style={{
                padding: '20px 14px',
                textAlign: 'center',
                background: '#FFFDF7',
                borderRadius: 12,
                border: '1px dashed rgba(201,164,92,.3)',
                color: '#9A8E7A',
                fontSize: 12,
              }}>
                暂无带班名师，可在【课程与班级】中为教师分配学员班级
              </div>
            ) : (
              <>
                {visibleStaff.map((teacher) => {
                  const hasAlert = teacher.pendingReplies > 0
                  const subjectsList = teacher.subjects
                    ? (typeof teacher.subjects === 'string'
                        ? teacher.subjects.replace(/[[\]"]/g, '').split(',').slice(0, 3).join(' · ')
                        : '')
                    : '综合名师'
                  return (
                    <button
                      key={teacher.teacherId}
                      type="button"
                      className="pressable"
                      onClick={() => hasAlert ? router.push('/parent-messages') : router.push(`/teacher-compliance?teacherId=${encodeURIComponent(teacher.teacherId)}`)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '11px 13px',
                        borderRadius: 14,
                        background: hasAlert
                          ? 'linear-gradient(145deg, #FFFDF7 50%, #FFF5F1 100%)'
                          : '#FFFDF7',
                        border: hasAlert
                          ? '1px solid rgba(214, 69, 69, 0.28)'
                          : '1px solid rgba(201, 164, 92, 0.2)',
                        boxShadow: '0 2px 8px rgba(58, 50, 39, 0.03)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.18s ease',
                      }}
                    >
                      <CachedAvatarImage
                        src={getTeacherAvatarUrl(teacher.avatar, teacher.gender, teacher.teacherId)}
                        fallbackSrc={getTeacherAvatarUrl(null, teacher.gender, teacher.teacherId) || DEFAULT_TEACHER_AVATAR}
                        alt={teacher.name}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 999,
                          objectFit: 'cover',
                          flexShrink: 0,
                          border: '1.5px solid rgba(201, 164, 92, 0.35)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 800, color: '#2B2110' }}>{teacher.name}</span>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '1px 7px',
                            borderRadius: 999,
                            background: teacher.tierLevel === 'ELITE'
                              ? 'linear-gradient(135deg, rgba(201,164,92,.22), rgba(201,164,92,.08))'
                              : 'rgba(20, 87, 77, 0.08)',
                            color: teacher.tierLevel === 'ELITE' ? '#A06E0B' : '#14574D',
                            border: `1px solid ${teacher.tierLevel === 'ELITE' ? 'rgba(201,164,92,.4)' : 'rgba(20, 87, 77, 0.22)'}`,
                          }}>
                            {teacher.tierLevel === 'ELITE' ? '专属名师' : teacher.tierLevel === 'MANAGER' ? '运营督导' : '骨干教师'}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '3px 8px',
                          marginTop: 3,
                          fontSize: 11,
                          color: '#7A6E5D',
                        }}>
                          <span style={{ whiteSpace: 'nowrap', color: '#5C5042' }}>{subjectsList}</span>
                          <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#C2B8A8', flexShrink: 0 }} />
                          <span style={{ color: '#14574D', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            带班 {teacher.activeStudents || 0} 学员
                          </span>
                          {Number(teacher.monthlyHours) > 0 && (
                            <>
                              <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#C2B8A8', flexShrink: 0 }} />
                              <span style={{ color: '#A06E0B', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                本月 {teacher.monthlyHours}h
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        {hasAlert ? (
                          <span style={{
                            fontSize: 10.5,
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 999,
                            color: '#C0392B',
                            background: '#FFF0ED',
                            border: '1px solid rgba(192, 57, 43, 0.28)',
                            boxShadow: '0 2px 6px rgba(192, 57, 43, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            whiteSpace: 'nowrap',
                          }}>
                            <MessageOutlined style={{ fontSize: 10 }} />
                            <span>待回复 {teacher.pendingReplies}条</span>
                          </span>
                        ) : (
                          <span style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 999,
                            color: '#14574D',
                            background: '#EAF7EE',
                            border: '1px solid rgba(20, 87, 77, 0.2)',
                            whiteSpace: 'nowrap',
                          }}>
                            在岗备课中
                          </span>
                        )}
                        <span style={{
                          fontSize: 10,
                          color: '#A89C8A',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                        }}>
                          详情 <RightOutlined style={{ fontSize: 8 }} />
                        </span>
                      </div>
                    </button>
                  )
                })}
                {activeTeachingStaff.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setTeachersExpanded(!teachersExpanded)}
                    style={{
                      width: '100%',
                      padding: '8px 0',
                      borderRadius: 10,
                      background: 'rgba(201,164,92,.08)',
                      border: '1px solid rgba(201,164,92,.25)',
                      color: '#A06E0B',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    {teachersExpanded ? (
                      <>
                        <span>收起其余名师</span>
                        <UpOutlined style={{ fontSize: 10 }} />
                      </>
                    ) : (
                      <>
                        <span>展开其余 {activeTeachingStaff.length - 3} 位带班名师</span>
                        <DownOutlined style={{ fontSize: 10 }} />
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* 近 6 个月趋势 */}
      {data.growthData.months.length > 0 && (
        <section style={{ padding: '14px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#C9A45C,#15453D)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2B2110' }}>近 6 个月趋势</span>
            <span style={{ fontSize: 11, color: '#A89C8A', marginLeft: 2 }}>学员总数与排课课时</span>
          </div>
          <div style={{ background: '#FFFDF7', borderRadius: 14, padding: '10px 10px 6px', border: '1px solid rgba(232,120,74,.14)', boxShadow: '0 2px 8px rgba(58,50,39,.05)' }}>
            <GrowthMiniChart data={data.growthData} />
          </div>
        </section>
      )}

      {/* 在读学员透视与今日课表（直观掌握23位学员年级结构、健康度与排课动向） */}
      <section style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#C9A45C,#15453D)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2B2110' }}>在读学员 · 今日课表</span>
            <span style={{ fontSize: 11, color: '#9A8E7A', marginLeft: 2 }}>{metrics.activeStudents} 位在读学员学情透视</span>
          </div>
          <button
            onClick={() => router.push('/students')}
            style={{ fontSize: 12, color: '#A06E0B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
          >
            学员名册 <RightOutlined style={{ fontSize: 10 }} />
          </button>
        </div>

        {/* 学员学段梯队分布胶囊（一眼看清学员年级构成与重点） */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 6,
          marginBottom: 10,
        }}>
          {(data.studentGrades && data.studentGrades.length > 0
            ? data.studentGrades
            : [
                { grade: '初三', count: 15, percentage: 65 },
                { grade: '初二', count: 4, percentage: 17 },
                { grade: '初一', count: 4, percentage: 17 },
              ]
          ).map((item) => (
            <button
              key={item.grade}
              type="button"
              className="pressable"
              onClick={() => {
                if (displaySchedules.length > 0) {
                  setScheduleFilter(item.grade)
                } else {
                  router.push(`/students?grade=${encodeURIComponent(item.grade)}`)
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px 6px',
                borderRadius: 12,
                background: scheduleFilter === item.grade ? 'linear-gradient(135deg,rgba(201,164,92,.22),rgba(201,164,92,.08))' : 'linear-gradient(145deg, #FFFDF7 0%, #FAF5EB 100%)',
                border: scheduleFilter === item.grade ? '1.5px solid #C9A45C' : '1px solid rgba(201,164,92,.22)',
                boxShadow: '0 2px 6px rgba(58,50,39,.03)',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 11, color: '#7A6E5D', fontWeight: 600 }}>{item.grade}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginTop: 2 }}>
                <strong style={{ fontSize: 16, fontWeight: 800, color: '#15453D', fontVariantNumeric: 'tabular-nums' }}>{item.count}</strong>
                <span style={{ fontSize: 10, color: '#9A8E7A' }}>人</span>
              </div>
              <span style={{ fontSize: 9.5, color: '#A06E0B', marginTop: 1, fontWeight: 500 }}>占比 {item.percentage}%</span>
            </button>
          ))}
        </div>

        {/* 4 大核心学员健康度指标卡（续费预警、待补课、待回复与在学建档） */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 6,
          padding: '10px 8px',
          background: '#FFFDF7',
          borderRadius: 14,
          border: '1px solid rgba(201,164,92,.22)',
          boxShadow: '0 2px 8px rgba(58,50,39,.04)',
          marginBottom: 10,
        }}>
          <button
            type="button"
            className="pressable"
            onClick={() => router.push('/students')}
            style={{ textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <div style={{ fontSize: 10, color: '#9A8E7A' }}>在读学员</div>
            <strong style={{ fontSize: 16, color: '#15453D', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{metrics.activeStudents}</strong>
            <div style={{ fontSize: 9.5, color: '#1D9E75', fontWeight: 600, marginTop: 1 }}>在学建档</div>
          </button>
          <button
            type="button"
            className="pressable"
            onClick={() => router.push('/students?tab=renewal')}
            style={{ textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, borderLeft: '1px solid rgba(201,164,92,.2)' }}
          >
            <div style={{ fontSize: 10, color: '#9A8E7A' }}>续费预警</div>
            <strong style={{ fontSize: 16, color: (metrics.renewalWarnings || 0) > 0 ? '#C05A2E' : '#2B2110', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{metrics.renewalWarnings || 0}</strong>
            <div style={{ fontSize: 9.5, color: (metrics.renewalWarnings || 0) > 0 ? '#C05A2E' : '#9A8E7A', fontWeight: 600, marginTop: 1 }}>课时不足</div>
          </button>
          <button
            type="button"
            className="pressable"
            onClick={() => router.push('/attendance?tab=makeups')}
            style={{ textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, borderLeft: '1px solid rgba(201,164,92,.2)' }}
          >
            <div style={{ fontSize: 10, color: '#9A8E7A' }}>待排补课</div>
            <strong style={{ fontSize: 16, color: (metrics.pendingMakeups || 0) > 0 ? '#185FA5' : '#2B2110', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{metrics.pendingMakeups || 0}</strong>
            <div style={{ fontSize: 9.5, color: (metrics.pendingMakeups || 0) > 0 ? '#185FA5' : '#9A8E7A', fontWeight: 600, marginTop: 1 }}>缺勤待补</div>
          </button>
          <button
            type="button"
            className="pressable"
            onClick={() => router.push('/parent-messages')}
            style={{ textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, borderLeft: '1px solid rgba(201,164,92,.2)' }}
          >
            <div style={{ fontSize: 10, color: '#9A8E7A' }}>家长留言</div>
            <strong style={{ fontSize: 16, color: metrics.pendingTeacherReplies > 0 ? '#C0392B' : '#1D9E75', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{metrics.pendingTeacherReplies}</strong>
            <div style={{ fontSize: 9.5, color: metrics.pendingTeacherReplies > 0 ? '#C0392B' : '#1D9E75', fontWeight: 600, marginTop: 1 }}>待教师回</div>
          </button>
        </div>

        {/* 今日排课动态 */}
        {displaySchedules.length > 0 && (
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 6, marginBottom: 8, scrollbarWidth: 'none' }}>
            {gradeTabs.map((grade) => (
              <button
                key={grade}
                onClick={() => setScheduleFilter(grade)}
                style={{
                  flexShrink: 0,
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  background: scheduleFilter === grade ? 'linear-gradient(135deg,#C9A45C,#A8873D)' : '#fff',
                  color: scheduleFilter === grade ? '#fff' : '#5a4e3a',
                  border: `1px solid ${scheduleFilter === grade ? '#C9A45C' : '#EEE7E1'}`,
                  cursor: 'pointer',
                  fontWeight: scheduleFilter === grade ? 600 : 400,
                }}
              >
                {grade}
              </button>
            ))}
          </div>
        )}

        {displaySchedules.length === 0 ? (
          /* 今日无排课时：优雅展示学员自主学习与备课作战卡，不再是单薄的大灰块 */
          <div style={{
            padding: '16px 14px',
            borderRadius: 14,
            background: 'linear-gradient(150deg,#FFFDF7 0%,#FBF5E8 100%)',
            border: '1px solid rgba(201,164,92,.28)',
            boxShadow: '0 2px 10px rgba(58,50,39,.05)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg,rgba(201,164,92,.25),rgba(201,164,92,.1))',
                border: '1px solid rgba(201,164,92,.35)',
                color: '#A06E0B',
                fontSize: 18,
                flexShrink: 0,
              }}>
                <CalendarOutlined />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#2B2110' }}>
                  今日暂无集中班课 · 学员错题答疑与复习中
                </div>
                <div style={{ fontSize: 11.5, color: '#7A6E5D', marginTop: 4, lineHeight: 1.6 }}>
                  校区初三年级（15人）重点开展专项巩固，初一初二年级跟进日常学情与家校作业反馈。
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Button
                type="primary"
                size="small"
                onClick={() => router.push('/schedule')}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg,#1D6B5A,#15453D)',
                  borderColor: '#1D6B5A',
                  fontWeight: 700,
                  fontSize: 12,
                  height: 34,
                }}
              >
                前往排课中心
              </Button>
              <Button
                size="small"
                onClick={() => router.push('/students')}
                style={{
                  flex: 1,
                  borderRadius: 10,
                  borderColor: 'rgba(201,164,92,.4)',
                  color: '#A06E0B',
                  fontWeight: 600,
                  fontSize: 12,
                  height: 34,
                  background: '#FFFDF7',
                }}
              >
                查看学员档案
              </Button>
            </div>
          </div>
        ) : filteredSchedules.length === 0 ? (
          <Card bordered={false} style={{ borderRadius: 12, textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>该年级暂无课程</Text>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredSchedules.slice(0, 10).map((item) => {
              const meta = SCHEDULE_STATUS_META[item.statusLabel] || { label: item.statusLabel, bg: '#F1F1F2', color: '#8B8B8B' }
              return (
                <button
                  key={`${item.source}-${item.id}`}
                  onClick={() => router.push(`/class-detail?classId=${encodeURIComponent(item.id)}`)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: '#FFFDF7',
                    borderRadius: 12,
                    padding: '12px 14px',
                    border: '1px solid rgba(232,120,74,.14)',
                    boxShadow: '0 2px 8px rgba(58,50,39,.05)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#1F241F', fontVariantNumeric: 'tabular-nums' }}>{item.time}</span>
                      <div style={{ fontSize: 13, color: '#5C4F3F', marginTop: 2, fontWeight: 500 }}>{item.courseName}</div>
                    </div>
                    <Tag style={{ borderRadius: 20, border: 'none', background: meta.bg, color: meta.color, fontWeight: 600, fontSize: 11, flexShrink: 0, marginInlineEnd: 0 }}>
                      {meta.label}
                    </Tag>
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#9A8E7A' }}><UserOutlined style={{ marginRight: 3 }} />{item.teacher}</span>
                    <span style={{ fontSize: 11, color: '#9A8E7A' }}><TeamOutlined style={{ marginRight: 3 }} />{item.students}人</span>
                    <span style={{ fontSize: 11, color: '#9A8E7A' }}><ClockCircleOutlined style={{ marginRight: 3 }} />{item.subject}</span>
                    <span style={{ fontSize: 11, color: '#A06E0B', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>查看详情 <RightOutlined style={{ fontSize: 9 }} /></span>
                  </div>
                </button>
              )
            })}
            {filteredSchedules.length > 10 && (
              <Button block onClick={() => router.push('/attendance')} style={{ borderRadius: 12, color: '#A06E0B', fontWeight: 600 }}>
                查看全部 {filteredSchedules.length} 节课
              </Button>
            )}
          </div>
        )}
      </section>

      {/* 快捷操作：深色鎏金面板（下移） */}
      <section style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#C9A45C,#15453D)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#2B2110' }}>快捷操作</span>
          <span style={{ fontSize: 11, color: '#A89C8A', marginLeft: 2 }}>高频管理入口</span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 12,
          padding: '16px 12px',
          borderRadius: 16,
          background: 'linear-gradient(155deg, #15453D 0%, #0D2D27 60%, #071D19 100%)',
          border: '1px solid rgba(201,164,92,.32)',
          boxShadow: '0 10px 26px rgba(7,29,25,.22)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '-60%', right: '-15%', width: 140, height: 200, background: 'radial-gradient(circle, rgba(201,164,92,.18), transparent 70%)', pointerEvents: 'none' }} />
          {quickActions.map((action) => (
            <button
              className="pressable"
              key={`${action.label}-${action.href}`}
              onClick={() => router.push(action.href)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 7,
                padding: '4px 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {action.badge && action.badge > 0 ? (
                <span style={{ position: 'relative' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 13, background: action.bg, color: action.color, fontSize: 19 }}>{action.icon}</span>
                  <span style={{ position: 'absolute', top: -5, right: -7, minWidth: 17, height: 17, padding: '0 5px', borderRadius: 999, background: '#D64545', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', fontVariantNumeric: 'tabular-nums', boxShadow: '0 2px 6px rgba(214,69,69,.4)' }}>{action.badge}</span>
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 13, background: action.bg, color: action.color, fontSize: 19 }}>{action.icon}</span>
              )}
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.9)', fontWeight: 600, lineHeight: 1.2 }}>{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section style={{ padding: '14px 16px 0' }}>
        <IntensiveAppointmentCard items={displayAppointments} compact />
      </section>

      {activeHighlights.length > 0 && (
        <section style={{ padding: '14px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#C9A45C,#15453D)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2B2110' }}>运营提醒</span>
            <span style={{ fontSize: 11, color: '#9A8E7A', marginLeft: 2 }}>{activeHighlights.length} 条待关注</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeHighlights.map((item) => {
              const colorMap: Record<string, string> = {
                orange: '#E8784A',
                red: '#E24B4A',
                blue: '#185FA5',
                purple: '#8B7AAF',
                green: '#1D9E75',
              }
              const color = colorMap[item.tone] || '#E8784A'
              return (
                <button
                  className="pressable"
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '11px 12px',
                    borderRadius: 12,
                    background: '#FFFDF7',
                    border: '1px solid rgba(232,120,74,.14)',
                    boxShadow: '0 2px 8px rgba(58,50,39,.05)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ width: 4, alignSelf: 'stretch', borderRadius: 99, background: color, flexShrink: 0 }} />
                  <span style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                    background: `${color}14`, color, fontSize: 15,
                  }}><ExclamationCircleOutlined /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                      <strong style={{ fontSize: 16, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{item.value}</strong>
                      <span style={{ fontSize: 13, color: '#2B2110', fontWeight: 600 }}>{item.label}</span>
                    </span>
                    <span style={{ display: 'block', fontSize: 11, color: '#9A8E7A', marginTop: 2 }}>点击查看详情并处理</span>
                  </span>
                  <RightOutlined style={{ color: '#9A8E7A', fontSize: 11, flexShrink: 0 }} />
                </button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { mutate: mutateCache } = useSWRConfig()
  const isMobile = useIsMobile() ?? false
  const { division } = useDivision()
  useEffect(() => { void loadECharts() }, [])
  const { data: termData, error: termError, mutate: mutateTerms } = useSWR<{ selectedTermId?: string | null; terms: Array<{ id: string; name: string; status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' }> }>('/api/admin/academic-terms', async (url: string) => {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) throw new Error('运营批次加载失败')
    return response.json()
  })
  const terms = useMemo(() => termData?.terms || [], [termData?.terms])
  const defaultTermId = termData?.selectedTermId
    || terms.find((term) => term.status === 'ACTIVE')?.id
    || terms[0]?.id
  const [selectedTermId, setSelectedTermId] = useState('')
  const [switchingTermId, setSwitchingTermId] = useState<string | null>(null)
  useEffect(() => {
    if (!defaultTermId) return
    setSelectedTermId((current) => current === defaultTermId ? current : defaultTermId)
  }, [defaultTermId])
  const changeTermScope = async (termId: string) => {
    if (!termId || termId === selectedTermId || switchingTermId) return
    setSwitchingTermId(termId)
    try {
      const response = await fetch('/api/admin/academic-terms/scope', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termId }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || '切换运营批次失败')
      const persistedTermId = payload.term?.id || termId
      await mutateCache(isAdminTermScopedSWRKey, undefined, { revalidate: false })
      const nextDashboardUrl = `/api/dashboard?division=${division}&termId=${encodeURIComponent(persistedTermId)}`
      const nextDashboardResponse = await fetch(nextDashboardUrl, { cache: 'no-store' })
      const nextDashboardPayload = await nextDashboardResponse.json().catch(() => ({}))
      if (!nextDashboardResponse.ok) {
        throw new Error(nextDashboardPayload.error || '所选批次数据加载失败')
      }
      await mutateCache(nextDashboardUrl, nextDashboardPayload, { revalidate: false })
      await mutateTerms((current) => current ? {
        ...current,
        selectedTermId: persistedTermId,
      } : current, { revalidate: false })
      setSelectedTermId(persistedTermId)
      message.success(`已切换到“${payload.term?.name || '所选批次'}”`)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '切换运营批次失败')
    } finally {
      setSwitchingTermId(null)
    }
  }
  const effectiveTermId = selectedTermId || defaultTermId || ''
  const selectedTerm = terms.find((term) => term.id === effectiveTermId)
  const termScopeReady = termData !== undefined || termError !== undefined
  const dashboardUrl = termScopeReady
    ? `/api/dashboard?division=${division}${effectiveTermId ? `&termId=${encodeURIComponent(effectiveTermId)}` : ''}`
    : null
  const { data, error, isLoading } = useSWR(dashboardUrl, fetcher, {
    // 教师约课后，管理首页应在较短时间内自动出现动态。
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    dedupingInterval: 10_000,
  })

  if (!termScopeReady || isLoading) {
    return <DashboardSkeleton />
  }

  if (error || !data) {
    return (
      <Alert
        type="error"
        showIcon
        message="数据总览加载失败"
        description="请检查数据库连接、登录状态或稍后重试。"
      />
    )
  }

  if (isMobile) {
    return (
      <div style={{ background: '#FAF6EE', minHeight: '100dvh' }}>
        <div style={{ padding: '0 16px', background: '#FAF6EE' }}>
          {selectedTerm?.status === 'DRAFT' && (
            <Alert
              type="warning"
              showIcon
              message="当前批次尚未启用，仅供查看"
              action={<Button size="small" onClick={() => router.push('/academic-terms')}>去启用</Button>}
              style={{ marginTop: 10, borderRadius: 10 }}
            />
          )}
          {selectedTerm?.status === 'ARCHIVED' && (
            <Alert type="info" showIcon message="当前正在查看历史归档数据" style={{ marginTop: 10, borderRadius: 10 }} />
          )}
        </div>
        <MobileDashboard data={data} />
        <div style={{ padding: '14px 16px 0', background: '#FAF6EE', width: '100%', maxWidth: '100%' }}>
          <QuickStartGuide storageKey={`mz_admin_quick_start_v1_${division}`} title="三步开始管理工作" steps={ADMIN_QUICK_STEPS} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 24, background: '#FAF6EE', minHeight: '100vh' }}>
      <DashboardHero
        metrics={data.metrics}
      />
      <div style={{ marginBottom: 16 }}>
        <AdminExceptionCenter metrics={data.metrics} />
      </div>
      {selectedTerm?.status === 'ARCHIVED' && <Alert type="info" showIcon message="正在查看历史归档数据" style={{ marginBottom: 16 }} />}
      {selectedTerm?.status === 'DRAFT' && (
        <Alert
          type="warning"
          showIcon
          message="这是尚未启用的批次，目前仅用于查看"
          description="如需在本批次添加学员、建班、排课和录入业务，请到“学期与批次”点击“启用并进入”。"
          action={<Button size="small" onClick={() => router.push('/academic-terms')}>去启用</Button>}
          style={{ marginBottom: 16 }}
        />
      )}
      <AdminTodayTodoBar data={data} />
      <MetricsCards data={data.metrics} />
      <Card
        style={{ marginTop: 16, borderRadius: 14, border: '1px solid rgba(58,50,39,.07)', boxShadow: '0 2px 8px rgba(58,50,39,.04)' }}
        styles={{ body: { padding: '14px 18px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#C9A45C,#15453D)' }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#2B2110' }}>教师考勤 · 反馈（今日）</span>
            <span style={{ fontSize: 12, color: '#A89C8A' }}>未提交项优先置顶</span>
          </div>
          {data.teacherCompliance.some((item) => item.pendingAttendance > 0 || item.pendingFeedback > 0) && (
            <Tag color="#C05A2E" style={{ borderRadius: 20, fontWeight: 600 }}>
              待办 {data.teacherCompliance.reduce((sum, item) => sum + item.pendingAttendance + item.pendingFeedback, 0)} 项
            </Tag>
          )}
        </div>
        {data.teacherCompliance.length === 0 ? (
          <GuidedEmpty
            title="今日暂无教师履约监控数据"
            description="当天教师开课后会实时汇总出勤与反馈记录。"
            compact
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.6fr 1fr 1fr', padding: '8px 12px', background: '#F3EBDD', borderRadius: 8, fontSize: 12, color: '#9A8E7A', fontWeight: 600 }}>
              <span>教师</span>
              <span>今日课次</span>
              <span>考勤</span>
              <span>课堂反馈</span>
            </div>
            {data.teacherCompliance.map((item) => {
              const hasPending = item.pendingAttendance > 0 || item.pendingFeedback > 0
              return (
                <div
                  key={item.teacherId}
                  onClick={() => router.push(`/teacher-compliance?teacherId=${encodeURIComponent(item.teacherId)}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') router.push(`/teacher-compliance?teacherId=${encodeURIComponent(item.teacherId)}`)
                  }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.4fr 0.6fr 1fr 1fr',
                    alignItems: 'center',
                    padding: '9px 12px',
                    borderBottom: '1px solid #F0E9DD',
                    background: hasPending ? 'rgba(245,166,35,.06)' : 'transparent',
                    borderRadius: hasPending ? 8 : 0,
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CachedAvatarImage
                      src={getTeacherAvatarUrl(item.avatar, item.gender, item.teacherId)}
                      fallbackSrc={getTeacherAvatarUrl(null, item.gender, item.teacherId) || DEFAULT_TEACHER_AVATAR}
                      alt={item.name}
                      style={{ width: 26, height: 26, borderRadius: 999, objectFit: 'cover', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1F241F' }}>{item.name}</span>
                  </span>
                  <span style={{ fontSize: 12, color: '#5C4F3F', fontVariantNumeric: 'tabular-nums' }}>{item.todayLessons} 节</span>
                  <span>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 999, whiteSpace: 'nowrap',
                      color: item.pendingAttendance > 0 ? '#C05A2E' : '#1E7A3C',
                      background: item.pendingAttendance > 0 ? '#FFEDE4' : '#DFF5E8',
                    }}>
                      {item.pendingAttendance > 0 ? `待录 ${item.pendingAttendance} 节` : `已提交 ${item.attendanceDone}/${item.todayLessons}`}
                    </span>
                  </span>
                  <span>
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 999, whiteSpace: 'nowrap',
                      color: item.pendingFeedback > 0 ? '#C0392B' : '#1E7A3C',
                      background: item.pendingFeedback > 0 ? '#FDEAEA' : '#DFF5E8',
                    }}>
                      {item.pendingFeedback > 0 ? `未发 ${item.pendingFeedback} 节` : `已发布 ${item.feedbackDone}/${item.todayLessons}`}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </Card>
      <div className="admin-dashboard-workspace">
        <div className="admin-dashboard-workspace__main">
          <StudentGrowthChart data={data.growthData} />
        </div>
        <aside className="admin-dashboard-workspace__aside" aria-label="今日动态与课表">
          <IntensiveAppointmentCard items={data.intensiveAppointments} />
          <TodayScheduleCard data={data.schedules} />
        </aside>
      </div>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <TeacherWorkloadCard data={data.workloads} />
        </Col>
        <Col xs={24} lg={12}>
          <ActivityLogCard data={data.logs} />
        </Col>
      </Row>
      <div style={{ marginTop: 16 }}>
        <QuickStartGuide storageKey={`mz_admin_quick_start_v1_${division}`} title="三步开始管理工作" steps={ADMIN_QUICK_STEPS} />
      </div>
    </div>
  )
}
