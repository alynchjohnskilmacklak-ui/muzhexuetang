'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { addDays, subDays, setHours, setMinutes } from 'date-fns'
import { Spin, Empty, Tag, Typography } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import useSWR from 'swr'
import { HOURLY_PERIODS } from '@/lib/schedule-periods'

const { Text } = Typography

const ONE_ON_ONE_COLOR = '#534AB7'
const HOUR_HEIGHT = 72

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
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const { data: daily, isLoading } = useSWR(`/api/schedules/daily?date=${dateStr}`, fetcher, { refreshInterval: 180_000 })

  const matrix = (daily?.matrix || {}) as Record<string, Record<string, Record<string, unknown>>>

  // Gather all one-on-one lessons: { lesson, roomId, hourId }
  const oneOnOneLessons = useMemo(() => {
    const list: { lesson: Record<string, unknown>; roomId: string; hourId: string }[] = []
    Object.entries(matrix).forEach(([roomId, periods]) => {
      Object.entries(periods).forEach(([periodId, lesson]) => {
        if ((lesson.courseType as string) === 'ONE_ON_ONE') {
          const hourId = getHourSlot(periodId === 'am1' ? '08:00' : periodId === 'am2' ? '08:00' : lesson.startTime as string || '')
          // Use the lesson's actual startTime to find the hour slot
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
    oneOnOneLessons.forEach(({ lesson, roomId, hourId }) => {
      if (grid[hourId]) grid[hourId].push({ lesson, roomId })
    })
    return grid
  }, [oneOnOneLessons])

  // Get unique rooms from one-on-one lessons
  const rooms = useMemo(() => {
    const roomSet = new Map<string, string>()
    oneOnOneLessons.forEach(({ roomId }) => {
      if (!roomSet.has(roomId)) roomSet.set(roomId, roomId === 'unknown' ? '未分配教室' : roomId)
    })
    return Array.from(roomSet.entries()).map(([id, name]) => ({ id, name }))
  }, [oneOnOneLessons])

  return (
    <div>
      {/* Date navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>←</button>
        <div style={{ padding: '0 16px', height: 34, display: 'flex', alignItems: 'center', gap: 8,
          background: '#fff', border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
          <span style={{ color: ONE_ON_ONE_COLOR }}>📅</span>
          {format(selectedDate, 'M月d日 EEEE', { locale: zhCN })}
        </div>
        <button onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>→</button>
        <button onClick={() => setSelectedDate(new Date())}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>今天</button>
        {onOneOnOneClick && (
          <button onClick={onOneOnOneClick}
            style={{ marginLeft: 'auto', padding: '7px 18px', borderRadius: 6, background: ONE_ON_ONE_COLOR, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + 突击全能班排课
          </button>
        )}
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, background: '#fff', border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8, padding: 14 }}>
          <Text type="secondary" style={{ fontSize: 11 }}>今日突击全能班</Text>
          <div style={{ fontSize: 28, fontWeight: 700, color: ONE_ON_ONE_COLOR }}>{oneOnOneLessons.length}</div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : oneOnOneLessons.length === 0 ? (
        <div style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8, padding: 60, textAlign: 'center', background: '#fff' }}>
          <Empty description="今天暂无突击全能班课程">
            {onOneOnOneClick && (
              <button onClick={onOneOnOneClick}
                style={{ marginTop: 12, padding: '8px 20px', borderRadius: 6, background: ONE_ON_ONE_COLOR, color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                立即安排突击全能班排课
              </button>
            )}
          </Empty>
        </div>
      ) : (
        <div style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8, overflow: 'hidden' }}>
          {/* Hourly time grid */}
          {HOURLY_PERIODS.map(hour => {
            const items = hourGrid[hour.id] || []
            const hasItems = items.length > 0
            return (
              <div key={hour.id} style={{
                display: 'flex', minHeight: hasItems ? HOUR_HEIGHT : 32,
                borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
                background: hasItems ? 'rgba(83,74,183,.02)' : 'transparent',
              }}>
                {/* Time label */}
                <div style={{
                  width: 80, flexShrink: 0,
                  padding: '8px 12px', textAlign: 'right',
                  borderRight: '0.5px solid var(--color-border, #EEE7E1)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: ONE_ON_ONE_COLOR }}>{hour.start}</div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-tertiary, #98A2B3)' }}>至 {hour.end}</div>
                </div>

                {/* Lesson cards */}
                <div style={{ flex: 1, display: 'flex', gap: 8, padding: 6, flexWrap: 'wrap', alignItems: 'stretch' }}>
                  {hasItems ? items.map(({ lesson, roomId }, idx) => (
                    <div key={idx}
                      onClick={() => onLessonClick(lesson)}
                      style={{
                        flex: '1 1 180px', maxWidth: 280, minWidth: 160,
                        borderRadius: 8, padding: '10px 14px',
                        background: `${ONE_ON_ONE_COLOR}10`,
                        borderLeft: `4px solid ${ONE_ON_ONE_COLOR}`,
                        cursor: 'pointer',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Tag color="purple" style={{ borderRadius: 9999, fontSize: 9, margin: 0 }}>突击全能班</Tag>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: ONE_ON_ONE_COLOR, marginBottom: 4 }}>
                        {lesson.teacherName as string}老师
                      </div>
                      <div style={{ fontSize: 11, color: ONE_ON_ONE_COLOR, opacity: .85, marginBottom: 2 }}>
                        {lesson.courseName as string} · {lesson.subject as string || ''}
                      </div>
                      <div style={{ fontSize: 10, color: ONE_ON_ONE_COLOR, opacity: .6 }}>
                        <UserOutlined style={{ marginRight: 4 }} />{lesson.grade as string || ''} · {roomId === 'unknown' ? '线上/未分配' : roomId}
                      </div>
                    </div>
                  )) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', paddingLeft: 12 }}>
                      <span style={{ fontSize: 10, color: 'rgba(0,0,0,.1)' }}>空闲</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, padding: '8px 14px', borderTop: '0.5px solid var(--color-border, #EEE7E1)', background: 'var(--color-background-secondary, #faf8f5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
              <div style={{ width: 16, height: 4, borderRadius: 2, background: ONE_ON_ONE_COLOR }} />
              <span>突击全能班（一对一）</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
              <div style={{ width: 16, height: 4, borderRadius: 2, background: 'rgba(0,0,0,.08)' }} />
              <span style={{ color: 'var(--color-text-tertiary, #98A2B3)' }}>空闲</span>
            </div>
            <Text type="secondary" style={{ fontSize: 10, marginLeft: 'auto' }}>每小时为1课时单位 · 今日共 {oneOnOneLessons.length} 课时</Text>
          </div>
        </div>
      )}
    </div>
  )
}
