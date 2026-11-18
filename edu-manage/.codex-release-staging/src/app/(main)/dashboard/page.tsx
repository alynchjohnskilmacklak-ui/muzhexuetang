'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { Alert, Badge, Button, Card, Col, Empty, message, Row, Select, Tag, Typography } from 'antd'
import {
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckSquareOutlined,
  CommentOutlined,
  MessageOutlined,
  RightOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
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
import type { AdminDashboardData, IntensiveAppointment, TodaySchedule } from '@/types/dashboard'
import { QuickStartGuide, type QuickStartStep } from '@/components/Common/QuickStartGuide'

const { Text } = Typography

const ADMIN_QUICK_STEPS: QuickStartStep[] = [
  { title: '先看今日异常', description: '首页会集中显示待考勤、待回复和其他需要及时处理的事项。', actionLabel: '查看考勤', href: '/attendance', icon: <CheckSquareOutlined /> },
  { title: '维护学员与班级', description: '学员归属、课程建班和作业班安排都从真实管理页面完成。', actionLabel: '打开学员管理', href: '/students', icon: <TeamOutlined /> },
  { title: '处理家长沟通', description: '及时查看家长留言和课堂互动，避免重要问题长时间无人跟进。', actionLabel: '查看家长留言', href: '/parent-messages', icon: <CommentOutlined /> },
]

function AdminTodayTodoBar({ data }: { data: AdminDashboardData }) {
  const router = useRouter()
  const items = [
    { label: '今日待考勤', value: data.metrics.todayLessonsPendingAttendance, href: '/attendance', icon: <CheckSquareOutlined /> },
    { label: '家长留言待回复', value: data.metrics.pendingTeacherReplies, href: '/parent-messages', icon: <CommentOutlined /> },
    { label: '未读课堂互动', value: data.metrics.unreadComments, href: '/communications', icon: <MessageOutlined /> },
  ]
  return <Card className="admin-todo-panel" bordered={false} style={{ marginBottom: 16, borderRadius: 14, border: '1px solid var(--color-hairline)', background: 'var(--color-primary-bg)' }} styles={{ body: { padding: 12 } }}>
    <div className="admin-todo-panel__layout">
      <Text className="admin-todo-panel__title" strong>今日待办与异常</Text>
      <div className="admin-todo-panel__items">
        {items.map((item) => (
          <Button
            className="admin-todo-panel__button"
            key={item.label}
            onClick={() => router.push(item.href)}
            icon={item.icon}
          >
            <span className="admin-todo-panel__button-label">{item.label}</span>
            <strong className="admin-todo-panel__count">{item.value}</strong>
          </Button>
        ))}
      </div>
    </div>
  </Card>
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
      bordered={false}
      title={(
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#1a1201' }}>
          <CalendarOutlined style={{ color: '#E8784A' }} />
          教师约课动态
          {items.length > 0 && <Badge count={items.length} style={{ backgroundColor: '#E8784A' }} />}
        </span>
      )}
      extra={(
        <Button type="link" size="small" onClick={() => router.push('/schedule/intensive?section=appointments')}>
          全部 <RightOutlined />
        </Button>
      )}
      style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)' }}
      styles={{ body: { padding: compact ? 12 : 16 } }}
    >
      {items.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无教师约课动态" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.slice(0, compact ? 4 : 6).map((item) => {
            const date = new Date(item.lessonDate)
            const dateLabel = Number.isNaN(date.getTime())
              ? '-'
              : `${date.getMonth() + 1}月${date.getDate()}日`
            return (
              <button
                className="pressable"
                key={item.id}
                onClick={() => router.push(`/schedule/intensive?appointmentLessonId=${encodeURIComponent(item.id)}`)}
                style={{
                  width: '100%',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto',
                  gap: 10,
                  padding: compact ? '11px 12px' : '12px 14px',
                  textAlign: 'left',
                  background: '#fffaf6',
                  border: '1px solid rgba(232,120,74,.16)',
                  borderRadius: 12,
                  cursor: 'pointer',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <strong style={{ color: '#1a1201', fontSize: 14 }}>{item.teacher}</strong>
                    <Tag color="orange" style={{ margin: 0 }}>{item.subject}</Tag>
                    {item.teachingTypeLabel && <Tag color="purple" style={{ margin: 0 }}>{item.teachingTypeLabel}</Tag>}
                    {item.isHistorical && <Tag color="gold" style={{ margin: 0 }}>历史补录</Tag>}
                  </div>
                  <div style={{ marginTop: 5, color: '#5a4e3a', fontSize: 13, overflowWrap: 'anywhere' }}>
                    {item.students.length ? item.students.join('、') : item.groupName}
                  </div>
                  <div style={{ marginTop: 4, color: '#9a8e7a', fontSize: 12 }}>
                    {dateLabel} {item.time} · {item.createdTimeAgo}提交
                  </div>
                </div>
                <div style={{ alignSelf: 'center', color: '#E8784A', fontSize: 12, whiteSpace: 'nowrap' }}>
                  查看 <RightOutlined style={{ fontSize: 10 }} />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </Card>
  )
}


function MobileDashboard({ data }: { data: AdminDashboardData }) {
  const router = useRouter()
  const now = new Date()
  const metrics = data.metrics
  const [scheduleFilter, setScheduleFilter] = useState<TodaySchedule['statusLabel'] | '全部'>('全部')

  const filteredSchedules = useMemo(() => (
    scheduleFilter === '全部'
      ? data.schedules
      : data.schedules.filter((schedule) => schedule.statusLabel === scheduleFilter)
  ), [data.schedules, scheduleFilter])

  const quickActions = [
    { icon: <CalendarOutlined />, label: '考勤管理', href: '/attendance', badge: metrics.todayLessonsPendingAttendance, color: '#E8784A' },
    { icon: <TeamOutlined />, label: '学员管理', href: '/students', color: '#185FA5' },
    { icon: <BookOutlined />, label: '课程管理', href: '/courses', color: '#1D9E75' },
    { icon: <ExclamationCircleOutlined />, label: '运营待办', href: '/dashboard#admin-exception-center', badge: metrics.pendingTasks, color: '#7a7fad' },
  ]

  const activeHighlights = data.operatingHighlights.filter((highlight) => Number(highlight.value) > 0)

  return (
    <div style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))', background: '#faf8f5', minHeight: '100dvh' }}>
      <div style={{
        background: 'linear-gradient(160deg, #FFF2E8 0%, #FFFBF6 100%)',
        padding: '16px 16px 20px',
        borderBottom: '1px solid rgba(0,0,0,.06)',
      }}>
        <div style={{ fontSize: 12, color: '#9a8e7a', marginBottom: 2 }}>
          {now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日 {weekDays[now.getDay()]}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1201', marginBottom: 4 }}>
          牧哲学堂 · 管理
        </div>
        <div style={{ fontSize: 13, color: '#5a4e3a' }}>
          今日 <strong style={{ color: '#E8784A' }}>{metrics.todayLessons}</strong> 节课，
          <strong style={{ color: '#E8784A' }}>{metrics.todayLessonsPendingAttendance}</strong> 节待考勤，
          <strong style={{ color: '#7a7fad' }}>{metrics.pendingTasks}</strong> 项待处理
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 14 }}>
          {[
            { label: '在读学员', value: `${metrics.activeStudents}人`, color: '#E8784A' },
            { label: '今日课次', value: `${metrics.todayLessons}节`, color: '#185FA5' },
            { label: '本月课时', value: formatHours(metrics.monthlyDeductedHours), color: '#7a7fad' },
          ].map((item) => (
            <div key={item.label} style={{
              background: 'rgba(255,255,255,0.78)',
              borderRadius: 12,
              padding: '10px 8px',
              textAlign: 'center',
              border: '1px solid rgba(232,120,74,0.1)',
            }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: 11, color: '#9a8e7a', marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <section style={{ padding: '14px 16px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#5a4e3a', marginBottom: 10 }}>快捷操作</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
          {quickActions.map((action) => (
            <button
              className="pressable"
              key={action.label}
              onClick={() => router.push(action.href)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                minHeight: 72,
                padding: '12px 4px',
                borderRadius: 14,
                background: '#fff',
                border: `1px solid ${action.color}20`,
                cursor: 'pointer',
              }}
            >
              {action.badge && action.badge > 0 ? (
                <Badge count={action.badge} size="small">
                  <div style={{ fontSize: 22, color: action.color }}>{action.icon}</div>
                </Badge>
              ) : (
                <div style={{ fontSize: 22, color: action.color }}>{action.icon}</div>
              )}
              <span style={{ fontSize: 11, color: '#5a4e3a', fontWeight: 600, lineHeight: 1.2 }}>{action.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section style={{ padding: '14px 16px 0' }}>
        <AdminExceptionCenter metrics={metrics} />
      </section>

      <section style={{ padding: '14px 16px 0' }}>
        <IntensiveAppointmentCard items={data.intensiveAppointments} compact />
      </section>

      {activeHighlights.length > 0 && (
        <section style={{ padding: '14px 16px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#5a4e3a', marginBottom: 10 }}>运营提醒</div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {activeHighlights.map((item) => {
              const colorMap: Record<string, string> = {
                orange: '#E8784A',
                red: '#E24B4A',
                blue: '#185FA5',
                purple: '#7a7fad',
                green: '#1D9E75',
              }
              const color = colorMap[item.tone] || '#E8784A'
              return (
                <button
                  className="pressable"
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  style={{
                    flexShrink: 0,
                    padding: '8px 14px',
                    borderRadius: 20,
                    background: `${color}12`,
                    border: `1px solid ${color}30`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 800, color }}>{item.value}</span>
                  <span style={{ fontSize: 12, color: '#5a4e3a' }}>{item.label}</span>
                  <RightOutlined style={{ fontSize: 9, color }} />
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#5a4e3a' }}>今日课表</div>
          <button
            onClick={() => router.push('/attendance')}
            style={{ fontSize: 12, color: '#E8784A', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
          >
            全部 <RightOutlined style={{ fontSize: 10 }} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 8 }}>
          {(['全部', '待上课', '上课中', '待考勤', '已完成'] as Array<TodaySchedule['statusLabel'] | '全部'>).map((status) => (
            <button
              key={status}
              onClick={() => setScheduleFilter(status)}
              style={{
                flexShrink: 0,
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 12,
                background: scheduleFilter === status ? '#E8784A' : '#fff',
                color: scheduleFilter === status ? '#fff' : '#5a4e3a',
                border: `1px solid ${scheduleFilter === status ? '#E8784A' : '#EEE7E1'}`,
                cursor: 'pointer',
                fontWeight: scheduleFilter === status ? 600 : 400,
              }}
            >
              {status}
            </button>
          ))}
        </div>

        {data.schedules.length === 0 ? (
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Empty description="今日暂无课程" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </Card>
        ) : filteredSchedules.length === 0 ? (
          <Card bordered={false} style={{ borderRadius: 12, textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 13 }}>该状态下暂无课程</Text>
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filteredSchedules.slice(0, 10).map((item) => {
              const color = statusColors[item.statusLabel] || '#9a8e7a'
              return (
                <button
                  key={`${item.source}-${item.id}`}
                  onClick={() => router.push('/attendance')}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    background: '#fff',
                    borderRadius: 12,
                    padding: '12px 14px',
                    border: item.statusLabel === '待考勤' ? `1px solid ${color}40` : '1px solid rgba(0,0,0,.06)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1201' }}>{item.time}</span>
                      <div style={{ fontSize: 13, color: '#5a4e3a', marginTop: 2, fontWeight: 500 }}>{item.courseName}</div>
                    </div>
                    <Tag style={{ borderRadius: 20, border: 'none', background: `${color}15`, color, fontWeight: 600, fontSize: 11, flexShrink: 0, marginInlineEnd: 0 }}>
                      {item.statusLabel}
                    </Tag>
                  </div>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: '#9a8e7a' }}><UserOutlined style={{ marginRight: 3 }} />{item.teacher}</span>
                    <span style={{ fontSize: 11, color: '#9a8e7a' }}><TeamOutlined style={{ marginRight: 3 }} />{item.students}人</span>
                    <span style={{ fontSize: 11, color: '#9a8e7a' }}><ClockCircleOutlined style={{ marginRight: 3 }} />{item.subject}</span>
                  </div>
                </button>
              )
            })}
            {filteredSchedules.length > 10 && (
              <Button block onClick={() => router.push('/attendance')} style={{ borderRadius: 12, color: '#E8784A', fontWeight: 600 }}>
                查看全部 {filteredSchedules.length} 节课
              </Button>
            )}
          </div>
        )}
      </section>
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
      <div>
        <div style={{ padding: '10px 16px 0', background: '#faf8f5' }}>
          <Select
            aria-label="切换运营批次"
            value={selectedTermId || undefined}
            placeholder="选择运营批次"
            onChange={(value) => void changeTermScope(value)}
            loading={Boolean(switchingTermId)}
            disabled={Boolean(switchingTermId)}
            style={{ width: '100%' }}
            options={terms.map((term) => ({ label: `${term.name}${term.status === 'ACTIVE' ? '（当前）' : term.status === 'ARCHIVED' ? '（归档）' : ''}`, value: term.id }))}
            getPopupContainer={(trigger) => trigger.parentElement || document.body}
            virtual={false}
          />
          {selectedTerm?.status === 'DRAFT' && (
            <Alert
              type="warning"
              showIcon
              message="当前批次尚未启用，仅供查看"
              action={<Button size="small" onClick={() => router.push('/academic-terms')}>去启用</Button>}
              style={{ marginTop: 10 }}
            />
          )}
          {selectedTerm?.status === 'ARCHIVED' && (
            <Alert type="info" showIcon message="当前正在查看历史归档数据" style={{ marginTop: 10 }} />
          )}
        </div>
        <div style={{ padding: '12px 12px 0', background: 'var(--color-canvas)', width: '100%', maxWidth: '100%' }}>
          <QuickStartGuide storageKey={`mz_admin_quick_start_v1_${division}`} title="三步开始管理工作" steps={ADMIN_QUICK_STEPS} />
          <AdminTodayTodoBar data={data} />
        </div>
        <MobileDashboard data={data} />
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <DashboardHero
        metrics={data.metrics}
        toolbar={(
          <div className="admin-dashboard-term-switcher">
            <span className="admin-dashboard-term-switcher__label">运营批次</span>
            <Select
              aria-label="切换运营批次"
              value={selectedTermId || undefined}
              placeholder="选择运营批次"
              onChange={(value) => void changeTermScope(value)}
              loading={Boolean(switchingTermId)}
              disabled={Boolean(switchingTermId)}
              style={{ width: 220 }}
              options={terms.map((term) => ({ label: `${term.name}${term.status === 'ACTIVE' ? '（当前）' : term.status === 'ARCHIVED' ? '（历史归档）' : '（未启用）'}`, value: term.id }))}
            />
          </div>
        )}
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
