'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { Alert, Badge, Button, Card, Col, Empty, message, Progress, Row, Select, Tag, Typography } from 'antd'
import {
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckSquareOutlined,
  CommentOutlined,
  FileTextOutlined,
  MessageOutlined,
  RightOutlined,
  ScheduleOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import * as echarts from 'echarts'
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

const { Text } = Typography

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
        <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#FFB84D,#E8784A)' }} />
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
function EChart({ option, height = 200 }: { option: echarts.EChartsOption; height?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const optionRef = useRef(option)
  useEffect(() => {
    optionRef.current = option
    if (ref.current) echarts.getInstanceByDom(ref.current)?.setOption(option, { notMerge: true })
  }, [option])
  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current)
    chart.setOption(optionRef.current)
    const onResize = () => chart.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      chart.dispose()
    }
  }, [])
  return <div ref={ref} style={{ width: '100%', height }} />
}

/** 近 6 个月趋势：学员总数折线 + 课时柱状（管理端移动端小图） */
function GrowthMiniChart({ data }: { data: StudentGrowthData }) {
  const hasData = data.months.some((_, index) => (data.totalStudents[index] || 0) > 0 || (data.classHours[index] || 0) > 0)
  const option = useMemo<echarts.EChartsOption>(() => ({
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
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#3DBB8B' }, { offset: 1, color: '#1D9E75' }]),
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

  const displayCompliance = data.teacherCompliance || []
  const displaySchedules = useMemo(() => data.schedules || [], [data.schedules])
  const displayAppointments = data.intensiveAppointments || []

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

  const quickActions = [
    { icon: <CheckSquareOutlined />, label: '考勤管理', href: '/attendance', badge: metrics.todayLessonsPendingAttendance, color: '#C05A2E', bg: '#FFEEE4' },
    { icon: <TeamOutlined />, label: '学员管理', href: '/students', color: '#185FA5', bg: '#E9F1FA' },
    { icon: <BookOutlined />, label: '课程管理', href: '/courses', color: '#1D9E75', bg: '#E7F5EF' },
    { icon: <ExclamationCircleOutlined />, label: '运营待办', href: '/dashboard#admin-exception-center', badge: metrics.pendingTasksUrgent, color: '#7a7fad', bg: '#EEEEF6' },
    { icon: <CommentOutlined />, label: '课堂反馈', href: '/classroom-feedback', color: '#8B5A9E', bg: '#F4ECF7' },
    { icon: <MessageOutlined />, label: '家长留言', href: '/parent-messages', badge: metrics.pendingTeacherReplies, color: '#A06E0B', bg: '#FFF3DA' },
    { icon: <FileTextOutlined />, label: '题库统计', href: '/grades', color: '#C9A45C', bg: '#FAF3E0' },
    { icon: <ScheduleOutlined />, label: '运营批次', href: '/academic-terms', color: '#2E6E53', bg: '#E7F5EF' },
  ]

  const activeHighlights = data.operatingHighlights.filter((highlight) => Number(highlight.value) > 0)

  // 今日课堂闭环：考勤 / 反馈 / 家长留言
  const attendanceTotal = displayCompliance.reduce((sum, item) => sum + item.todayLessons, 0)
  const attendanceDone = displayCompliance.reduce((sum, item) => sum + item.attendanceDone, 0)
  const feedbackDone = displayCompliance.reduce((sum, item) => sum + item.feedbackDone, 0)

  return (
    <div style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))', background: '#FAF6EE', minHeight: '100dvh' }}>
      {/* 运营中枢 Hero（新 logo 暖咖金橙主题） */}
      <div style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(155deg, #33220F 0%, #5A3A17 52%, #7E4A1B 100%)',
        padding: '18px 16px 18px',
      }}>
        <div style={{ position: 'absolute', top: '-60%', right: '-14%', width: 210, height: 300, background: 'radial-gradient(circle, rgba(245,166,35,.28), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-50%', left: '-10%', width: 190, height: 260, background: 'radial-gradient(circle, rgba(255,255,255,.08), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,.62)', marginBottom: 6 }}>
            <span>{now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日 {weekDays[now.getDay()]}</span>
            <span style={{ width: 1, height: 9, background: 'rgba(255,255,255,.25)' }} />
            <span style={{ color: '#FFD58A' }}>运营中枢</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: 'rgba(255,255,255,.95)', letterSpacing: .5 }}>牧哲学堂 · 管理端</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, color: '#3A2208', background: 'linear-gradient(135deg,#FFB84D,#E8784A)', whiteSpace: 'nowrap' }}>👑 运营驾驶舱</span>
          </div>

          {/* 核心数据：在读学员 + 本月课时进度 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,.07)', borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(233,199,123,.24)' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.66)' }}>在读学员</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                <strong style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums', background: 'linear-gradient(135deg,#FFD58A,#E8784A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1 }}>{metrics.activeStudents}</strong>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,.75)' }}>人</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, color: metrics.studentGrowth >= 0 ? '#4EE6A1' : '#FF9D8A', background: metrics.studentGrowth >= 0 ? 'rgba(46,110,83,.35)' : 'rgba(214,69,69,.3)', whiteSpace: 'nowrap' }}>
                  {metrics.studentGrowth >= 0 ? '▲' : '▼'}{Math.abs(metrics.studentGrowth).toFixed(1)}%
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.56)', marginTop: 3 }}>较上月 · 生源趋势</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,.07)', borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(233,199,123,.24)' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.66)' }}>本月课时进度</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                <Progress
                  type="circle"
                  size={52}
                  percent={metrics.hoursProgress}
                  strokeColor={{ '0%': '#FFB84D', '100%': '#E8784A' }}
                  trailColor="rgba(255,255,255,.14)"
                  strokeWidth={7}
                  format={(p) => <span style={{ fontSize: 12, fontWeight: 800, color: '#FFD58A' }}>{p}%</span>}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,.95)', fontVariantNumeric: 'tabular-nums' }}>{formatHours(metrics.monthlyDeductedHours)}<span style={{ fontSize: 11, color: 'rgba(255,255,255,.66)' }}> / {formatHours(metrics.monthlyScheduledHours)}h</span></div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.56)', marginTop: 2 }}>已消耗 / 计划课时</div>
                </div>
              </div>
            </div>
          </div>

          {/* 今日摘要胶囊 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 10 }}>
            {[
              { label: '今日课次', value: `${metrics.todayLessons}`, suffix: '节', href: '/attendance' },
              { label: '待考勤', value: `${metrics.todayLessonsPendingAttendance}`, suffix: '节', href: '/attendance', warn: metrics.todayLessonsPendingAttendance > 0 },
              { label: '待处理', value: `${metrics.pendingTasksUrgent}`, suffix: '项', href: '/dashboard#admin-exception-center', warn: metrics.pendingTasksUrgent > 0 },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => router.push(item.href)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '7px 6px',
                  borderRadius: 10,
                  background: item.warn ? 'rgba(232,120,74,.18)' : 'rgba(255,255,255,.06)',
                  border: item.warn ? '1px solid rgba(232,120,74,.4)' : '1px solid rgba(255,255,255,.12)',
                  cursor: 'pointer',
                }}
              >
                <strong style={{ fontSize: 15, fontWeight: 800, color: item.warn ? '#FF9D6A' : '#F2DCA6', fontVariantNumeric: 'tabular-nums' }}>{item.value}</strong>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,.62)' }}>{item.suffix} {item.label}</span>
              </button>
            ))}
          </div>
        </div>
        <WeatherHeroStrip audience="admin" variant="dark" />
      </div>

      {/* 今日课堂闭环 */}
      <section style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#FFB84D,#E8784A)' }} />
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

      {/* 教师考勤·反馈完成榜 */}
      <section style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#FFB84D,#E8784A)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2B2110' }}>教师考勤 · 反馈</span>
          </div>
          <button
            type="button"
            onClick={() => router.push('/closed-loop?section=attendance')}
            style={{ fontSize: 12, color: '#A06E0B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
          >
            全部明细 <RightOutlined style={{ fontSize: 10 }} />
          </button>
        </div>
        {displayCompliance.length === 0 ? (
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Empty description="今日暂无课程" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {displayCompliance.map((item) => {
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
                    style={{ width: 30, height: 30, borderRadius: 999, objectFit: 'cover', flexShrink: 0 }}
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
          </div>
        )}
      </section>

      {/* 近 6 个月趋势 */}
      {data.growthData.months.length > 0 && (
        <section style={{ padding: '14px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#FFB84D,#E8784A)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2B2110' }}>近 6 个月趋势</span>
            <span style={{ fontSize: 11, color: '#A89C8A', marginLeft: 2 }}>学员总数与排课课时</span>
          </div>
          <div style={{ background: '#FFFDF7', borderRadius: 14, padding: '10px 10px 6px', border: '1px solid rgba(232,120,74,.14)', boxShadow: '0 2px 8px rgba(58,50,39,.05)' }}>
            <GrowthMiniChart data={data.growthData} />
          </div>
        </section>
      )}

      <section style={{ padding: '14px 16px 0' }}>
        <AdminExceptionCenter metrics={metrics} />
      </section>

      <section style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#FFB84D,#E8784A)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#2B2110' }}>今日课表</span>
          </div>
          <button
            onClick={() => router.push('/attendance')}
            style={{ fontSize: 12, color: '#A06E0B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
          >
            全部 <RightOutlined style={{ fontSize: 10 }} />
          </button>
        </div>

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

        {displaySchedules.length === 0 ? (
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Empty description="今日暂无课程" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </Card>
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
          <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#FFB84D,#E8784A)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#2B2110' }}>快捷操作</span>
          <span style={{ fontSize: 11, color: '#A89C8A', marginLeft: 2 }}>高频管理入口</span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 12,
          padding: '16px 12px',
          borderRadius: 16,
          background: 'linear-gradient(155deg, #3A2410 0%, #5A3A17 62%, #7C4A1C 100%)',
          border: '1px solid rgba(245,166,35,.42)',
          boxShadow: '0 10px 26px rgba(58,36,16,.2)',
        }}>
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
            <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#FFB84D,#E8784A)' }} />
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
  const { data: termData, mutate: mutateTerms } = useSWR<{ selectedTermId?: string | null; terms: Array<{ id: string; name: string; status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' }> }>('/api/admin/academic-terms', async (url: string) => {
    const response = await fetch(url, { cache: 'no-store' })
    if (!response.ok) throw new Error('运营批次加载失败')
    return response.json()
  })
  const terms = useMemo(() => termData?.terms || [], [termData?.terms])
  const [selectedTermId, setSelectedTermId] = useState('')
  const [switchingTermId, setSwitchingTermId] = useState<string | null>(null)
  useEffect(() => {
    if (terms.length === 0) return
    const nextTermId = termData?.selectedTermId
      || terms.find((term) => term.status === 'ACTIVE')?.id
      || terms[0].id
    setSelectedTermId((current) => current === nextTermId ? current : nextTermId)
  }, [termData?.selectedTermId, terms])
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
  const selectedTerm = terms.find((term) => term.id === selectedTermId)
  const dashboardUrl = `/api/dashboard?division=${division}${selectedTermId ? `&termId=${encodeURIComponent(selectedTermId)}` : ''}`
  const { data, error, isLoading } = useSWR(dashboardUrl, fetcher, {
    // 教师约课后，管理首页应在较短时间内自动出现动态。
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    dedupingInterval: 10_000,
  })

  if (isLoading) {
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
            <span style={{ width: 3, height: 14, borderRadius: 2, background: 'linear-gradient(180deg,#FFB84D,#E8784A)' }} />
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
          <Empty description="今日暂无课程" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
          <AdminExceptionCenter metrics={data.metrics} />
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
