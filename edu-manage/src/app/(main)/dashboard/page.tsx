'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Alert, Badge, Button, Card, Col, Empty, Row, Tag, Typography } from 'antd'
import {
  BookOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  RightOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { DashboardHero } from '@/components/Dashboard/DashboardHero'
import { MetricsCards } from '@/components/Dashboard/MetricsCards'
import { OperationHighlightsCard } from '@/components/Dashboard/OperationHighlightsCard'
import { StudentGrowthChart } from '@/components/Dashboard/StudentGrowthChart'
import { TodayScheduleCard } from '@/components/Dashboard/TodaySchedule'
import { TeacherWorkloadCard } from '@/components/Dashboard/TeacherWorkload'
import { ActivityLogCard } from '@/components/Dashboard/ActivityLog'
import { PendingItemsCard } from '@/components/Dashboard/PendingItemsCard'
import { DashboardSkeleton } from '@/components/Dashboard/DashboardSkeleton'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useDivision } from '@/contexts/DivisionContext'
import { formatHours } from '@/lib/format'
import type { AdminDashboardData, TodaySchedule } from '@/types/dashboard'

const { Text } = Typography

const fetcher = async (url: string): Promise<AdminDashboardData> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('数据总览加载失败')
  }
  return response.json()
}

const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

const statusColors: Record<TodaySchedule['statusLabel'], string> = {
  待上课: '#1677ff',
  上课中: '#1D9E75',
  待考勤: '#E87545',
  已完成: '#98A2B3',
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
    { icon: <CalendarOutlined />, label: '考勤管理', href: '/attendance', badge: metrics.todayLessonsPendingAttendance, color: '#E87545' },
    { icon: <TeamOutlined />, label: '学员管理', href: '/students', color: '#1677ff' },
    { icon: <BookOutlined />, label: '课程管理', href: '/courses', color: '#1D9E75' },
    { icon: <ExclamationCircleOutlined />, label: '待处理', href: '/notifications', badge: metrics.pendingTasks, color: '#722ed1' },
  ]

  const activeHighlights = data.operatingHighlights.filter((highlight) => Number(highlight.value) > 0)

  return (
    <div style={{ paddingBottom: 'calc(88px + env(safe-area-inset-bottom, 0px))', background: '#F7F4F0', minHeight: '100dvh' }}>
      <div style={{
        background: 'linear-gradient(160deg, #FFF2E8 0%, #FFFBF6 100%)',
        padding: '16px 16px 20px',
        borderBottom: '1px solid #F0E6DC',
      }}>
        <div style={{ fontSize: 12, color: '#98A2B3', marginBottom: 2 }}>
          {now.getFullYear()}年{now.getMonth() + 1}月{now.getDate()}日 {weekDays[now.getDay()]}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1201', marginBottom: 4 }}>
          牧哲学堂 · 管理
        </div>
        <div style={{ fontSize: 13, color: '#5a4e3a' }}>
          今日 <strong style={{ color: '#E87545' }}>{metrics.todayLessons}</strong> 节课，
          <strong style={{ color: '#E87545' }}>{metrics.todayLessonsPendingAttendance}</strong> 节待考勤，
          <strong style={{ color: '#722ed1' }}>{metrics.pendingTasks}</strong> 项待处理
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginTop: 14 }}>
          {[
            { label: '在读学员', value: `${metrics.activeStudents}人`, color: '#E87545' },
            { label: '今日课次', value: `${metrics.todayLessons}节`, color: '#1677ff' },
            { label: '本月课时', value: formatHours(metrics.monthlyDeductedHours), color: '#722ed1' },
          ].map((item) => (
            <div key={item.label} style={{
              background: 'rgba(255,255,255,0.78)',
              borderRadius: 12,
              padding: '10px 8px',
              textAlign: 'center',
              border: '1px solid rgba(232,117,69,0.1)',
            }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <section style={{ padding: '14px 16px 0' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#5a4e3a', marginBottom: 10 }}>快捷操作</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
          {quickActions.map((action) => (
            <button
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

      {activeHighlights.length > 0 && (
        <section style={{ padding: '14px 16px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#5a4e3a', marginBottom: 10 }}>运营提醒</div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {activeHighlights.map((item) => {
              const colorMap: Record<string, string> = {
                orange: '#E87545',
                red: '#d9363e',
                blue: '#1677ff',
                purple: '#722ed1',
                green: '#1D9E75',
              }
              const color = colorMap[item.tone] || '#E87545'
              return (
                <button
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
            style={{ fontSize: 12, color: '#E87545', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2 }}
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
                background: scheduleFilter === status ? '#E87545' : '#fff',
                color: scheduleFilter === status ? '#fff' : '#5a4e3a',
                border: `1px solid ${scheduleFilter === status ? '#E87545' : '#EEE7E1'}`,
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
              const color = statusColors[item.statusLabel] || '#98A2B3'
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
                    border: item.statusLabel === '待考勤' ? `1px solid ${color}40` : '1px solid #F0E6DC',
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
                    <span style={{ fontSize: 11, color: '#98A2B3' }}><UserOutlined style={{ marginRight: 3 }} />{item.teacher}</span>
                    <span style={{ fontSize: 11, color: '#98A2B3' }}><TeamOutlined style={{ marginRight: 3 }} />{item.students}人</span>
                    <span style={{ fontSize: 11, color: '#98A2B3' }}><ClockCircleOutlined style={{ marginRight: 3 }} />{item.subject}</span>
                  </div>
                </button>
              )
            })}
            {filteredSchedules.length > 10 && (
              <Button block onClick={() => router.push('/attendance')} style={{ borderRadius: 12, color: '#E87545', fontWeight: 600 }}>
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
  const isMobile = useIsMobile() ?? false
  const { division } = useDivision()
  const { data, error, isLoading } = useSWR(`/api/dashboard?division=${division}`, fetcher, {
    refreshInterval: 120_000,
    revalidateOnFocus: true,
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
    return <MobileDashboard data={data} />
  }

  return (
    <div style={{ paddingBottom: 24 }}>
      <DashboardHero metrics={data.metrics} />
      <MetricsCards data={data.metrics} />
      <OperationHighlightsCard data={data.operatingHighlights} />

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <StudentGrowthChart data={data.growthData} />
        </Col>
        <Col xs={24} lg={8}>
          <TodayScheduleCard data={data.schedules} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={8}>
          <TeacherWorkloadCard data={data.workloads} />
        </Col>
        <Col xs={24} lg={8}>
          <PendingItemsCard data={data.metrics} />
        </Col>
        <Col xs={24} lg={8}>
          <ActivityLogCard data={data.logs} />
        </Col>
      </Row>
    </div>
  )
}
