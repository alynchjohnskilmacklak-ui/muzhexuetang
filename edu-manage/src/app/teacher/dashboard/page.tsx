'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import { Progress, Tooltip } from 'antd'
import { useRouter } from 'next/navigation'
import type * as echarts from 'echarts'
import {
  AlertOutlined,
  BulbOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CoffeeOutlined,
  CompassOutlined,
  CrownOutlined,
  DollarOutlined,
  DownOutlined,
  EditOutlined,
  EnvironmentOutlined,
  ExperimentOutlined,
  FileDoneOutlined,
  FileImageOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  HeartOutlined,
  InfoCircleOutlined,
  MessageFilled,
  MessageOutlined,
  ReadOutlined,
  RightOutlined,
  TeamOutlined,
  UpOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { formatHours } from '@/lib/format'
import { resolveTier, TIER_THEME, type TeacherTier } from '@/constants/teacher-tier'
import { BrandEmpty } from '@/components/Parent/BrandEmpty'
import { PullToRefresh } from '@/components/PullToRefresh'
import { MessageWorkflowNotice } from '@/components/MessageWorkflowNotice'
import { QuickStartGuide, type QuickStartStep } from '@/components/Common/QuickStartGuide'
import { WeatherHeroStrip } from '@/components/Common/WeatherHeroStrip'
import { getTeacherAvatarUrl } from '@/lib/teacher-avatars'
import { TeacherNoticeToaster } from '@/components/TeacherNoticeToaster'
import { AnimatedNumber } from '@/components/Common/AnimatedNumber'
import styles from './teacher-dashboard.module.css'

const TEACHER_QUICK_STEPS: QuickStartStep[] = [
  { title: '查看课表安排', description: '确认上课时间、班级和教室，提前备课。', actionLabel: '打开我的课表', href: '/teacher/schedule', icon: <CalendarOutlined /> },
  { title: '课后录入考勤', description: '课程结束后及时确认学员到勤情况。', actionLabel: '去录入考勤', href: '/teacher/attendance', icon: <CheckCircleOutlined /> },
  { title: '发布学情反馈', description: '向家长反馈课堂表现，沉淀成长档案。', actionLabel: '去写反馈', href: '/teacher/feedback', icon: <MessageOutlined /> },
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
  teacher: { id: string; name: string; gender?: string | null; avatar?: string | null; subjects?: string | null; tierLevel?: string | null }
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
  nextLessons?: DashboardLesson[]
  nextLessonDate?: string | null
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

/** 状态标签样式映射 */
const LESSON_STATUS_META: Record<string, { label: string; bg: string; color: string; border: string }> = {
  '待上课': { label: '待上课', bg: '#FDF6EC', color: '#B88230', border: 'rgba(184, 130, 48, 0.25)' },
  '上课中': { label: '上课中', bg: '#EAF4F1', color: '#14574D', border: 'rgba(20, 87, 77, 0.3)' },
  '已完成': { label: '已结束', bg: '#F5F2EE', color: '#756A58', border: 'rgba(117, 106, 88, 0.2)' },
  '已考勤': { label: '已考勤', bg: '#EAF7F1', color: '#137A5A', border: 'rgba(19, 122, 90, 0.25)' },
  '待考勤': { label: '待考勤', bg: '#FEF0EE', color: '#B42318', border: 'rgba(180, 35, 24, 0.25)' },
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

/**
 * 智能课程名称提炼与去重：
 * 避免将 "初一冲刺班" 与 "初一冲刺周六班" 拼成极长的 "初一冲刺班 · 初一冲刺周六班"
 */
function formatCourseDisplayName(groupNameRaw?: string, courseNameRaw?: string): string {
  const g = (groupNameRaw || '').replace(/牧哲学堂/g, '').trim()
  const c = (courseNameRaw || '').replace(/牧哲学堂/g, '').trim()
  if (!g && !c) return '教学课程'
  if (!g) return c
  if (!c) return g
  if (g === c) return g

  // 若班级名已包含课程名主要部分（如 "初一冲刺周六班" 包含 "初一冲刺班"），优先取更具具体辨识度的班级名
  const cleanG = g.replace(/班$/, '')
  const cleanC = c.replace(/班$/, '')
  if (cleanG.includes(cleanC) || g.includes(c)) return g
  if (cleanC.includes(cleanG) || c.includes(g)) return c

  return `${g} · ${c}`
}

function formatScheduleDate(dateKey?: string | null) {
  if (!dateKey) return ''
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(date.getTime())) return ''
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getUTCDay()]
  return `${month}月${day}日 · 周${weekday}`
}

function calculateDaysUntil(dateKey?: string | null): number | null {
  if (!dateKey) return null
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return null
  const targetDate = new Date(year, month - 1, day)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffTime = targetDate.getTime() - today.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
  return diffDays >= 0 ? diffDays : null
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

function dateText() {
  return new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
}

function TeacherDashboardSkeleton() {
  return (
    <div className={styles.dashboardContainer} role="status" aria-label="正在加载教师工作台">
      <div className={styles.hero} style={{ minHeight: 180, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ width: '38%', height: 26, background: 'rgba(255,255,255,0.14)', borderRadius: 8 }} />
        <div style={{ width: '60%', height: 16, background: 'rgba(255,255,255,0.1)', borderRadius: 6 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginTop: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 60, background: 'rgba(255,255,255,0.08)', borderRadius: 12 }} />
          ))}
        </div>
      </div>
      <div className={styles.dashboardGrid}>
        <div className={styles.mainColumn}>
          <div className={styles.card} style={{ height: 300, background: '#faf8f5' }} />
          <div className={styles.card} style={{ height: 160, background: '#faf8f5' }} />
        </div>
        <div className={styles.sideColumn}>
          <div className={styles.card} style={{ height: 180, background: '#faf8f5' }} />
          <div className={styles.card} style={{ height: 280, background: '#faf8f5' }} />
        </div>
      </div>
    </div>
  )
}

/** ECharts 轻封装：自动初始化 / resize / 销毁 */
function EChart({ option, height = 200 }: { option: echarts.EChartsOption; height?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const optionRef = useRef(option)
  const [chartState, setChartState] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    optionRef.current = option
    chartRef.current?.setOption(option, { notMerge: true })
  }, [option])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    let disposed = false
    let chart: echarts.ECharts | null = null
    let observer: IntersectionObserver | null = null
    const onResize = () => chart?.resize()
    const initialize = async () => {
      setChartState('loading')
      try {
        const runtime = await import('echarts')
        if (disposed || !ref.current) return
        chart = runtime.init(ref.current)
        chartRef.current = chart
        chart.setOption(optionRef.current)
        window.addEventListener('resize', onResize)
        setChartState('ready')
      } catch {
        if (!disposed) setChartState('error')
      }
    }

    if (typeof IntersectionObserver === 'undefined') {
      void initialize()
    } else {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer?.disconnect()
          void initialize()
        }
      }, { rootMargin: '180px 0px' })
      observer.observe(element)
    }

    return () => {
      disposed = true
      observer?.disconnect()
      window.removeEventListener('resize', onResize)
      chart?.dispose()
      if (chartRef.current === chart) chartRef.current = null
    }
  }, [])

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <div ref={ref} style={{ width: '100%', height }} />
      {chartState !== 'ready' && (
        <div
          role={chartState === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 10,
            background: 'var(--color-surface-2)',
            color: 'var(--color-ink-subtle)',
            fontSize: 12,
          }}
        >
          {chartState === 'error' ? '图表暂时无法加载，请刷新页面重试' : '图表加载中'}
        </div>
      )}
    </div>
  )
}

