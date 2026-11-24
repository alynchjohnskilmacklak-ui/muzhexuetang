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
        background: 'linear-gradient(165deg, #15453D 0%, #0D2D27 50%, #071D19 100%)',
        border: '1px solid rgba(201, 164, 92, 0.32)',
        boxShadow: '0 14px 36px rgba(7, 29, 25, 0.35)',
      }}
    >
      {/* 柔光漫射层与宋锦回菱暗纹 */}
      <div style={{ position: 'absolute', top: '-60%', right: '-10%', width: 360, height: 480, background: 'radial-gradient(circle, rgba(201, 164, 92, 0.22), transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-50%', left: '-8%', width: 300, height: 400, background: 'radial-gradient(circle, rgba(46, 110, 83, 0.26), transparent 70%)', pointerEvents: 'none' }} />
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
          <pattern id="pc-admin-hero-song-pattern" width="32" height="32" patternUnits="userSpaceOnUse">
            <path
              d="M16 0 L32 16 L16 32 L0 16 Z M16 4 L28 16 L16 28 L4 16 Z M16 8 L24 16 L16 24 L8 16 Z"
              fill="none"
              stroke="#E6C687"
              strokeWidth="0.8"
            />
            <circle cx="16" cy="16" r="2" fill="#E6C687" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pc-admin-hero-song-pattern)" />
      </svg>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr',
          gap: isMobile ? 16 : 28,
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ color: 'rgba(255,255,255,.82)', fontWeight: 600, fontSize: 13 }}>{dateText}</span>
            <span style={{
              color: '#F8DFAC',
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 9px',
              borderRadius: 999,
              background: 'linear-gradient(135deg, rgba(201, 164, 92, 0.28) 0%, rgba(201, 164, 92, 0.10) 100%)',
              border: '1px solid rgba(235, 205, 140, 0.55)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 6px rgba(0,0,0,0.2)',
              letterSpacing: 0.5,
            }}>👑 运营中枢驾驶舱</span>
            {toolbar}
          </div>
          <h2 style={{ margin: '10px 0 8px', color: '#FFFFFF', fontSize: isMobile ? 21 : 28, fontWeight: 800, letterSpacing: .5, textShadow: '0 2px 8px rgba(0,0,0,0.45)' }}>
            牧哲学堂 · 数据总览
          </h2>
          <div style={{ color: 'rgba(255,255,255,.86)', fontSize: isMobile ? 13 : 15, lineHeight: 1.8 }}>
            今日 <strong style={{ color: '#F8DFAC' }}>{metrics.todayLessons}</strong> 节课，<strong style={{ color: metrics.todayLessonsPendingAttendance > 0 ? '#FFA494' : '#F8DFAC' }}>{metrics.todayLessonsPendingAttendance}</strong> 节待考勤，
            <strong style={{ color: '#FFFFFF' }}>{metrics.pendingTasks}</strong> 项待处理
          </div>
          <div style={{ marginTop: 10, color: 'rgba(255,255,255,.62)', fontSize: 13 }}>
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
                borderRadius: 16,
                background: 'linear-gradient(145deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.03) 100%)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(235, 205, 140, 0.24)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 12px rgba(201,164,92,0.04), 0 8px 18px rgba(0,0,0,0.22)',
                textAlign: 'center',
              }}
            >
              <div style={{ color: '#E6C687', fontSize: isMobile ? 16 : 20 }}>{item.icon}</div>
              <div
                style={{
                  marginTop: 5,
                  fontSize: isMobile ? 20 : 26,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  fontVariantNumeric: 'tabular-nums',
                  background: 'linear-gradient(135deg, #FFFFFF 15%, #F5DEB3 65%, #E6C687 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {item.value}
              </div>
              <div style={{ marginTop: 4, color: 'rgba(255,255,255,.72)', fontSize: 12, fontWeight: 500 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: 16,
        borderRadius: 14,
        background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(201,164,92,0.18)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 12px rgba(0,0,0,0.12)',
        overflow: 'hidden',
      }}>
        <WeatherHeroStrip audience="admin" variant="dark" />
      </div>
    </div>
  )
}
