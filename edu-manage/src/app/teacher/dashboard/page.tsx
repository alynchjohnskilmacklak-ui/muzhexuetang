'use client'

import type { CSSProperties } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { Button, Card, Col, Progress, Row, Space, Tag, Typography } from 'antd'
import { useRouter } from 'next/navigation'
import * as echarts from 'echarts'
import {
  AlertOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
  MessageOutlined,
  RobotOutlined,
  TeamOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { formatHours, formatPercent } from '@/lib/format'
import { useIsMobile } from '@/hooks/useIsMobile'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'
import { MEMBERSHIP_THEME, resolveMembership } from '@/constants/membership'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { PullToRefresh } from '@/components/PullToRefresh'
import { MessageWorkflowNotice } from '@/components/MessageWorkflowNotice'
import { QuickStartGuide, type QuickStartStep } from '@/components/Common/QuickStartGuide'
import { WeatherHeroStrip } from '@/components/Common/WeatherHeroStrip'
import { TeacherNoticeToaster } from '@/components/TeacherNoticeToaster'

const { Text } = Typography

const TEACHER_QUICK_STEPS: QuickStartStep[] = [
  { title: '查看今天的课', description: '先确认上课时间、班级和教室，避免漏课或走错教室。', actionLabel: '打开我的课表', href: '/teacher/schedule', icon: <CalendarOutlined /> },
  { title: '及时提交考勤', description: '课程结束后登记真实到勤情况，待办数量会同步减少。', actionLabel: '去录入考勤', href: '/teacher/attendance', icon: <CheckCircleOutlined /> },
  { title: '发布我的反馈', description: '把本节课的学习内容和建议发给家长，形成连续成长记录。', actionLabel: '去写反馈', href: '/teacher/feedback', icon: <MessageOutlined /> },
]

type Tone = 'blue' | 'orange' | 'red' | 'green' | 'purple' | 'brown' | 'dark'

interface DashboardLessonStudent {
  id: string
  name: string
  grade?: string | null
  school?: string | null
  membershipLevel?: string | null
}

interface DashboardLesson {
  id: string
  time: string
  startTime?: string
  endTime?: string
  courseName: string
  groupName: string
  room: string
  studentCount: number
  statusLabel: string
  statusTone: Tone
  hasFeedback: boolean
  attendanceSubmittedAt?: string | null
  lessonId?: string
  feedbackId?: string | null
  students?: DashboardLessonStudent[]
}

interface CompletionItem {
  done: number
  total: number
  percent: number
}

interface MonthWeek {
  label: string
  hours: number
  pay: number
}

interface AttendanceWeek {
  label: string
  rate: number | null
}

interface MonthData {
  key: string
  label: string
  weeks: MonthWeek[]
}

interface AttendanceMonthData {
  key: string
  label: string
  weeks: AttendanceWeek[]
}

interface DashboardData {
  teacher: { id: string; name: string; avatar?: string | null; subjects?: string | null; tierLevel?: string | null }
  heroStats: {
    todayLessons: number
    pendingAttendance: number
    pendingFeedback: number
    pendingPapers: number
    pendingLeave: number
    totalTodos: number
    pendingStudyHallAttendance?: number
    pendingStudyHallHomework?: number
  }
  todayLessons: DashboardLesson[]
  todos: DashboardTask[]
  weekCompletion: {
    attendance: CompletionItem
    classroomFeedback: CompletionItem
    parentMessages: CompletionItem
  }
  monthlyStats: { totalStudents: number; monthlyHours: number }
  attendanceByMonth?: AttendanceMonthData[]
  salaryByMonth?: MonthData[]
  pendingTasks: { unreadParentComments: number; pendingLeave: number; pendingStudyHallAttendance?: number; pendingStudyHallHomework?: number }
  badges?: { unsubmitted: number; unpublished: number; unread: number; unreadMessages: number }
  quickActions: Array<{ label: string; desc: string; href: string; tone: Tone }>
}

interface DashboardTask {
  id: string
  type?: string
  title: string
  description: string
  status?: string
  tone: Tone
  actionLabel: string
  href: string
}

const toneColor: Record<Tone, string> = {
  blue: '#123C35',
  orange: '#E8784A',
  red: '#D64545',
  green: '#123C35',
  purple: '#9A8E7A',
  brown: '#E8784A',
  dark: '#123C35',
}

/** 课程状态 → 家长端三档配色：未上=橙黄 / 上课中=绿 / 已结束=灰 */
const LESSON_STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  '待上课': { label: '未上课', bg: '#FFF2D9', color: '#A06E0B' },
  '上课中': { label: '上课中', bg: '#DFF5E8', color: '#1E7A3C' },
  '已完成': { label: '已结束', bg: '#F1F1F2', color: '#8B8B8B' },
  '已考勤': { label: '已结束', bg: '#F1F1F2', color: '#8B8B8B' },
  '待考勤': { label: '待考勤', bg: '#F1F1F2', color: '#8B8B8B' },
}

