'use client'

import { Card, Row, Col, Statistic, Badge, Progress } from 'antd'
import {
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { formatHours } from '@/lib/format'
import type { AdminDashboardMetrics } from '@/types/dashboard'

const COLORS = {
  orange: '#E87545',
  green: '#1D9E75',
  blue: '#1677ff',
  purple: '#722ed1',
  red: '#d9363e',
}

export function MetricsCards({ data }: { data: AdminDashboardMetrics }) {
  const cards = [
    {
      title: '在读学员',
      value: data.activeStudents,
      suffix: '人',
      icon: <UserOutlined />,
      color: COLORS.orange,
      extra: (
        <span style={{ color: data.studentGrowth >= 0 ? COLORS.green : COLORS.red }}>
          {data.studentGrowth >= 0 ? '+' : ''}{data.studentGrowth}% 本月
        </span>
      ),
    },
    {
      title: '今日课次',
      value: data.todayLessons,
      suffix: '节',
      icon: <CalendarOutlined />,
      color: COLORS.blue,
      extra: <span style={{ color: '#7a6e60' }}>已完成 {data.todayLessonsCompleted} 节</span>,
    },
    {
      title: '本月扣课时',
      value: formatHours(data.monthlyDeductedHours),
      suffix: '课时',
      icon: <ClockCircleOutlined />,
      color: COLORS.purple,
      extra: <Progress percent={data.hoursProgress} size="small" strokeColor={COLORS.purple} />,
    },
    {
      title: '待处理事项',
      value: data.pendingTasks,
      suffix: '项',
      icon: <ExclamationCircleOutlined />,
      color: COLORS.red,
      extra: data.pendingTasksUrgent > 0 ? (
        <Badge count={`${data.pendingTasksUrgent}项紧急`} style={{ backgroundColor: COLORS.red }} />
      ) : (
        <span style={{ color: COLORS.green }}>暂无紧急</span>
      ),
    },
  ]

  return (
    <Row gutter={[16, 16]}>
      {cards.map((card) => (
        <Col xs={12} sm={12} lg={6} key={card.title}>
          <Card
            bordered={false}
            style={{
              borderRadius: 16,
              height: '100%',
              position: 'relative',
              overflow: 'hidden',
              background: `linear-gradient(135deg, #fff 0%, ${card.color}0d 100%)`,
              boxShadow: '0 6px 18px rgba(0,0,0,0.04)',
            }}
            styles={{ body: { padding: 18 } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
              <span style={{ color: '#7a6e60', fontSize: 13 }}>{card.title}</span>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  background: `${card.color}15`,
                  color: card.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {card.icon}
              </div>
            </div>
            <Statistic
              value={card.value}
              suffix={card.suffix}
              valueStyle={{
                color: '#1a1201',
                fontSize: 26,
                fontWeight: 800,
                fontVariantNumeric: 'tabular-nums',
              }}
            />
            <div style={{ marginTop: 12, minHeight: 28, fontSize: 12 }}>{card.extra}</div>
          </Card>
        </Col>
      ))}
    </Row>
  )
}
