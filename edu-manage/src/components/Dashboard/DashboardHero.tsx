'use client'

import type { ReactNode } from 'react'
import { CalendarOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import { formatHours } from '@/lib/format'
import type { AdminDashboardMetrics } from '@/types/dashboard'
import { WeatherHeroStrip } from '@/components/Common/WeatherHeroStrip'

const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

export function DashboardHero({
  metrics,
  toolbar,
}: {
  metrics: AdminDashboardMetrics
  toolbar?: ReactNode
}) {
  const isMobile = useIsMobile() ?? false
  const now = new Date()
  const dateText = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${weekDays[now.getDay()]}`

  const stats = [
    { label: '今日课次', value: metrics.todayLessons, icon: <CalendarOutlined /> },
    { label: '待考勤', value: metrics.todayLessonsPendingAttendance, icon: <ExclamationCircleOutlined /> },
    { label: '本月扣课时', value: formatHours(metrics.monthlyDeductedHours), icon: <ClockCircleOutlined /> },
  ]

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 18,
        marginBottom: 16,
        padding: isMobile ? 18 : 28,
        background: 'linear-gradient(155deg, #33220F 0%, #5A3A17 52%, #7E4A1B 100%)',
        border: '1px solid rgba(245,166,35,.4)',
        boxShadow: '0 14px 36px rgba(58,36,16,.2)',
      }}
    >
      <div style={{ position: 'absolute', top: '-70%', right: '-12%', width: 320, height: 460, background: 'radial-gradient(circle, rgba(245,166,35,.28), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-55%', left: '-8%', width: 260, height: 380, background: 'radial-gradient(circle, rgba(255,255,255,.07), transparent 70%)', pointerEvents: 'none' }} />
      <div
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr',
          gap: isMobile ? 16 : 28,
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: 'rgba(255,255,255,.62)', fontWeight: 600, fontSize: 13 }}>{dateText}</span>
            <span style={{ color: '#FFD58A', fontSize: 13, fontWeight: 600 }}>运营中枢</span>
            {toolbar}
          </div>
          <h2 style={{ margin: '8px 0 8px', color: 'rgba(255,255,255,.95)', fontSize: isMobile ? 20 : 28, fontWeight: 800, letterSpacing: .5 }}>
            牧哲学堂 · 数据总览
          </h2>
          <div style={{ color: 'rgba(255,255,255,.82)', fontSize: isMobile ? 13 : 15, lineHeight: 1.8 }}>
            今日 <strong style={{ color: '#FFD58A' }}>{metrics.todayLessons}</strong> 节课，<strong style={{ color: '#FFD58A' }}>{metrics.todayLessonsPendingAttendance}</strong> 节待考勤，
            <strong style={{ color: 'rgba(255,255,255,.95)' }}>{metrics.pendingTasks}</strong> 项待处理
          </div>
          <div style={{ marginTop: 10, color: 'rgba(255,255,255,.6)', fontSize: 13 }}>
            让每一节课有记录，让每一个孩子的成长被看见。
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
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
                background: 'rgba(255,255,255,.07)',
                border: '1px solid rgba(245,166,35,.3)',
                textAlign: 'center',
              }}
            >
              <div style={{ color: '#FFD58A', fontSize: isMobile ? 16 : 20 }}>{item.icon}</div>
              <div
                style={{
                  marginTop: 5,
                  fontSize: isMobile ? 18 : 24,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  fontVariantNumeric: 'tabular-nums',
                  background: 'linear-gradient(135deg,#FFD58A,#E8784A)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {item.value}
              </div>
              <div style={{ marginTop: 4, color: 'rgba(255,255,255,.66)', fontSize: 12 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
      <WeatherHeroStrip audience="admin" variant="dark" />
    </div>
  )
}