const quickIcons = [<CheckCircleOutlined key="attendance" />, <CalendarOutlined key="schedule" />, <FileDoneOutlined key="salary" />, <RobotOutlined key="sim" />, <MessageOutlined key="feedback" />, <MessageOutlined key="messages" />, <TeamOutlined key="students" />, <CalendarOutlined key="preview" />]
const fetcher = (url: string) => fetch(url).then((res) => res.json())

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

function dateText() {
  return new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
}

/** ECharts 轻封装：自动初始化 / resize / 销毁 */
function EChart({ option, height = 190 }: { option: echarts.EChartsOption; height?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const optionRef = useRef(option)
  optionRef.current = option
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

/** 本月课酬图表：4 周课时 + 课酬双柱 */
function SalaryChart({ month }: { month?: MonthData }) {
  const weeks = month?.weeks || []
  const option = useMemo<echarts.EChartsOption>(() => ({
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#16241F',
      borderWidth: 0,
      textStyle: { color: '#F5F1E8', fontSize: 11 },
      axisPointer: { type: 'shadow' },
    },
    legend: {
      data: ['课时(h)', '课酬(¥)'],
      top: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: '#8D806F', fontSize: 11 },
    },
    grid: { left: 4, right: 4, top: 26, bottom: 4, containLabel: true },
    xAxis: {
      type: 'category',
      data: weeks.map((w) => w.label),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#E7DFD3' } },
      axisLabel: { color: '#8D806F', fontSize: 11 },
    },
    yAxis: [
      {
        type: 'value',
        name: '课时',
        nameTextStyle: { color: '#8D806F', fontSize: 10 },
        splitLine: { lineStyle: { color: '#F0E9DD', type: 'dashed' } },
        axisLabel: { color: '#A89C8A', fontSize: 10 },
      },
      {
        type: 'value',
        splitLine: { show: false },
        axisLabel: { color: '#A89C8A', fontSize: 10, formatter: (v: number) => `${v >= 0 ? '' : '-'}¥${Math.abs(v)}` },
      },
    ],
    series: [
      {
        name: '课时(h)',
        type: 'bar',
        data: weeks.map((w) => w.hours),
        barWidth: 13,
        itemStyle: { borderRadius: [5, 5, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#4E9B7A' }, { offset: 1, color: '#2E6E53' }]) },
      },
      {
        name: '课酬(¥)',
        type: 'bar',
        yAxisIndex: 1,
        data: weeks.map((w) => w.pay),
        barWidth: 13,
        itemStyle: { borderRadius: [5, 5, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#E9C77B' }, { offset: 1, color: '#C9A45C' }]) },
      },
    ],
  }), [weeks])
  if (!month) return <BrandEmpty title="暂无课酬数据" icon={<ClockCircleOutlined />} />
  return <EChart option={option} />
}

/** 出勤趋势图表：4 周出勤率柱状 */
function AttendanceChart({ month }: { month?: AttendanceMonthData }) {
  const weeks = month?.weeks || []
  const option = useMemo<echarts.EChartsOption>(() => ({
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#16241F',
      borderWidth: 0,
      textStyle: { color: '#F5F1E8', fontSize: 11 },
      formatter: (params: any) => {
        const item = params[0]
        return `${item.name}<br/>出勤率：${item.value == null ? '暂无课程' : item.value + '%'}`
      },
    },
    grid: { left: 4, right: 4, top: 26, bottom: 4, containLabel: true },
    xAxis: {
      type: 'category',
      data: weeks.map((w) => w.label),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#E7DFD3' } },
      axisLabel: { color: '#8D806F', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      max: 100,
      splitLine: { lineStyle: { color: '#F0E9DD', type: 'dashed' } },
      axisLabel: { color: '#A89C8A', fontSize: 10, formatter: '{value}%' },
    },
    series: [
      {
        name: '出勤率',
        type: 'bar',
        data: weeks.map((w) => w.rate),
        barWidth: 22,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: '#3F9470' }, { offset: 1, color: '#1F5B43' }]),
        },
        label: {
          show: true,
          position: 'top',
          color: '#123C35',
          fontWeight: 700,
          fontSize: 11,
          formatter: (p: any) => (p.value == null ? '' : p.value + '%'),
        },
      },
    ],
  }), [weeks])
  if (!month) return <BrandEmpty title="暂无出勤数据" icon={<CheckCircleOutlined />} />
  return <EChart option={option} />
}