/** 本月课酬图表：4 周课时 + 课酬双柱 */
function SalaryChart({ month }: { month?: MonthData }) {
  const weeks = useMemo(() => month?.weeks ?? [], [month?.weeks])
  const option = useMemo<echarts.EChartsOption>(() => ({
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#103932',
      borderWidth: 0,
      padding: [8, 12],
      textStyle: { color: '#FAF8F5', fontSize: 12 },
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const arr = (Array.isArray(params) ? params : [params]) as Array<{ seriesName?: string; value?: number; name?: string }>
        const weekName = arr[0]?.name || ''
        const hours = arr.find((p) => p.seriesName?.includes('课时'))?.value ?? 0
        const pay = arr.find((p) => p.seriesName?.includes('课酬'))?.value ?? 0
        if (hours === 0 && pay === 0) {
          return `<div style="font-weight:700;margin-bottom:2px;">${weekName} · 未开始</div><div style="font-size:11px;opacity:0.8;">排课进行中，课后打卡即时计入</div>`
        }
        return `
          <div style="font-weight:700;margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:3px;">${weekName} · 教学结算已闭环</div>
          <div style="display:flex;justify-content:space-between;gap:12px;font-size:11px;line-height:1.6;"><span>授课课时:</span><strong style="color:#6ee7b7;">${hours} 小时</strong></div>
          <div style="display:flex;justify-content:space-between;gap:12px;font-size:11px;line-height:1.6;"><span>预估课酬:</span><strong style="color:#fde047;">¥${pay}</strong></div>
          <div style="font-size:10px;color:#a7f3d0;margin-top:3px;">✓ 考勤已核准 · 等级津贴已生效</div>
        `
      },
    },
    legend: {
      data: ['课时(h)', '课酬(¥)'],
      top: 0,
      right: 4,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: '#756A58', fontSize: 11 },
    },
    grid: { left: 4, right: 4, top: 28, bottom: 4, containLabel: true },
    xAxis: {
      type: 'category',
      data: weeks.length > 0 ? weeks.map((w) => w.label) : ['第1周', '第2周', '第3周', '第4周'],
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#EFEAE2' } },
      axisLabel: { color: '#756A58', fontSize: 11 },
    },
    yAxis: [
      {
        type: 'value',
        name: '课时',
        nameTextStyle: { color: '#756A58', fontSize: 11 },
        splitLine: { lineStyle: { color: '#F2EDE5', type: 'dashed' } },
        axisLabel: { color: '#756A58', fontSize: 11 },
      },
      {
        type: 'value',
        splitLine: { show: false },
        axisLabel: { color: '#756A58', fontSize: 11, formatter: (v: number) => `¥${Math.abs(v)}` },
      },
    ],
    series: [
      {
        name: '课时(h)',
        type: 'bar',
        data: weeks.map((w) => w.hours),
        barWidth: 12,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#2B8374' },
              { offset: 1, color: '#14574D' },
            ],
            global: false,
          },
        },
      },
      {
        name: '课酬(¥)',
        type: 'bar',
        yAxisIndex: 1,
        data: weeks.map((w) => w.pay),
        barWidth: 12,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#E5C479' },
              { offset: 1, color: '#C9A45C' },
            ],
            global: false,
          },
        },
      },
    ],
  }), [weeks])
  if (!month) return <BrandEmpty title="暂无课酬数据" icon={<ClockCircleOutlined />} />
  return <EChart option={option} />
}

/** 出勤趋势图表：4 周出勤率柱状 */
function AttendanceChart({ month }: { month?: AttendanceMonthData }) {
  const weeks = useMemo(() => month?.weeks ?? [], [month?.weeks])
  const option = useMemo<echarts.EChartsOption>(() => ({
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#103932',
      borderWidth: 0,
      textStyle: { color: '#FAF8F5', fontSize: 11 },
      formatter: (params: unknown) => {
        const item = (Array.isArray(params) ? params[0] : params) as { name?: string; value?: unknown }
        return `${item.name}<br/>出勤率：${item.value == null ? '暂无课程' : item.value + '%'}`
      },
    },
    grid: { left: 4, right: 4, top: 28, bottom: 4, containLabel: true },
    xAxis: {
      type: 'category',
      data: weeks.length > 0 ? weeks.map((w) => w.label) : ['第1周', '第2周', '第3周', '第4周'],
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#EFEAE2' } },
      axisLabel: { color: '#756A58', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      max: 100,
      splitLine: { lineStyle: { color: '#F2EDE5', type: 'dashed' } },
      axisLabel: { color: '#756A58', fontSize: 10, formatter: '{value}%' },
    },
    series: [
      {
        name: '出勤率',
        type: 'bar',
        data: weeks.map((w) => w.rate),
        barWidth: 18,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#38967F' },
              { offset: 1, color: '#14574D' },
            ],
            global: false,
          },
        },
        label: {
          show: true,
          position: 'top',
          color: '#14574D',
          fontWeight: 700,
          fontSize: 11,
          formatter: (p: { value?: unknown }) => (p.value == null ? '' : String(p.value) + '%'),
        },
      },
    ],
  }), [weeks])
  if (!month) return <BrandEmpty title="暂无出勤数据" icon={<CheckCircleOutlined />} />
  return <EChart option={option} />
}

/** 本周教学闭环达成成就勋章元数据 */
const COMPLETION_TIER_ACHIEVEMENT: Record<
  TeacherTier,
  {
    sealTitle: string
    sealIcon: string
    title: string
    desc: string
    rewardPill: string
    borderColor: string
    bgGradient: string
  }
> = {
  ELITE: {
    sealTitle: '名师典范',
    sealIcon: '👑',
    title: '本周教学闭环 100% · 师表典范已达成',
    desc: '招牌课次与随堂反馈全部闭环 · 专属特聘课酬与名师信誉加成已全额锁定',
    rewardPill: '名师津贴全额锁定',
    borderColor: 'rgba(201, 164, 92, 0.45)',
    bgGradient: 'linear-gradient(135deg, #fdfbf7 0%, #f7f1e4 100%)',
  },
  SENIOR: {
    sealTitle: '卓越示范',
    sealIcon: '⭐',
    title: '本周教学闭环 100% · 骨干卓越履约',
    desc: '示范课考勤与反馈零滞留 · 教学督导闭环积分 +50 分已自动入档',
    rewardPill: '骨干督导积分 +50',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    bgGradient: 'linear-gradient(135deg, #fcf9f2 0%, #f6eee0 100%)',
  },
  EXPERIENCED: {
    sealTitle: '笃行精进',
    sealIcon: '🌿',
    title: '本周教学闭环 100% · 班课严谨结清',
    desc: '随堂考勤、反馈与作业批改全部结清 · 家校满意度与出勤率稳步提升',
    rewardPill: '家长满意度 100%',
    borderColor: 'rgba(20, 87, 77, 0.3)',
    bgGradient: 'linear-gradient(135deg, #f7faf8 0%, #eaf5f0 100%)',
  },
  NEW: {
    sealTitle: '璞玉初成',
    sealIcon: '🌱',
    title: '新师首周闭环 100% · 新锐起航通关',
    desc: '新手备课、到勤与课后反馈全部过关 · 带教导师综合评价：优秀',
    rewardPill: '带教过关评定：优秀',
    borderColor: 'rgba(74, 222, 128, 0.4)',
    bgGradient: 'linear-gradient(135deg, #f5fbf7 0%, #e7f5ec 100%)',
  },
  MANAGER: {
    sealTitle: '治学全局',
    sealIcon: '🛡️',
    title: '本周教务督导 100% · 校区运转优良',
    desc: '全校区教学闭环与课后考勤全部核准完毕，教学质量稳定受控',
    rewardPill: '督导闭环已归档',
    borderColor: 'rgba(124, 107, 196, 0.4)',
    bgGradient: 'linear-gradient(135deg, #f8f6fc 0%, #ede6f7 100%)',
  },
}

