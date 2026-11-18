'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { addDays, subDays } from 'date-fns'
import { Spin, Empty, Tag } from 'antd'
import { UserOutlined, CrownOutlined } from '@ant-design/icons'
import useSWR from 'swr'
import { useDivision } from '@/contexts/DivisionContext'
import { HOURLY_PERIODS } from '@/lib/schedule-periods'

const HOUR_HEIGHT = 72

const INTENSIVE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ONE_ON_ONE: { label: '一对一', color: '#534AB7', bg: 'rgba(83,74,183,.1)' },
  ONE_ON_TWO: { label: '一对二', color: '#D4537E', bg: 'rgba(212,83,126,.1)' },
  ONE_ON_THREE: { label: '一对三', color: '#185FA5', bg: 'rgba(24,95,165,.1)' },
}
const INTENSIVE_TYPES = ['ONE_ON_ONE', 'ONE_ON_TWO', 'ONE_ON_THREE']

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : Promise.reject('load error'))

function getHourSlot(startTime: string): string | null {
  const hour = parseInt(startTime?.split(':')[0] || '')
  const period = HOURLY_PERIODS.find(p => p.start.startsWith(String(hour).padStart(2, '0')))
  return period?.id || null
}

export function OneOnOneView({
  selectedDate,
  setSelectedDate,
  onOneOnOneClick,
  onLessonClick,
}: {
  selectedDate: Date
  setSelectedDate: (d: Date) => void
  onOneOnOneClick?: () => void
  onLessonClick: (lesson: Record<string, unknown>) => void
}) {
  const { division } = useDivision()
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const { data: daily, isLoading } = useSWR(`/api/schedules/daily?date=${dateStr}&division=${division}`, fetcher, { refreshInterval: 180_000 })

  const matrix = useMemo(
    () => (daily?.matrix || {}) as Record<string, Record<string, Record<string, unknown>>>,
    [daily],
  )

  // Gather all VIP lessons (one-on-one / one-on-two / one-on-three)
  const intensiveLessons = useMemo(() => {
    const list: { lesson: Record<string, unknown>; roomId: string; hourId: string }[] = []
    Object.entries(matrix).forEach(([roomId, periods]) => {
      Object.entries(periods).forEach(([_periodId, lesson]) => {
        const type = lesson.courseType as string
        if (INTENSIVE_TYPES.includes(type)) {
          const slot = getHourSlot(lesson.startTime as string || '')
          if (slot) {
            list.push({ lesson, roomId, hourId: slot })
          }
        }
      })
    })
    return list
  }, [matrix])

  // Build hour-based grid: hourId → list of lessons
  const hourGrid = useMemo(() => {
    const grid: Record<string, { lesson: Record<string, unknown>; roomId: string }[]> = {}
    HOURLY_PERIODS.forEach(h => { grid[h.id] = [] })
    intensiveLessons.forEach(({ lesson, roomId, hourId }) => {
      if (grid[hourId]) grid[hourId].push({ lesson, roomId })
    })
    return grid
  }, [intensiveLessons])

  const summary = useMemo(() => {
    const byType: Record<string, number> = {}
    intensiveLessons.forEach(({ lesson }) => {
      const t = (lesson.courseType as string) || 'ONE_ON_ONE'
      byType[t] = (byType[t] || 0) + 1
    })
    return byType
  }, [intensiveLessons])

  return (
    <div>
      {/* Date navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          style={{ border: '1px solid #EDE9E1', borderRadius: 10, background: '#fff', padding: '6px 12px', cursor: 'pointer', fontSize: 15 }}>←</button>
        <div style={{ padding: '0 14px', height: 36, display: 'flex', alignItems: 'center', gap: 8,
          background: '#fff', border: '1px solid #EDE9E1', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#17352F' }}>
          <CrownOutlined style={{ color: '#B98A2F' }} />
          {format(selectedDate, 'M月d日 EEEE', { locale: zhCN })}
        </div>
        <button onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          style={{ border: '1px solid #EDE9E1', borderRadius: 10, background: '#fff', padding: '6px 12px', cursor: 'pointer', fontSize: 15 }}>→</button>
        <button onClick={() => setSelectedDate(new Date())}
          style={{ border: '1px solid #EDE9E1', borderRadius: 10, background: '#fff', padding: '6px 12px', cursor: 'pointer', fontSize: 12 }}>今天</button>
        {onOneOnOneClick && (
          <button onClick={onOneOnOneClick}
            style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 999, background: 'linear-gradient(135deg,#0E5E4E,#0B4B40)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 10px rgba(14,94,78,.25)' }}>
            + 新建VIP课程
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, background: 'linear-gradient(135deg,#123C35,#0E5E4E)', borderRadius: 14, padding: '12px 14px', boxShadow: '0 4px 14px rgba(14,94,78,.15)' }}>
          <div style={{ color: 'rgba(242,227,182,.8)', fontSize: 11 }}>今日VIP课程</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#F7F3E8', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{intensiveLessons.length}</div>
        </div>
        {INTENSIVE_TYPES.map((t) => {
          const cfg = INTENSIVE_CONFIG[t]
          return (
            <div key={t} style={{ flex: 1, background: '#fff', border: '1px solid #EDE9E1', borderRadius: 14, padding: '12px 14px', boxShadow: '0 2px 8px rgba(23,47,41,.05)' }}>
              <div style={{ color: '#98A2B3', fontSize: 11 }}>{cfg.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: cfg.color, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{summary[t] || 0}</div>
            </div>
          )
        })}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : intensiveLessons.length === 0 ? (
        <div style={{ border: '1px solid #EDE9E1', borderRadius: 16, padding: 50, textAlign: 'center', background: '#fff', boxShadow: '0 2px 8px rgba(23,47,41,.05)' }}>
          <CrownOutlined style={{ fontSize: 40, color: '#C9A45C' }} />
          <div style={{ marginTop: 10, color: '#17352F', fontSize: 15, fontWeight: 700 }}>今日暂无 VIP 课程</div>
          <div style={{ marginTop: 4, color: '#98A2B3', fontSize: 12.5 }}>一对一 / 一对二 / 一对三课程会在这里按小时展示</div>
          {onOneOnOneClick && (
            <button onClick={onOneOnOneClick}
              style={{ marginTop: 14, padding: '8px 20px', borderRadius: 999, background: 'linear-gradient(135deg,#0E5E4E,#0B4B40)', color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              立即安排 VIP 课程
            </button>
          )}
        </div>
      ) : (
        <div style={{ border: '1px solid #EDE9E1', borderRadius: 16, overflow: 'hidden', background: '#fff', boxShadow: '0 2px 8px rgba(23,47,41,.05)' }}>
          {/* Hourly time grid */}
          {HOURLY_PERIODS.map(hour => {
            const items = hourGrid[hour.id] || []
            const hasItems = items.length > 0
            return (
              <div key={hour.id} style={{
                display: 'flex', minHeight: hasItems ? HOUR_HEIGHT : 34,
                borderBottom: '1px solid #F0EBE2',
                background: hasItems ? 'rgba(201,164,92,.04)' : 'transparent',
              }}>
                {/* Time label */}
                <div style={{
                  width: 76, flexShrink: 0,
                  padding: '8px 10px', textAlign: 'right',
                  borderRight: '1px solid #F0EBE2',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#17352F', fontVariantNumeric: 'tabular-nums' }}>{hour.start}</div>
                  <div style={{ fontSize: 10, color: '#98A2B3' }}>至 {hour.end}</div>
                </div>

                {/* Lesson cards */}
                <div style={{ flex: 1, display: 'flex', gap: 8, padding: 6, flexWrap: 'wrap', alignItems: 'stretch' }}>
                  {hasItems ? items.map(({ lesson, roomId }, idx) => {
                    const type = (lesson.courseType as string) || 'ONE_ON_ONE'
                    const cfg = INTENSIVE_CONFIG[type] || INTENSIVE_CONFIG.ONE_ON_ONE
                    const headcount = typeof lesson.headcount === 'number' ? lesson.headcount : 0
                    return (
                      <div key={idx}
                        onClick={() => onLessonClick(lesson)}
                        style={{
                          flex: '1 1 190px', maxWidth: 300, minWidth: 170,
                          borderRadius: 12, padding: '10px 12px',
                          background: '#FAF8F4',
                          border: '1px solid #F0EBE2',
                          borderLeft: `4px solid ${cfg.color}`,
                          cursor: 'pointer',
                          transition: 'box-shadow .15s',
                          boxShadow: '0 1px 4px rgba(23,47,41,.04)',
                        }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                          <Tag style={{ borderRadius: 9999, fontSize: 10, margin: 0, color: cfg.color, background: cfg.bg, border: 'none', fontWeight: 700 }}>
                            <CrownOutlined /> VIP·{cfg.label}
                          </Tag>
                          <Tag style={{ borderRadius: 9999, fontSize: 10, margin: 0, color: '#B98A2F', background: 'rgba(201,164,92,.14)', border: 'none', fontWeight: 700 }}>
                            {headcount}人
                          </Tag>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#17352F', marginBottom: 4 }}>
                          {lesson.teacherName as string}老师
                        </div>
                        <div style={{ fontSize: 11.5, color: '#667085', marginBottom: 2 }}>
                          {lesson.courseName as string} · {lesson.subject as string || ''}
                        </div>
                        <div style={{ fontSize: 10.5, color: '#98A2B3' }}>
                          <UserOutlined style={{ marginRight: 4 }} />{lesson.grade as string || ''} · {roomId === 'unknown' ? '线上/未分配' : roomId}
                        </div>
                      </div>
                    )
                  }) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingLeft: 12 }}>
                      <span style={{ fontSize: 10, color: '#D5D8DD' }}>空闲</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Legend */}
          <div style={{ display: 'flex', gap: 14, padding: '8px 14px', borderTop: '1px solid #F0EBE2', background: '#FAF8F4', flexWrap: 'wrap', alignItems: 'center' }}>
            {INTENSIVE_TYPES.map((t) => {
              const cfg = INTENSIVE_CONFIG[t]
              return (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: '#5A6472' }}>
                  <div style={{ width: 16, height: 4, borderRadius: 2, background: cfg.color }} />
                  <span>VIP·{cfg.label}</span>
                </div>
              )
            })}
            <span style={{ fontSize: 10.5, color: '#98A2B3', marginLeft: 'auto' }}>每小时为1课时单位 · 今日共 {intensiveLessons.length} 课时</span>
          </div>
        </div>
      )}
    </div>
  )
}
