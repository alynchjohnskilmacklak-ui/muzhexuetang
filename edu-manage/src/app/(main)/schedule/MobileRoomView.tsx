'use client'

import { useMemo, useState } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Spin, Tag, Empty } from 'antd'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : Promise.reject('error'))

const TYPE_COLORS: Record<string, string> = {
  GROUP: '#E8784A', ONE_ON_ONE: '#534AB7', SMALL_GROUP: '#1D9E75',
}
const TYPE_LABELS: Record<string, string> = {
  GROUP: '班课', ONE_ON_ONE: '一对一', SMALL_GROUP: '小组课',
}

export function MobileRoomView({
  selectedDate,
  setSelectedDate,
  onNewCourseClick,
  onLessonClick,
}: {
  selectedDate: Date
  setSelectedDate: (d: Date) => void
  onNewCourseClick?: () => void
  onLessonClick?: (lesson: Record<string, unknown>) => void
}) {
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null)
  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const { data: daily, isLoading } = useSWR(`/api/schedules/daily?date=${dateStr}`, fetcher, { refreshInterval: 180_000 })
  const { data: roomsData } = useSWR('/api/rooms', fetcher)

  const matrix = (daily?.matrix || {}) as Record<string, Record<string, Record<string, unknown>[]>>
  const allRooms: Record<string, unknown>[] = Array.isArray(roomsData) ? roomsData : []
  const rooms = allRooms.filter(r => {
    const t = (r.type as string || '').toLowerCase()
    return !t.includes('一对一') && !t.includes('one_on_one')
  })

  const roomSummary = useMemo(() => {
    return rooms.map(room => {
      const roomMatrix = matrix[room.id as string] || {}
      const lessons = Object.values(roomMatrix).flatMap(v => Array.isArray(v) ? v : [v]).filter(Boolean)
      return { room, lessons, count: lessons.length }
    })
  }, [rooms, matrix])

  return (
    <div>
      {/* Date nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <button onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          style={{ border: '1px solid #EEE7E1', borderRadius: 8, background: '#fff', padding: '8px 14px', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>←</button>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 15, color: '#1F2329' }}>
          {format(selectedDate, 'M月d日 EEEE', { locale: zhCN })}
        </div>
        <button onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          style={{ border: '1px solid #EEE7E1', borderRadius: 8, background: '#fff', padding: '8px 14px', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>→</button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button onClick={() => setSelectedDate(new Date())}
          style={{ padding: '6px 16px', borderRadius: 8, border: '1px solid #EEE7E1', background: '#fff', cursor: 'pointer', fontSize: 12 }}>今天</button>
        {onNewCourseClick && (
          <button onClick={onNewCourseClick}
            style={{ marginLeft: 'auto', padding: '7px 18px', borderRadius: 8, background: '#E8784A', color: '#fff', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + 新建排课
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
      ) : rooms.length === 0 ? (
        <Empty description="暂无精品班课教室" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {roomSummary.map(({ room, lessons, count }) => {
            const isExpanded = expandedRoom === (room.id as string)
            return (
              <div key={room.id as string} style={{
                background: '#fff', borderRadius: 12,
                border: `1px solid ${isExpanded ? '#E8784A50' : '#EEE7E1'}`,
                overflow: 'hidden',
              }}>
                <div
                  onClick={() => setExpandedRoom(isExpanded ? null : room.id as string)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}
                >
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#1F2329' }}>{room.name as string}</span>
                    <span style={{ fontSize: 11, color: '#98A2B3', marginLeft: 8 }}>{room.type as string || '精品班课'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {count > 0 ? (
                      <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 9999, background: '#FFF3EC', color: '#E8784A', fontWeight: 600 }}>{count} 节课</span>
                    ) : (
                      <span style={{ fontSize: 12, color: '#C4BAB0' }}>今日无课</span>
                    )}
                    <span style={{ fontSize: 12, color: '#C4BAB0' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid #F5F2EE', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {count === 0 ? (
                      <div style={{ textAlign: 'center', padding: '12px 0', color: '#C4BAB0', fontSize: 13 }}>今日暂无排课</div>
                    ) : (
                      lessons.map((lesson: unknown, i: number) => {
                        const l = lesson as Record<string, unknown>
                        const ct = (l.courseType as string) || 'GROUP'
                        const color = TYPE_COLORS[ct] || '#E8784A'
                        return (
                          <div key={i} onClick={() => onLessonClick?.(l)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8,
                              background: `${color}08`, border: `1px solid ${color}20`, cursor: 'pointer' }}>
                            <div style={{ width: 4, height: 36, borderRadius: 2, background: color, flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1F2329' }}>
                                {l.startTime as string} - {l.endTime as string}
                              </div>
                              <div style={{ fontSize: 12, color: '#5a4e3a', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {l.teacherName as string} · {l.subject as string}
                              </div>
                            </div>
                            <div style={{ flexShrink: 0, textAlign: 'right' }}>
                              <Tag style={{ borderRadius: 9999, fontSize: 10, margin: 0, background: `${color}15`, color, border: 'none' }}>
                                {TYPE_LABELS[ct] || ct}
                              </Tag>
                              {(l.headcount as number) > 0 && (
                                <div style={{ fontSize: 11, color: '#C4BAB0', marginTop: 2 }}>{l.headcount as number}人</div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