/** 本周完成度：优雅紧凑进度与闭环荣誉成就 */
function CompletionSection({
  completion,
  tier = 'NEW',
}: {
  completion: DashboardData['weekCompletion']
  tier?: TeacherTier
}) {
  const isAllZero = !completion.attendance.total && !completion.classroomFeedback.total && !completion.parentMessages.total
  const ach = COMPLETION_TIER_ACHIEVEMENT[tier] || COMPLETION_TIER_ACHIEVEMENT.NEW

  if (isAllZero) {
    return (
      <div
        className={styles.completionTrophyCard}
        style={{
          border: `1px solid ${ach.borderColor}`,
          background: ach.bgGradient,
        }}
      >
        <div className={styles.trophySealWrap}>
          <div className={styles.trophySealRing}>
            <span className={styles.trophySealIcon}>{ach.sealIcon}</span>
          </div>
          <span className={styles.trophySealText}>{ach.sealTitle}</span>
        </div>

        <div className={styles.trophyBody}>
          <div className={styles.trophyHeader}>
            <span className={styles.trophyTitle}>{ach.title}</span>
            <Tooltip title="本周教学闭环达标率 100%：当周所有已结束课程的到勤打卡、随堂反馈与家校答疑均在考核时效内圆满完成。">
              <InfoCircleOutlined className={styles.trophyInfoIcon} />
            </Tooltip>
          </div>
          <p className={styles.trophyDesc}>{ach.desc}</p>
          <div className={styles.trophyMetaRow}>
            <span className={styles.trophyRewardBadge}>
              <CheckCircleOutlined style={{ fontSize: 11 }} /> {ach.rewardPill}
            </span>
            <Tooltip title="统计口径：已自动清空本周待办，无需任何补录或额外操作">
              <span className={styles.trophyClearHint}>待办已全部清空 ✓</span>
            </Tooltip>
          </div>
        </div>
      </div>
    )
  }

  const items = [
    {
      label: '考勤提交',
      item: completion.attendance,
      color: '#14574D',
      tooltip: '结课后 30 分钟内完成到勤确认，直接保障当期课时与课酬准时核算',
    },
    {
      label: '课堂反馈',
      item: completion.classroomFeedback,
      color: '#C9A45C',
      tooltip: '随堂学情成长档案会即时推送到家长端，是促成续报的关键依据',
    },
    {
      label: '家长留言',
      item: completion.parentMessages,
      color: '#E8784A',
      tooltip: '家校消息平均响应时效监控，名师专线享受优先置顶与提醒保障',
    },
  ]

  return (
    <div className={styles.completionRingsRow}>
      {items.map(({ label, item, color, tooltip }) => (
        <div key={label} className={styles.completionRingItem}>
          <Tooltip title={tooltip}>
            <div style={{ position: 'relative', cursor: 'help' }}>
              <Progress
                type="circle"
                size={68}
                percent={item.total ? item.percent : 100}
                strokeColor={color}
                trailColor="#F0EBE3"
                strokeWidth={7}
                format={(p) => (
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1201' }}>
                    {item.total ? `${p}%` : '达标'}
                  </span>
                )}
              />
              <span className={styles.ringTooltipBadge}>
                <InfoCircleOutlined />
              </span>
            </div>
          </Tooltip>
          <span className={styles.completionRingLabel}>{label}</span>
          <span className={styles.completionRingSub}>
            {item.total ? `${item.done}/${item.total}项` : '已结清'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function TeacherDashboardPage() {
  const router = useRouter()
  const [analyticsTab, setAnalyticsTab] = useState<'salary' | 'attendance'>('salary')
  const [salaryMonthKey, setSalaryMonthKey] = useState<string | undefined>()
  const [attendanceMonthKey, setAttendanceMonthKey] = useState<string | undefined>()
  const [isUpcomingExpanded, setIsUpcomingExpanded] = useState<boolean>(false)
  const [workflowTab, setWorkflowTab] = useState<'frequent' | 'exclusive'>('frequent')

  const { data, isLoading, mutate } = useSWR<DashboardData>('/api/teacher/dashboard', fetcher, {
    refreshInterval: 180_000,
    dedupingInterval: 30_000,
    keepPreviousData: true,
    revalidateOnFocus: true,
  })

  const { data: messageUnreadData } = useSWR<{ count: number }>('/api/messages/unread-count', fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })

  const { data: intensiveData } = useSWR<{
    groups?: Array<{
      id: string
      name: string
      subject: string
      lessons?: Array<{
        id: string
        reviewStatus?: string
        latestReview?: { reviewNote?: string | null } | null
      }>
    }>
  }>('/api/teacher/intensive-lessons', fetcher, {
    refreshInterval: 60_000,
    dedupingInterval: 30_000,
  })

  const rejectedIntensives = useMemo(() => {
    if (!intensiveData?.groups) return []
    return intensiveData.groups.flatMap((g) =>
      (g.lessons || []).filter((l) => l.reviewStatus === 'REJECTED').map((l) => ({
        ...l,
        groupName: g.name,
        subject: g.subject,
      }))
    )
  }, [intensiveData])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetch('/api/teacher/dashboard', { method: 'POST' }).catch((error) =>
        console.warn('教师仪表盘状态同步失败', error)
      )
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [])

  if (isLoading) return <TeacherDashboardSkeleton />
  if (!data?.teacher) return <BrandEmpty title="未找到教师信息" icon={<UserOutlined />} />

  const { teacher, heroStats, todayLessons, nextLessons = [], nextLessonDate, weekCompletion, monthlyStats, attendanceByMonth, salaryByMonth } = data
  const showingUpcoming = todayLessons.length === 0 && nextLessons.length > 0
  const scheduleLessons = todayLessons.length > 0 ? todayLessons : nextLessons
  const scheduleDateLabel = showingUpcoming ? formatScheduleDate(nextLessonDate) : ''
  const daysUntilNextLesson = showingUpcoming ? calculateDaysUntil(nextLessonDate) : null
  const scheduleHref = todayLessons.length > 0 ? '/teacher/today-lessons' : '/teacher/schedule'
  const tier = resolveTier(teacher.tierLevel)
  const tierTheme = TIER_THEME[tier]

  // 月下拉默认当前月（最后一个），有数据优先
  const salaryMonths = salaryByMonth || []
  const attendanceMonths = attendanceByMonth || []
  const defaultMonthKey = salaryMonths.length ? salaryMonths[salaryMonths.length - 1].key : undefined
  const selectedSalaryKey = salaryMonthKey ?? defaultMonthKey
  const selectedAttendanceKey = attendanceMonthKey ?? defaultMonthKey
  const selectedSalaryMonth = salaryMonths.find((m) => m.key === selectedSalaryKey)
  const selectedAttendanceMonth = attendanceMonths.find((m) => m.key === selectedAttendanceKey)

  // 课程列表分流：第一节核心焦点卡 + 其余收拢
  const featuredLesson = scheduleLessons[0]
  const remainingLessons = scheduleLessons.slice(1)

  // 常用高频教学工作流（全等级通用）
  const frequentQuickActions = [
    { label: '录入考勤', desc: '到勤打卡与闭环', href: '/teacher/attendance', icon: <CheckCircleOutlined />, iconClass: styles.quickIconBoxGreen },
    { label: '发布反馈', desc: '随堂成长档案', href: '/teacher/feedback', icon: <MessageOutlined />, iconClass: styles.quickIconBoxGold },
    { label: '我的课表', desc: '周日程与排课', href: '/teacher/schedule', icon: <CalendarOutlined />, iconClass: styles.quickIconBoxBlue },
    { label: '薪酬福利', desc: '课时与课酬明细', href: '/teacher/salary', icon: <FileDoneOutlined />, iconClass: styles.quickIconBoxGold },
    { label: '在带学员', desc: '学生档案与学情', href: '/teacher/students', icon: <TeamOutlined />, iconClass: styles.quickIconBoxOrange },
    { label: '备课资料', desc: '教学教材资源库', href: '/teacher/materials', icon: <FolderOpenOutlined />, iconClass: styles.quickIconBoxGreen },
  ]

  // 各等级专属工作流特性（依等级提供差异化赋能工具，精炼字数杜绝窄屏截断）
  const tierExclusiveActions: Record<string, Array<{ label: string; desc: string; href: string; icon: React.ReactNode; iconClass: string; badge?: string }>> = {
    ELITE: [
      { label: 'VIP约课', desc: '1对1专属通道', href: '/teacher/intensive', icon: <CrownOutlined />, iconClass: styles.quickIconBoxGold, badge: '特权' },
      { label: '名师讲义', desc: '专属课件发布', href: '/teacher/lesson-previews', icon: <FileTextOutlined />, iconClass: styles.quickIconBoxGreen, badge: '讲义' },
      { label: '家校专线', desc: 'VIP家长通道', href: '/teacher/messages', icon: <MessageFilled />, iconClass: styles.quickIconBoxGold, badge: '优先' },
      { label: '薪酬特约', desc: '预支通道与津贴', href: '/teacher/compensation', icon: <DollarOutlined />, iconClass: styles.quickIconBoxOrange, badge: '绿通' },
      { label: '在带VIP', desc: '专属门生学情', href: '/teacher/students', icon: <TeamOutlined />, iconClass: styles.quickIconBoxGreen, badge: '门生' },
      { label: 'AI备课', desc: '深度教研加速', href: '/teacher/ai', icon: <BulbOutlined />, iconClass: styles.quickIconBoxGold, badge: '加速' },
    ],
    SENIOR: [
      { label: '试卷题库', desc: '月考期末真题', href: '/teacher/papers', icon: <FileImageOutlined />, iconClass: styles.quickIconBoxGold, badge: '真题' },
      { label: '请假协同', desc: '调代课教务审批', href: '/teacher/leave', icon: <CalendarOutlined />, iconClass: styles.quickIconBoxGreen, badge: '协同' },
      { label: '学情全景', desc: '学生深度追踪', href: '/teacher/students', icon: <TeamOutlined />, iconClass: styles.quickIconBoxOrange, badge: '预警' },
      { label: '薪酬明细', desc: '课时津贴核对', href: '/teacher/salary', icon: <FileDoneOutlined />, iconClass: styles.quickIconBoxGold, badge: '资深' },
      { label: '骨干资料', desc: '示范教学资源库', href: '/teacher/materials', icon: <FolderOpenOutlined />, iconClass: styles.quickIconBoxGreen, badge: '课件' },
      { label: '单次反馈', desc: '重点课堂点评', href: '/teacher/single-session-feedback', icon: <EditOutlined />, iconClass: styles.quickIconBoxGold, badge: '育人' },
    ],
    EXPERIENCED: [
      { label: '课堂互动', desc: '随堂抽问表彰', href: '/teacher/interaction', icon: <BulbOutlined />, iconClass: styles.quickIconBoxGreen, badge: '提效' },
      { label: '课后作业', desc: '作业布置批改', href: '/teacher/homework', icon: <ReadOutlined />, iconClass: styles.quickIconBoxGold, badge: '闭环' },
      { label: '晚辅工作台', desc: '答疑与督导', href: '/teacher/study-hall', icon: <EditOutlined />, iconClass: styles.quickIconBoxOrange, badge: '督学' },
      { label: '仿真实验', desc: 'PhET互动实验', href: '/teacher/phet', icon: <ExperimentOutlined />, iconClass: styles.quickIconBoxGreen, badge: '教具' },
      { label: '在带学员', desc: '学生档案学情', href: '/teacher/students', icon: <TeamOutlined />, iconClass: styles.quickIconBoxGold, badge: '学情' },
      { label: '备课资料', desc: '微课资料库', href: '/teacher/materials', icon: <FolderOpenOutlined />, iconClass: styles.quickIconBoxGreen, badge: '提速' },
    ],
    NEW: [
      { label: '备课指南', desc: '新手备课标准', href: '/teacher/dashboard?guide=1', icon: <CompassOutlined />, iconClass: styles.quickIconBoxGreen, badge: '指南' },
      { label: 'AI助教', desc: '智能生成教案草稿', href: '/teacher/ai', icon: <BulbOutlined />, iconClass: styles.quickIconBoxGold, badge: '助教' },
      { label: '就餐上报', desc: '工作日报餐', href: '/teacher/meals', icon: <CoffeeOutlined />, iconClass: styles.quickIconBoxOrange, badge: '福利' },
      { label: '带教导师', desc: '教学疑难答疑', href: '/teacher/messages', icon: <HeartOutlined />, iconClass: styles.quickIconBoxGreen, badge: '导师' },
      { label: '我的课表', desc: '提前确认开课', href: '/teacher/schedule', icon: <CalendarOutlined />, iconClass: styles.quickIconBoxGreen, badge: '开课' },
      { label: '新生学情', desc: '熟悉首批学员', href: '/teacher/students', icon: <TeamOutlined />, iconClass: styles.quickIconBoxGold, badge: '新生' },
    ],
    MANAGER: [
      { label: '教务督导', desc: '教学质量把关', href: '/teacher/schedule', icon: <CrownOutlined />, iconClass: styles.quickIconBoxPurple, badge: '管理' },
      { label: '请假协同', desc: '请假代课审批', href: '/teacher/leave', icon: <CalendarOutlined />, iconClass: styles.quickIconBoxGold, badge: '审批' },
      { label: '就餐统计', desc: '就餐上报统筹', href: '/teacher/meals', icon: <CoffeeOutlined />, iconClass: styles.quickIconBoxGreen, badge: '统筹' },
      { label: '薪酬统筹', desc: '课时核算工资', href: '/teacher/compensation', icon: <DollarOutlined />, iconClass: styles.quickIconBoxOrange, badge: '把关' },
      { label: '学员总览', desc: '全校学员档案', href: '/teacher/students', icon: <TeamOutlined />, iconClass: styles.quickIconBoxGreen, badge: '视野' },
      { label: '试卷题库', desc: '教研真题入库', href: '/teacher/papers', icon: <FileImageOutlined />, iconClass: styles.quickIconBoxGold, badge: '题库' },
    ],
  }

  const activeQuickActions = workflowTab === 'exclusive'
    ? (tierExclusiveActions[tier] || tierExclusiveActions.NEW)
    : frequentQuickActions

  return (
    <PullToRefresh onRefresh={async () => { await mutate() }}>
      <div className={styles.dashboardContainer}>
        <MessageWorkflowNotice audience="teacher" deferMs={1400} />
        <QuickStartGuide storageKey={`mz_teacher_quick_start_v1_${teacher.id}`} title="三步开始今天的教学工作" steps={TEACHER_QUICK_STEPS} />

        {/* ---------------- 1. 典雅高能 Hero ---------------- */}
        <section
          className={`${styles.hero} teacher-dashboard-hero teacher-dashboard-hero--${tier.toLowerCase()}`}
          style={{
            background: tierTheme.heroBg,
            border: tierTheme.border,
            boxShadow: tierTheme.shadow,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* 梯队专属东方雅致暗纹与流光光晕 */}
          <div
            style={{
              position: 'absolute',
              top: '-35%',
              right: '-15%',
              width: 280,
              height: 280,
              background: `radial-gradient(circle, ${tierTheme.glowColor}, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />
          {tierTheme.patternType === 'elite' ? (
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.065, pointerEvents: 'none' }} aria-hidden="true">
              <defs>
                <pattern id="teacher-pattern-elite" width="28" height="28" patternUnits="userSpaceOnUse">
                  <path d="M14 0 L28 14 L14 28 L0 14 Z" fill="none" stroke="#F6E9C8" strokeWidth="0.8" />
                  <circle cx="14" cy="14" r="3.5" fill="none" stroke="#C9A45C" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#teacher-pattern-elite)" />
            </svg>
          ) : tierTheme.patternType === 'senior' ? (
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07, pointerEvents: 'none' }} aria-hidden="true">
              <defs>
                <pattern id="teacher-pattern-senior" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M0 16 Q16 0 32 16 Q16 32 0 16 Z" fill="none" stroke="#FDE68A" strokeWidth="0.85" />
                  <circle cx="16" cy="16" r="2.5" fill="#F59E0B" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#teacher-pattern-senior)" />
            </svg>
          ) : tierTheme.patternType === 'experienced' ? (
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.065, pointerEvents: 'none' }} aria-hidden="true">
              <defs>
                <pattern id="teacher-pattern-experienced" width="32" height="22" patternUnits="userSpaceOnUse">
                  <path d="M0 11 Q8 0 16 11 T32 11" fill="none" stroke="#38BDF8" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#teacher-pattern-experienced)" />
            </svg>
          ) : (
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.065, pointerEvents: 'none' }} aria-hidden="true">
              <defs>
                <pattern id="teacher-pattern-new" width="28" height="20" patternUnits="userSpaceOnUse">
                  <path d="M0 10 Q7 0 14 10 T28 10" fill="none" stroke="#4ADE80" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#teacher-pattern-new)" />
            </svg>
          )}

          <div className={styles.heroContent} style={{ position: 'relative', zIndex: 1 }}>
            <div
              className={styles.heroHeaderRow}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                width: '100%',
              }}
            >
              <div className={styles.heroIdentity} style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.heroDateBadge}>
                  <CalendarOutlined /> {dateText()}
                </div>
                <div className={styles.heroTitleRow}>
                  <h1 className={`${styles.heroTitle} heroTitle`} style={{ color: '#ffffff' }}>
                    {teacher.name}老师，{getGreeting()}
                  </h1>
                  <span
                    className={styles.heroTierBadge}
                    style={{
                      background: tierTheme.badgeBg,
                      color: tierTheme.badgeColor,
                      border: tierTheme.badgeBorder,
                      boxShadow: tierTheme.badgeShadow,
                    }}
                  >
                    <span>{tierTheme.label}</span>
                  </span>
                </div>
                <div className={styles.heroSubtext}>
                  {tierTheme.motto}
                </div>
              </div>

              {/* 教师专属肖像照片卡片（带梯队专属双层流光光环） */}
              <div
                className={styles.heroTeacherPhotoWrap}
                onClick={() => router.push('/teacher/services')}
                role="button"
                tabIndex={0}
                title="查看教师个人服务与档案"
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  cursor: 'pointer',
                  marginTop: 2,
                }}
              >
                <div
                  className={styles.heroTeacherPhotoRing}
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: '50%',
                    padding: 2,
                    background: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    boxShadow: tierTheme.avatarHalo,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getTeacherAvatarUrl(teacher.avatar, teacher.gender, teacher.id)}
                    alt={teacher.name}
                    className={styles.heroTeacherPhoto}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      objectPosition: 'center 18%',
                      display: 'block',
                    }}
                  />
                </div>
                <span
                  className={styles.heroTeacherTierDot}
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 19,
                    height: 19,
                    borderRadius: '50%',
                    background: tierTheme.badgeBg,
                    color: tierTheme.badgeColor,
                    fontSize: 10,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid #ffffff',
                    boxShadow: tierTheme.badgeShadow,
                    lineHeight: 1,
                  }}
                  title={tierTheme.name}
                >
                  ★
                </span>
              </div>
            </div>

            {/* 4 个可点击磁吸待办指标卡（微晶底板 + 浮水印 + 流光字阶） */}
            <div className={styles.heroKpiGrid}>
              <div
                className={styles.heroKpiPod}
                onClick={() => router.push(scheduleHref)}
                role="button"
                tabIndex={0}
                style={{
                  background: tierTheme.kpiBg,
                  border: tierTheme.kpiBorder,
                  boxShadow: tierTheme.kpiHighlight,
                }}
              >
                <CalendarOutlined className={styles.heroKpiWatermark} style={{ color: tierTheme.kpiWatermarkColor }} aria-hidden="true" />
                <div className={styles.heroKpiValue}>
                  <strong style={{ background: tierTheme.kpiNumberGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    <AnimatedNumber value={heroStats.todayLessons} />
                  </strong>
                  <span className={styles.heroKpiSuffix}>节</span>
                </div>
                <div className={styles.heroKpiLabel}>今日课次</div>
              </div>

              <div
                className={styles.heroKpiPod}
                onClick={() => router.push('/teacher/attendance')}
                role="button"
                tabIndex={0}
                style={{
                  background: tierTheme.kpiBg,
                  border: tierTheme.kpiBorder,
                  boxShadow: tierTheme.kpiHighlight,
                }}
              >
                <CheckCircleOutlined className={styles.heroKpiWatermark} style={{ color: tierTheme.kpiWatermarkColor }} aria-hidden="true" />
                <div className={styles.heroKpiValue}>
                  <strong style={{ background: tierTheme.kpiNumberGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    <AnimatedNumber value={heroStats.pendingAttendance} />
                  </strong>
                  <span className={styles.heroKpiSuffix}>节</span>
                  {heroStats.pendingAttendance > 0 && <span className={styles.heroKpiAlertDot} />}
                </div>
                <div className={styles.heroKpiLabel}>待考勤</div>
              </div>

              <div
                className={styles.heroKpiPod}
                onClick={() => router.push('/teacher/feedback')}
                role="button"
                tabIndex={0}
                style={{
                  background: tierTheme.kpiBg,
                  border: tierTheme.kpiBorder,
                  boxShadow: tierTheme.kpiHighlight,
                }}
              >
                <MessageOutlined className={styles.heroKpiWatermark} style={{ color: tierTheme.kpiWatermarkColor }} aria-hidden="true" />
                <div className={styles.heroKpiValue}>
                  <strong style={{ background: tierTheme.kpiNumberGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    <AnimatedNumber value={heroStats.pendingFeedback} />
                  </strong>
                  <span className={styles.heroKpiSuffix}>条</span>
                  {heroStats.pendingFeedback > 0 && <span className={styles.heroKpiAlertDot} />}
                </div>
                <div className={styles.heroKpiLabel}>待发反馈</div>
              </div>

              <div
                className={styles.heroKpiPod}
                onClick={() => router.push('/teacher/messages')}
                role="button"
                tabIndex={0}
                style={{
                  background: tierTheme.kpiBg,
                  border: tierTheme.kpiBorder,
                  boxShadow: tierTheme.kpiHighlight,
                }}
              >
                <AlertOutlined className={styles.heroKpiWatermark} style={{ color: tierTheme.kpiWatermarkColor }} aria-hidden="true" />
                <div className={styles.heroKpiValue}>
                  <strong style={{ background: tierTheme.kpiNumberGradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    <AnimatedNumber value={heroStats.totalTodos} />
                  </strong>
                  <span className={styles.heroKpiSuffix}>项</span>
                </div>
                <div className={styles.heroKpiLabel}>全部待办</div>
              </div>
            </div>
          </div>

          <div className={styles.heroWeatherStrip} style={{ position: 'relative', zIndex: 1 }}>
            <WeatherHeroStrip audience="teacher" compact variant="dark" />
          </div>
        </section>

        {/* ---------------- 2. 主辅双列平衡栅格 ---------------- */}
        <div className={styles.dashboardGrid}>
          {/* 左列：即时教学安排 + 常用教学工作流 */}
          <div className={styles.mainColumn}>
            {/* VIP个性化授课驳回警告横幅 */}
            {rejectedIntensives.length > 0 && (
              <div style={{
                margin: '0 0 16px',
                padding: '12px 16px',
                borderRadius: 14,
                background: '#FEF2F2',
                border: '1.5px solid #FCA5A5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <AlertOutlined style={{ color: '#DC2626', fontSize: 18 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#991B1B' }}>
                      您有 {rejectedIntensives.length} 节 VIP 授课记录被管理员驳回，需核对后重新提交
                    </div>
                    <div style={{ fontSize: 12, color: '#B91C1C', marginTop: 2 }}>
                      {rejectedIntensives[0].groupName}（{rejectedIntensives[0].subject}）：{rejectedIntensives[0].latestReview?.reviewNote || '授课时长或考勤信息有误，请核实修改'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push('/teacher/intensive')}
                  style={{
                    background: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  前往修改重提
                </button>
              </div>
            )}

            {/* 核心日程卡片 */}
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitleGroup}>
                  <h2 className={styles.cardTitle}>{showingUpcoming ? '下次教学安排' : '今日教学安排'}</h2>
                  {scheduleDateLabel && <span className={styles.cardSubtitle}>（{scheduleDateLabel}）</span>}
                </div>
                <button
                  type="button"
                  className={styles.cardActionLink}
                  onClick={() => router.push(scheduleHref)}
                >
                  完整课表 <RightOutlined style={{ fontSize: 10 }} />
                </button>
              </div>

              <div className={styles.cardBody}>
                {showingUpcoming && (
                  <div className={styles.upcomingNoticeBanner}>
                    <div className={styles.upcomingNoticeLeft}>
                      <span className={styles.upcomingNoticeIcon}>
                        <ClockCircleOutlined />
                      </span>
                      <span className={styles.upcomingNoticeText}>
                        今日暂无排课 · 距下次开课还剩
                      </span>
                    </div>
                    <div className={styles.upcomingNoticeCountdown}>
                      <strong className={styles.upcomingHighlightNum}>
                        {typeof daysUntilNextLesson === 'number' ? daysUntilNextLesson : 2}
                      </strong>
                      <span className={styles.upcomingUnit}>天</span>
                    </div>
                  </div>
                )}

                {featuredLesson ? (
                  <div>
                    {/* 首堂主课次焦点卡 */}
                    {(() => {
                      const displayName = formatCourseDisplayName(featuredLesson.groupName, featuredLesson.courseName)
                      const lessonSubject = featuredLesson.courseName?.match(/(数学|英语|物理|化学|语文|生物|历史|地理|政治)/)?.[1]
                        || featuredLesson.groupName?.match(/(数学|英语|物理|化学|语文|生物|历史|地理|政治)/)?.[1]
                        || teacher.subjects?.match(/(数学|英语|物理|化学|语文|生物|历史|地理|政治)/)?.[1]
                        || ''
                      const isLive = featuredLesson.statusLabel === '上课中'
                      const meta = LESSON_STATUS_META[featuredLesson.statusLabel] || LESSON_STATUS_META['待上课']

                      // 关键业务逻辑：未来课程（待上课）绝对不渲染大绿“录考勤”！
                      const canRecordAttendance = !showingUpcoming && (isLive || featuredLesson.statusLabel === '待考勤')
                      const canGiveFeedback = !showingUpcoming && featuredLesson.attendanceSubmittedAt && !featuredLesson.hasFeedback

                      return (
                        <div className={styles.featuredLessonCard}>
                          {/* 等级专属尊荣微标栏 */}
                          <div className={styles.tierHonorStripe}>
                            <span
                              className={styles.tierHonorTag}
                              style={{
                                background: tierTheme.badgeBg,
                                color: tierTheme.badgeColor,
                                border: tierTheme.badgeBorder,
                              }}
                            >
                              {tier === 'ELITE' && '👑 牧哲学堂专属教师 · 招牌课次'}
                              {tier === 'SENIOR' && '⭐ 资深教师执教 · 严谨示范'}
                              {tier === 'EXPERIENCED' && '🌿 经验教师执教 · 骨干课次'}
                              {tier === 'NEW' && '🌱 新晋教师执教 · 新锐课堂'}
                              {tier === 'MANAGER' && '🛡️ 管理督导教师执教'}
                            </span>
                          </div>

                          <div className={styles.featuredLessonHead}>
                            <div className={styles.featuredLessonTime}>
                              <span className={styles.featuredLessonTimeText}>{featuredLesson.time.replace('-', '–')}</span>
                              <span className={styles.featuredLessonDuration}>40分钟</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {featuredLesson.hasFeedback && (
                                <span style={{
                                  fontSize: 11,
                                  padding: '2px 8px',
                                  borderRadius: 999,
                                  background: '#EAF7F1',
                                  color: '#137A5A',
                                  border: '1px solid rgba(19, 122, 90, 0.25)',
                                  fontWeight: 700,
                                }}>
                                  反馈已结清 ✓
                                </span>
                              )}
                              <span
                                className={styles.featuredLessonStatus}
                                style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}
                              >
                                <span className={styles.statusDot} style={{ background: meta.color }} />
                                {meta.label}
                              </span>
                            </div>
                          </div>

                          <div className={styles.featuredLessonTitleRow}>
                            <div className={styles.featuredLessonTitle}>{displayName}</div>
                            {lessonSubject && (
                              <span className={styles.featuredLessonSubjectTag}>{lessonSubject}</span>
                            )}
                          </div>

                          {/* 一体化温润通栏条（替代零散小灰块） */}
                          <div className={styles.featuredLessonInfoBar}>
                            <div className={styles.infoBarItem}>
                              <EnvironmentOutlined className={styles.infoBarIcon} />
                              <span className={styles.infoBarText}>{featuredLesson.room || '教室待定'}</span>
                            </div>
                            <span className={styles.infoBarDivider}>·</span>
                            <div className={styles.infoBarItem}>
                              <TeamOutlined className={styles.infoBarIcon} />
                              <span className={styles.infoBarText}>在读 <strong>{featuredLesson.studentCount}</strong> 人</span>
                            </div>
                            <span className={styles.infoBarDivider}>·</span>
                            <div className={`${styles.infoBarItem} ${styles.infoBarItemSynced}`}>
                              <CheckCircleOutlined className={styles.infoBarIcon} />
                              <span className={styles.infoBarText}>讲义已同步</span>
                            </div>
                          </div>

                          <div className={styles.featuredLessonActions}>
                            {canRecordAttendance ? (
                              <button
                                type="button"
                                className={styles.btnPrimary}
                                onClick={() => router.push('/teacher/attendance')}
                              >
                                <CheckCircleOutlined style={{ fontSize: 13 }} />
                                <span>录考勤</span>
                              </button>
                            ) : canGiveFeedback ? (
                              <button
                                type="button"
                                className={`${styles.btnPrimary} ${styles.btnGold}`}
                                onClick={() => router.push('/teacher/feedback')}
                              >
                                <MessageOutlined style={{ fontSize: 13 }} />
                                <span>发反馈</span>
                              </button>
                            ) : featuredLesson.hasFeedback ? (
                              <button
                                type="button"
                                className={styles.btnSecondary}
                                onClick={() => router.push(`/teacher/lesson/${featuredLesson.lessonId || featuredLesson.id}`)}
                                style={{ background: '#F4F9F6', color: '#14574D', borderColor: 'rgba(20, 87, 77, 0.2)' }}
                              >
                                <CheckCircleOutlined style={{ fontSize: 13, color: '#14574D' }} />
                                <span>反馈已结清 · 查看详情</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={styles.btnPrimary}
                                onClick={() => router.push(`/teacher/lesson/${featuredLesson.lessonId || featuredLesson.id}`)}
                              >
                                <span>查看教案与详情</span>
                                <RightOutlined style={{ fontSize: 10 }} />
                              </button>
                            )}

                            <button
                              type="button"
                              className={styles.btnSecondary}
                              onClick={() => router.push(scheduleHref)}
                            >
                              <CalendarOutlined style={{ fontSize: 13 }} />
                              <span>查看整日课表</span>
                            </button>
                          </div>
                        </div>
                      )
                    })()}

                    {/* 其余课次：采用折叠收拢，长名字不截断，状态胶囊不挤行 */}
                    {remainingLessons.length > 0 && (
                      <div>
                        <div
                          className={styles.rollupToggleBar}
                          onClick={() => setIsUpcomingExpanded(!isUpcomingExpanded)}
                          role="button"
                          tabIndex={0}
                        >
                          <div className={styles.rollupToggleLeft}>
                            <CalendarOutlined className={styles.rollupToggleIcon} />
                            <span className={styles.rollupToggleTitle}>
                              全天其余 {remainingLessons.length} 节日程
                            </span>
                            <span className={styles.rollupToggleTime}>
                              ({remainingLessons[0].time.split('-')[0]?.trim()}–{remainingLessons[remainingLessons.length - 1].time.split('-')[1]?.trim()})
                            </span>
                          </div>
                          <span className={styles.rollupBadge}>
                            {isUpcomingExpanded ? '收起' : `展开全部 (${remainingLessons.length})`}
                            {isUpcomingExpanded ? <UpOutlined /> : <DownOutlined />}
                          </span>
                        </div>

                        {isUpcomingExpanded && (
                          <div className={styles.compactTimeline}>
                            {remainingLessons.map((lesson) => {
                              const meta = LESSON_STATUS_META[lesson.statusLabel] || LESSON_STATUS_META['待上课']
                              const name = formatCourseDisplayName(lesson.groupName, lesson.courseName)
                              const timeParts = lesson.time.split('-')
                              const startTime = timeParts[0]?.trim() || lesson.time
                              const endTime = timeParts[1]?.trim() || ''

                              return (
                                <div key={lesson.id} className={styles.compactTimelineItem}>
                                  <div className={styles.compactTimelineLeft}>
                                    {/* 优雅小日历时间盒 */}
                                    <div className={styles.compactTimeBox}>
                                      <span className={styles.compactTimeStart}>{startTime}</span>
                                      {endTime && <span className={styles.compactTimeEnd}>{endTime}</span>}
                                    </div>

                                    {/* 课程与班级信息，支持长名称折行，展示完整教室与人数 */}
                                    <div className={styles.compactInfo}>
                                      <div className={styles.compactName}>{name}</div>
                                      <div className={styles.compactMeta}>
                                        <span>{lesson.room || '教室待定'}</span>
                                        <span>·</span>
                                        <span>{lesson.studentCount}人</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* 状态徽标：单行不折行 */}
                                  <span
                                    className={styles.compactStatusBadge}
                                    style={{
                                      background: meta.bg,
                                      color: meta.color,
                                      border: `1px solid ${meta.border}`,
                                    }}
                                  >
                                    {meta.label}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '24px 0', textAlign: 'center' }}>
                    <BrandEmpty title="今日暂无排课" hint="当前没有待上课次，可查看我的学生或备课准备。" icon={<CalendarOutlined />} />
                  </div>
                )}
              </div>
            </div>

            {/* 常用教学工作流 (支持高频与等级专属标签页切换) */}
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitleGroup}>
                  <h2 className={styles.cardTitle}>常用教学工作流</h2>
                  <span className={styles.cardSubtitle}>
                    {workflowTab === 'frequent' ? '高频教学工具' : `${tierTheme.name}专属赋能`}
                  </span>
                </div>
                <div className={styles.workflowSegmented}>
                  <button
                    type="button"
                    className={`${styles.workflowSegmentItem} ${workflowTab === 'frequent' ? styles.workflowSegmentItemActive : ''}`}
                    onClick={() => setWorkflowTab('frequent')}
                  >
                    高频直达
                  </button>
                  <button
                    type="button"
                    className={`${styles.workflowSegmentItem} ${workflowTab === 'exclusive' ? styles.workflowSegmentItemActive : ''}`}
                    onClick={() => setWorkflowTab('exclusive')}
                  >
                    {tier === 'ELITE' && '👑 专属名师'}
                    {tier === 'SENIOR' && '⭐ 资深骨干'}
                    {tier === 'EXPERIENCED' && '🌿 班课提效'}
                    {tier === 'NEW' && '🌱 新锐成长'}
                    {tier === 'MANAGER' && '🛡️ 教务督导'}
                  </button>
                </div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.quickGrid}>
                  {activeQuickActions.map((action) => (
                    <div
                      key={action.label}
                      className={styles.quickTile}
                      onClick={() => router.push(action.href)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className={`${styles.quickIconBox} ${action.iconClass}`}>
                        {action.icon}
                      </div>
                      <div className={styles.quickTileContent}>
                        <div className={styles.quickTileHeader}>
                          <span className={styles.quickTileTitle}>{action.label}</span>
                          {'badge' in action && action.badge && (
                            <span className={styles.quickTileBadge}>{action.badge}</span>
                          )}
                        </div>
                        <span className={styles.quickTileDesc}>{action.desc}</span>
                      </div>
                      <span className={styles.quickTileArrow} aria-hidden="true">
                        <RightOutlined />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 右列：教学闭环完成度 + 数据分析 + 教学概览 */}
          <div className={styles.sideColumn}>
            {/* 本周教学完成度 */}
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitleGroup}>
                  <h2 className={styles.cardTitle}>本周教学完成度</h2>
                  <span className={styles.cardSubtitle}>闭环达标率</span>
                </div>
              </div>
              <div className={styles.cardBody}>
                <CompletionSection completion={weekCompletion} tier={tier} />
              </div>
            </div>

            {/* 教学业绩与数据分析 (数据罗盘与精准提示打磨) */}
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitleGroup}>
                  <h2 className={styles.cardTitle}>教学数据分析</h2>
                  <Tooltip title="数据核算口径：每日凌晨 02:00 自动汇总昨日已完成考勤的真实课时。课酬基于当前等级专属课酬标准核算，每月 15 日打款发放。">
                    <InfoCircleOutlined className={styles.titleInfoTip} />
                  </Tooltip>
                </div>
                <div>
                  {analyticsTab === 'salary' ? (
                    <select
                      className={styles.monthSelect}
                      value={selectedSalaryKey}
                      onChange={(e) => setSalaryMonthKey(e.target.value)}
                    >
                      {salaryMonths.map((m) => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      className={styles.monthSelect}
                      value={selectedAttendanceKey}
                      onChange={(e) => setAttendanceMonthKey(e.target.value)}
                    >
                      {attendanceMonths.map((m) => (
                        <option key={m.key} value={m.key}>{m.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.analyticsHeader}>
                  <div className={styles.analyticsSegmented}>
                    <button
                      type="button"
                      className={`${styles.analyticsSegmentItem} ${analyticsTab === 'salary' ? styles.analyticsSegmentItemActive : ''}`}
                      onClick={() => setAnalyticsTab('salary')}
                    >
                      课时与课酬
                    </button>
                    <button
                      type="button"
                      className={`${styles.analyticsSegmentItem} ${analyticsTab === 'attendance' ? styles.analyticsSegmentItemActive : ''}`}
                      onClick={() => setAnalyticsTab('attendance')}
                    >
                      学员出勤走势
                    </button>
                  </div>
                </div>

                {analyticsTab === 'salary' ? (
                  <div>
                    <SalaryChart month={selectedSalaryMonth} />
                    <div className={styles.analyticsCompass}>
                      <div className={styles.compassCol}>
                        <div className={styles.compassLabelRow}>
                          <span>本月核准课时</span>
                          <Tooltip title="统计本人名下已结课且完成考勤打卡的真实授课时长，包含调课与补课记录。">
                            <InfoCircleOutlined className={styles.compassInfoIcon} />
                          </Tooltip>
                        </div>
                        <div className={styles.compassValueRow}>
                          <strong>{formatHours(selectedSalaryMonth?.weeks.reduce((sum, w) => sum + w.hours, 0) || 0)}</strong>
                          <span className={styles.compassUnit}>小时</span>
                        </div>
                        <div className={styles.compassStatusTag}>
                          <CheckCircleOutlined style={{ fontSize: 11 }} /> 第1周考勤已核准
                        </div>
                      </div>

                      <div className={styles.compassDivider} />

                      <div className={styles.compassCol}>
                        <div className={styles.compassLabelRow}>
                          <span>预估当月课酬</span>
                          <Tooltip title={`当前教师等级【${tierTheme.name}】已激活：包含基准课时、等级特聘津贴系数与满班奖励。`}>
                            <InfoCircleOutlined className={styles.compassInfoIcon} />
                          </Tooltip>
                        </div>
                        <div className={styles.compassValueRow}>
                          <strong style={{ color: '#C9A45C' }}>
                            ¥{(selectedSalaryMonth?.weeks.reduce((sum, w) => sum + w.pay, 0) || 0).toLocaleString('zh-CN')}
                          </strong>
                          <span className={styles.compassUnit}>元</span>
                        </div>
                        <div className={styles.compassRewardTag}>
                          <span>★ {tierTheme.name}课酬已折算</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <AttendanceChart month={selectedAttendanceMonth} />
                    <span style={{ display: 'block', marginTop: 8, fontSize: 11, color: '#756A58' }}>
                      统计历史课堂真实到勤；离班学员历史出勤仍作存档保留。
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 教学概览与家校沟通 (等级专属定制) */}
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <div className={styles.cardTitleGroup}>
                  <h2 className={styles.cardTitle}>教学概览与沟通</h2>
                  <span className={styles.cardSubtitle}>
                    {tier === 'ELITE' && '名师VIP专线'}
                    {tier === 'SENIOR' && '骨干协同沟通'}
                    {tier === 'EXPERIENCED' && '班课家校互动'}
                    {tier === 'NEW' && '新锐带教咨询'}
                    {tier === 'MANAGER' && '校区沟通总览'}
                  </span>
                </div>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.overviewGrid}>
                  <div className={styles.overviewTile}>
                    <div className={styles.overviewTileHead}>
                      <span>
                        {tier === 'ELITE' && 'VIP在带学员'}
                        {tier === 'SENIOR' && '骨干在带学员'}
                        {tier === 'EXPERIENCED' && '在带学员'}
                        {tier === 'NEW' && '首批在带学员'}
                        {tier === 'MANAGER' && '校区在带学员'}
                      </span>
                      <Tooltip title="点击查看在读学员档案、年级分布与阶段学情画像">
                        <div className={styles.overviewIconWrap} style={{ cursor: 'help' }}>
                          <TeamOutlined style={{ color: '#14574D' }} />
                        </div>
                      </Tooltip>
                    </div>
                    <div className={styles.overviewTileValue} style={{ color: '#14574D' }}>
                      {monthlyStats.totalStudents}<span style={{ fontSize: 12, fontWeight: 500 }}> 人</span>
                    </div>
                  </div>

                  <div className={styles.overviewTile}>
                    <div className={styles.overviewTileHead}>
                      <span>
                        {tier === 'ELITE' && '名师执教课时'}
                        {tier === 'SENIOR' && '骨干授课课时'}
                        {tier === 'EXPERIENCED' && '本月授课课时'}
                        {tier === 'NEW' && '新锐实战课时'}
                        {tier === 'MANAGER' && '全校督导课时'}
                      </span>
                      <Tooltip title="本月累计授课真实课时；已按教务规程自动核准已考勤课次">
                        <div className={styles.overviewIconWrap} style={{ cursor: 'help' }}>
                          <ClockCircleOutlined style={{ color: '#14574D' }} />
                        </div>
                      </Tooltip>
                    </div>
                    <div className={styles.overviewTileValue} style={{ color: '#14574D' }}>
                      {formatHours(monthlyStats.monthlyHours)}<span style={{ fontSize: 12, fontWeight: 500 }}> h</span>
                    </div>
                  </div>

                  <div className={styles.overviewTile}>
                    <div className={styles.overviewTileHead}>
                      <span>
                        {tier === 'ELITE' && 'VIP家长专线'}
                        {tier === 'SENIOR' && '重点家校沟通'}
                        {tier === 'EXPERIENCED' && '家校未读'}
                        {tier === 'NEW' && '家长咨询'}
                        {tier === 'MANAGER' && '家校未读留言'}
                      </span>
                      <Tooltip title="当前未读家校互动消息；专属名师与重点学员通道享有优先响应机制">
                        <div className={styles.overviewIconWrap} style={{ background: '#fbf4e3', cursor: 'help' }}>
                          <MessageOutlined style={{ color: '#C9A45C' }} />
                        </div>
                      </Tooltip>
                    </div>
                    <div className={styles.overviewTileValue} style={{ color: '#C9A45C' }}>
                      {Number(messageUnreadData?.count || 0) + Number(data.badges?.unreadMessages || 0)}<span style={{ fontSize: 12, fontWeight: 500 }}> 条</span>
                    </div>
                  </div>

                  <div className={styles.overviewTile}>
                    <div className={styles.overviewTileHead}>
                      <span>
                        {tier === 'ELITE' && '名师专属待办'}
                        {tier === 'SENIOR' && '教研督导待办'}
                        {tier === 'EXPERIENCED' && '待处理事项'}
                        {tier === 'NEW' && '新手成长待办'}
                        {tier === 'MANAGER' && '管理待办事项'}
                      </span>
                      <Tooltip title="今日待办教学任务（包含待考勤打卡、待发随堂反馈与开课确认）">
                        <div className={styles.overviewIconWrap} style={{ background: '#fff1f0', cursor: 'help' }}>
                          <AlertOutlined style={{ color: '#CF1322' }} />
                        </div>
                      </Tooltip>
                    </div>
                    <div className={styles.overviewTileValue} style={{ color: '#CF1322' }}>
                      {heroStats.totalTodos}<span style={{ fontSize: 12, fontWeight: 500 }}> 项</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.overviewActionBtn}
                  onClick={() => router.push('/teacher/messages')}
                >
                  <MessageOutlined style={{ fontSize: 14 }} />
                  <span>
                    {tier === 'ELITE' && '进入名师 VIP 家校专线'}
                    {tier === 'SENIOR' && '打开骨干家校沟通'}
                    {tier === 'EXPERIENCED' && '打开家校消息'}
                    {tier === 'NEW' && '开启带教与家校沟通'}
                    {tier === 'MANAGER' && '进入校区家校消息'}
                  </span>
                  <RightOutlined style={{ fontSize: 11, marginLeft: 'auto', opacity: 0.6 }} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <TeacherNoticeToaster />
      </div>
    </PullToRefresh>
  )
}
