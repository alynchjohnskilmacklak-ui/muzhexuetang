'use client'

import { Card, Typography } from 'antd'
import { CalendarOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import { formatHours } from '@/lib/format'
import type { AdminDashboardMetrics } from '@/types/dashboard'

const { Title, Text } = Typography

const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

export function DashboardHero({ metrics }: { metrics: AdminDashboardMetrics }) {
  const isMobile = useIsMobile()
  const now = new Date()
  const dateText = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekDays[now.getDay()]}`

  const stats = [
    { label: '今日课次', value: metrics.todayLessons, icon: <CalendarOutlined /> },
    { label: '待考勤', value: metrics.todayLessonsPendingAttendance, icon: <ExclamationCircleOutlined /> },
    { label: '本月扣课时', value: formatHours(metrics.monthlyDeductedHours), icon: <ClockCircleOutlined /> },
  ]

  return (
    <Card
      bordered={false}
      style={{
        borderRadius: 18,
        marginBottom: 16,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #FFF2E8 0%, #FFF8F2 55%, #F4FFF9 100%)',
        boxShadow: '0 10px 30px rgba(90, 54, 20, 0.08)',
      }}
      styles={{ body: { padding: isMobile ? 18 : 28 } }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr',
          gap: isMobile ? 16 : 28,
          alignItems: 'center',
        }}
      >
        <div>
          <Text style={{ color: '#8a5c3a', fontWeight: 600 }}>{dateText}</Text>
          <Title level={isMobile ? 4 : 2} style={{ margin: '6px 0 8px', color: '#1a1201' }}>
            牧哲学堂 · 数据总览
          </Title>
          <Text style={{ color: '#5a4e3a', fontSize: isMobile ? 13 : 15 }}>
            今日 {metrics.todayLessons} 节课，{metrics.todayLessonsPendingAttendance} 节待考勤，
            {metrics.pendingTasks} 项待处理
          </Text>
          <div style={{ marginTop: 10, color: '#8a7a68', fontSize: 13 }}>
            让每一节课有记录，让每一个孩子的成长被看见。
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(3, 1fr)' : 'repeat(3, 1fr)',
            gap: 10,
          }}
        >
          {stats.map((item) => (
            <div
              key={item.label}
              style={{
                minHeight: isMobile ? 74 : 92,
                padding: isMobile ? '10px 8px' : '14px 12px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.72)',
                border: '1px solid rgba(232,117,69,0.14)',
                textAlign: 'center',
              }}
            >
              <div style={{ color: '#E87545', fontSize: isMobile ? 16 : 20 }}>{item.icon}</div>
              <div
                style={{
                  marginTop: 5,
                  color: '#1a1201',
                  fontSize: isMobile ? 18 : 24,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {item.value}
              </div>
              <div style={{ marginTop: 4, color: '#8a7a68', fontSize: 12 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