/** 本周完成度：三环进度 */
function CompletionRings({ completion }: { completion: DashboardData['weekCompletion'] }) {
  const items: Array<{ label: string; item: CompletionItem; color: string }> = [
    { label: '考勤提交', item: completion.attendance, color: '#2E6E53' },
    { label: '课堂反馈', item: completion.classroomFeedback, color: '#C9A45C' },
    { label: '家长留言', item: completion.parentMessages, color: '#E8784A' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
      {items.map(({ label, item, color }) => (
        <div key={label} style={{ textAlign: 'center' }}>
          <Progress
            type="circle"
            size={84}
            percent={item.total ? item.percent : 0}
            strokeColor={item.total ? color : '#D8CFC1'}
            trailColor="#F0E9DD"
            strokeWidth={9}
            format={(p) => item.total ? `${p}%` : <span style={{ fontSize: 12, color: '#A89C8A' }}>暂无</span>}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: '#5C4F3F', fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 11, color: '#A89C8A', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
            {item.total ? `${item.done}/${item.total} 项` : '本周无任务'}
          </div>
        </div>
      ))}
    </div>
  )
}

function MembershipBadge({ level }: { level?: string | null }) {
  const membership = resolveMembership(level)
  const theme = MEMBERSHIP_THEME[membership]
  if (!theme.badge) {
    return <span style={{ fontSize: 11, color: '#8D806F' }}>普通</span>
  }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0 6px',
        borderRadius: 999,
        fontSize: 10.5,
        fontWeight: 700,
        lineHeight: '18px',
        color: theme.text,
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {theme.badge}
    </span>
  )
}

