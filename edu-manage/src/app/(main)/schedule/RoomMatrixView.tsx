'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { addDays, subDays } from 'date-fns'
import { Spin, Empty } from 'antd'
import useSWR from 'swr'
import { SCHEDULE_PERIODS, PERIOD_HEIGHTS, PERIOD_BG } from '@/lib/schedule-periods'

const TYPE_LABELS: Record<string, string> = {
  GROUP: '精品班课', ONE_ON_ONE: '一对一', SMALL_GROUP: '小组课',
}

const TYPE_COLORS: Record<string, string> = {
  GROUP: '#E8784A', ONE_ON_ONE: '#534AB7', SMALL_GROUP: '#1D9E75',
}

function getCourseColor(courseType: string): string {
  return TYPE_COLORS[courseType] || '#E8784A'
}

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : Promise.reject('load error'))

export function RoomMatrixView({
  selectedDate,
  setSelectedDate,
  onCellClick,
  onLessonClick,
  onNewCourseClick,
}: {
  selectedDate: Date
  setSelectedDate: (d: Date) => void
  onCellClick: (room: Record<string, unknown>, period: typeof SCHEDULE_PERIODS[number]) => void
  onLessonClick: (lesson: Record<string, unknown>) => void
  onNewCourseClick?: () => void
}) {
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const { data: daily, isLoading } = useSWR(`/api/schedules/daily?date=${dateStr}`, fetcher, { refreshInterval: 180_000 })
  const { data: roomsData } = useSWR('/api/rooms', fetcher)

  const matrix = (daily?.matrix || {}) as Record<string, Record<string, Record<string, unknown> | Record<string, unknown>[]>>
  const allRooms: Record<string, unknown>[] = Array.isArray(roomsData) ? roomsData : []
  const rooms = allRooms.filter(r => {
    const t = (r.type as string || '').toLowerCase()
    const u = (r.usageType as string || '').toLowerCase()
    return !t.includes('一对一') && !t.includes('one_on_one')
      && !u.includes('one_on_one') && !u.includes('一对一')
  })

  return (
    <div>
      {/* Date navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>←</button>
        <div style={{ padding: '0 16px', height: 34, display: 'flex', alignItems: 'center', gap: 8,
          background: '#fff', border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
          <span style={{ color: '#E8784A' }}>📅</span>
          {format(selectedDate, 'M月d日 EEEE', { locale: zhCN })}
        </div>
        <button onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>→</button>
        <button onClick={() => setSelectedDate(new Date())}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>今天</button>
        {onNewCourseClick && (
          <button onClick={onNewCourseClick}
            style={{ marginLeft: 'auto', padding: '7px 18px', borderRadius: 6, background: '#E8784A', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + 排课
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : rooms.length === 0 ? (
        <Empty description="暂无精品班课教室" />
      ) : (
        <div style={{ overflowX: 'auto', border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: `88px repeat(${rooms.length}, 1fr)`,
            minWidth: 88 + rooms.length * 160,
          }}>
            <div />
            {rooms.map(room => (
              <div key={room.id as string} style={{
                padding: '10px 12px', textAlign: 'center',
                borderRight: '0.5px solid var(--color-border, #EEE7E1)',
                borderBottom: '2px solid #E8784A',
                background: 'var(--color-background-secondary, #faf8f5)',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{room.name as string}</div>
                <div style={{ fontSize: 9, color: '#E8784A', marginTop: 2, fontWeight: 500 }}>课表</div>
              </div>
            ))}
            {SCHEDULE_PERIODS.map(period => (
              <div key={period.id} style={{ display: 'contents' }}>
                <div style={{
                  minHeight: PERIOD_HEIGHTS[period.type], background: PERIOD_BG[period.type],
                  borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
                  padding: '4px 8px 4px 4px', textAlign: 'right',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end',
                  position: 'sticky', left: 0, zIndex: 2,
                }}>
                  {period.type === 'CLASS' && (
                    <>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#E8784A' }}>{period.name}</div>
                      <div style={{ fontSize: 9, color: 'var(--color-text-tertiary, #98A2B3)', fontFamily: 'monospace', marginTop: 2 }}>{period.start}–{period.end}</div>
                    </>
                  )}
                  {period.type !== 'CLASS' && (
                    <span style={{ fontSize: 9, color: 'var(--color-text-tertiary, #98A2B3)', fontStyle: period.type === 'BREAK' ? 'italic' : 'normal' }}>
                      {period.type === 'LUNCH' ? `午休 ${period.start}–${period.end}` : period.name}
                    </span>
                  )}
                </div>
                {rooms.map(room => {
                  const cellItems: Record<string, unknown>[] = (() => {
                    const val = matrix[room.id as string]?.[period.id]
                    if (!val) return []
                    return Array.isArray(val) ? val : [val]
                  })()
                  return (
                    <div key={room.id as string} style={{
                      minHeight: PERIOD_HEIGHTS[period.type], background: PERIOD_BG[period.type],
                      borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
                      padding: period.type === 'CLASS' ? '4px' : 0, cursor: period.type === 'CLASS' ? 'pointer' : 'default',
                    }} onClick={() => { if (period.type === 'CLASS') onCellClick(room, period) }}>
                      {period.type === 'CLASS' && cellItems.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%', overflow: 'hidden' }}>
                          {cellItems.map((item: Record<string, unknown>, index: number) => (
                            <LessonCard key={`${item.lessonId || index}`} lesson={item} onClick={() => onLessonClick(item)} />
                          ))}
                        </div>
                      )}
                      {period.type === 'CLASS' && cellItems.length === 0 && (
                        <EmptyCell onClick={() => onCellClick(room, period)} />
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function LessonCard({ lesson, onClick }: { lesson: Record<string, unknown>; onClick: () => void }) {
  const courseType = (lesson.courseType as string) || 'GROUP'
  const color = getCourseColor(courseType)
  return (
    <div onClick={(e) => { e.stopPropagation(); onClick() }} style={{
      width: '100%', flex: 1, minHeight: 34, borderRadius: 6, padding: '3px 6px',
      background: `${color}12`, borderLeft: `4px solid ${color}`, cursor: 'pointer',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', overflow: 'hidden',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {lesson.teacherName as string}·{lesson.subject as string}
      </div>
      {courseType === 'GROUP' ? (
        <div style={{ fontSize: 10, color, opacity: .8, lineHeight: 1.2 }}>{lesson.headcount as number}人</div>
      ) : (
        <div style={{ fontSize: 9, background: `${color}20`, color, padding: '0 3px', borderRadius: 2, display: 'inline-block', width: 'fit-content', marginTop: 2 }}>
          {TYPE_LABELS[courseType] || courseType}
        </div>
      )}
    </div>
  )
}

function EmptyCell({ onClick }: { onClick: () => void }) {
  const [hover, setHover] = useState(false)
  return (
    <div style={{
      width: '100%', height: '100%', minHeight: 72, display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 6, background: hover ? 'rgba(232,120,74,.06)' : 'transparent',
      border: hover ? '1px dashed rgba(232,120,74,.3)' : 'none', transition: 'all .15s', cursor: 'pointer',
    }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onClick}>
      {hover && <span style={{ fontSize: 11, color: '#E8784A' }}>+ 安排课程</span>}
    </div>
  )
}