export default function TeacherDashboardPage() {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const [salaryMonthKey, setSalaryMonthKey] = useState<string | undefined>()
  const [attendanceMonthKey, setAttendanceMonthKey] = useState<string | undefined>()
  const { data, isLoading, mutate } = useSWR<DashboardData>('/api/teacher/dashboard', fetcher, {
    refreshInterval: 180_000,
    dedupingInterval: 30_000,
    keepPreviousData: true,
    revalidateOnFocus: true,
  })
  const { data: messageUnreadData } = useSWR<{ count: number }>('/api/messages/unread-count', fetcher, {
    refreshInterval: 5_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch('/api/teacher/dashboard', { method: 'POST' }).catch((error) =>
        console.warn('教师仪表盘状态同步失败', error)
      )
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [])

  if (isLoading) return <CardSkeleton rows={3} />
  if (!data?.teacher) return <BrandEmpty title="未找到教师信息" icon={<UserOutlined />} />

  const { teacher, heroStats, todayLessons, weekCompletion, monthlyStats, attendanceByMonth, salaryByMonth, quickActions } = data
  const tier = resolveTier(teacher.tierLevel)
  const tierTheme = TIER_THEME[tier]
  const heroItems = [
    { label: '今日课次', value: heroStats.todayLessons, suffix: '节' },
    { label: '待考勤', value: heroStats.pendingAttendance, suffix: '节' },
    { label: '待发反馈', value: heroStats.pendingFeedback, suffix: '条' },
    { label: '全部待办', value: heroStats.totalTodos, suffix: '项' },
  ]
  const heroStyle = {
    '--teacher-hero-bg': tier === 'ELITE' ? 'linear-gradient(135deg, #0E2E2A 0%, #16423C 100%)' : tierTheme.accent,
    '--teacher-hero-highlight': tierTheme.gold || tierTheme.border,
    '--teacher-hero-glow': tier === 'ELITE' ? '0 0 34px rgba(201,164,92,.22)' : 'none',
  } as CSSProperties

  // 月下拉默认当前月（最后一个），有数据优先
  const salaryMonths = salaryByMonth || []
  const attendanceMonths = attendanceByMonth || []
  const defaultMonthKey = salaryMonths.length ? salaryMonths[salaryMonths.length - 1].key : undefined
  const selectedSalaryKey = salaryMonthKey ?? defaultMonthKey
  const selectedAttendanceKey = attendanceMonthKey ?? defaultMonthKey
  const selectedSalaryMonth = salaryMonths.find((m) => m.key === selectedSalaryKey)
  const selectedAttendanceMonth = attendanceMonths.find((m) => m.key === selectedAttendanceKey)

  return (
    <PullToRefresh onRefresh={async () => { await mutate() }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <MessageWorkflowNotice audience="teacher" deferMs={1400} />
      <QuickStartGuide storageKey={`mz_teacher_quick_start_v1_${teacher.id}`} title="三步开始今天的教学工作" steps={TEACHER_QUICK_STEPS} />
      <section className={`teacher-dashboard-hero${tier === 'ELITE' ? ' teacher-dashboard-hero--elite' : ''}`} style={heroStyle}>
        <div className="teacher-dashboard-hero__intro">
          <div className="teacher-dashboard-hero__date">{dateText()}</div>
          <div className="teacher-dashboard-hero__heading">
            <h1>{teacher.name}老师，{getGreeting()}</h1>
            <span className="teacher-dashboard-hero__tier">{tierTheme.label}</span>
          </div>
          <div className="teacher-dashboard-hero__summary">
            今天的课程安排和待处理事项已集中整理，按顺序完成即可。
          </div>
          <div className="teacher-dashboard-hero__message">认真记录每一堂课，让孩子的成长被看见。</div>
        </div>
        <div className="teacher-dashboard-hero__metrics">
          {heroItems.map((item) => (
            <div className="teacher-dashboard-hero__metric" key={item.label}>
              <div className="teacher-dashboard-hero__metric-value">
                {item.value}<span>{item.suffix}</span>
              </div>
              <div className="teacher-dashboard-hero__metric-label">{item.label}</div>
            </div>
          ))}
        </div>
        <WeatherHeroStrip audience="teacher" />
      </section>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card
            bordered={false}
            style={{ borderRadius: 12, marginBottom: 16 }}
            title={
              <button
                type="button"
                className="teacher-dashboard-section-link"
                onClick={() => router.push('/teacher/today-lessons')}
              >
                <span>今日课程</span>
                <small>点击查看详细课程安排 ›</small>
              </button>
            }
          >
            {todayLessons.length ? (
              <div className="teacher-today-schedule-grid">
                {todayLessons.map(lesson => {
                  const meta = LESSON_STATUS_META[lesson.statusLabel] || LESSON_STATUS_META['待考勤']
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      className="teacher-today-schedule-item"
                      onClick={() => router.push(`/teacher/lesson/${lesson.lessonId || lesson.id}`)}
                    >
                      <span className="teacher-today-schedule-item__bar" style={{ background: meta.color }} />
                      <div className="teacher-today-schedule-item__head">
                        <span className="teacher-today-schedule-item__time">{lesson.time}</span>
                        <span className="teacher-today-schedule-item__status" style={{ color: meta.color, background: meta.bg }}>{meta.label}</span>
                      </div>
                      <strong className="teacher-today-schedule-item__title">{lesson.courseName.replace('牧哲学堂', '')} · {lesson.groupName.replace('牧哲学堂', '')}</strong>
                      <small className="teacher-today-schedule-item__meta">{lesson.room} · {lesson.studentCount}人{lesson.hasFeedback ? ' · 已发反馈' : ' · 未发反馈'}</small>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div>
                <BrandEmpty title="今日暂无课程" hint="可以整理课堂反馈、上传试卷或查看学生学习情况" icon={<CalendarOutlined />} />
                <div className="teacher-dashboard-empty-actions">
                  <Button onClick={() => router.push('/teacher/students')}>查看我的学生</Button>
                  <Button onClick={() => router.push('/teacher/papers')}>上传试卷</Button>
                  <Button onClick={() => router.push('/teacher/feedback')}>发布课堂反馈</Button>
                </div>
              </div>
            )}
          </Card>

          <Card
            bordered={false}
            style={{ borderRadius: 12, overflow: 'hidden' }}
            title={
              <div className="teacher-dashboard-chart-title">
                <span>出勤趋势</span>
                <select
                  className="teacher-dashboard-month-select"
                  value={selectedAttendanceKey}
                  onChange={(e) => setAttendanceMonthKey(e.target.value)}
                >
                  {(attendanceMonths).map((m) => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              </div>
            }
          >
            <AttendanceChart month={selectedAttendanceMonth} />
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Card bordered={false} title="快捷操作" style={{ borderRadius: 12, marginBottom: 16 }}>
            <div className="parent-quick-actions__grid">
              {quickActions.slice(0, 8).map(action => (
                <button
                  key={action.label}
                  type="button"
                  className="parent-quick-action"
                  onClick={() => router.push(action.href)}
                >
                  <span>{quickIcons[quickActions.indexOf(action)] || <CalendarOutlined />}</span>
                  <small>{action.label}</small>
                </button>
              ))}
            </div>
          </Card>

          <Card bordered={false} title="本周教学完成度" style={{ borderRadius: 12, marginBottom: 16 }}>
            <CompletionRings completion={weekCompletion} />
          </Card>

          <Card
            bordered={false}
            style={{ borderRadius: 12, marginBottom: 16, overflow: 'hidden' }}
            title={
              <div className="teacher-dashboard-chart-title">
                <span>本月课酬概览</span>
                <select
                  className="teacher-dashboard-month-select"
                  value={selectedSalaryKey}
                  onChange={(e) => setSalaryMonthKey(e.target.value)}
                >
                  {salaryMonths.map((m) => (
                    <option key={m.key} value={m.key}>{m.label}</option>
                  ))}
                </select>
              </div>
            }
          >
            <SalaryChart month={selectedSalaryMonth} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <div className="teacher-dashboard-stat-chip">
                <span>本月课时</span>
                <b>{formatHours(selectedSalaryMonth?.weeks.reduce((sum, w) => sum + w.hours, 0) || 0)}h</b>
              </div>
              <div className="teacher-dashboard-stat-chip">
                <span>本月课酬</span>
                <b>¥{(selectedSalaryMonth?.weeks.reduce((sum, w) => sum + w.pay, 0) || 0).toLocaleString('zh-CN')}</b>
              </div>
            </div>
          </Card>

          <Card bordered={false} title="教学概览" style={{ borderRadius: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : '1fr 1fr', gap: 10 }}>
              {[
                { label: '在带学员', value: `${monthlyStats.totalStudents}人`, icon: <TeamOutlined />, color: '#123C35' },
                { label: '本月课时', value: `${formatHours(monthlyStats.monthlyHours)}h`, icon: <ClockCircleOutlined />, color: '#123C35' },
                { label: '家长留言', value: `${messageUnreadData?.count ?? data.badges?.unreadMessages ?? data.pendingTasks.unreadParentComments}条`, icon: <MessageOutlined />, color: '#E8784A' },
                { label: '待处理', value: `${heroStats.totalTodos}项`, icon: <AlertOutlined />, color: '#E8784A' },
              ].map((item) => (
                <div key={item.label} style={{ background: '#FAF8F5', borderRadius: 10, padding: 12 }}>
                  <div style={{ color: item.color, fontSize: 18 }}>{item.icon}</div>
                  <div style={{ color: item.color, fontWeight: 800, fontSize: 20, marginTop: 4, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: '#8D806F' }}>{item.label}</div>
                </div>
              ))}
            </div>
            <Button
              block
              icon={<MessageOutlined />}
              onClick={() => router.push('/teacher/messages')}
              style={{ marginTop: 12, borderRadius: 10 }}
            >
              查看并回复家长留言
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
      <TeacherNoticeToaster />
    </PullToRefresh>
  )
}
