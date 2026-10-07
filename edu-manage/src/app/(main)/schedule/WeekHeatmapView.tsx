'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, startOfWeek } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Spin, Empty, Typography } from 'antd'
import useSWR from 'swr'
import { useDivision } from '@/contexts/DivisionContext'

const { Text } = Typography

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const TEACHER_COLORS = ['#E8784A', '#1D9E75', '#534AB7', '#D4537E', '#BA7517', '#185FA5', '#27500A', '#72243E']
function getTeacherColor(teacherId: string): string {
  if (!teacherId) return '#E8784A'
  const hash = teacherId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return TEACHER_COLORS[Math.abs(hash) % TEACHER_COLORS.length]
}
function dayPart(startTime: string): 'morning' | 'afternoon' | 'evening' {
  const hour = parseInt(startTime?.split(':')[0] || '0')
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening'
}

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : Promise.reject('load error'))
type Lesson = {
  id: string
  lessonDate: string
  startTime: string
  teacherId?: string | null
  teacherName?: string | null
  subject?: string | null
  teacher?: { id?: string | null; name?: string | null } | null
  group?: { room?: { id?: string | null } | null; course?: { subject?: string | null; type?: string | null } | null } | null
}
type Room = { id: string; name: string; type?: string | null }

export function WeekHeatmapView({
  weekStart, setWeekStart, onCellClick,
}: {
  weekStart: Date; setWeekStart: (d: Date) => void; onCellClick: (date: Date) => void
}) {
  const { division } = useDivision()
  const router = useRouter()
  const weekDates = useMemo(() => WEEK_DAYS.map((_, i) => addDays(weekStart, i)), [weekStart])
  const startStr = format(weekStart, 'yyyy-MM-dd')
  const endStr = format(addDays(weekStart, 6), 'yyyy-MM-dd')

  // Get GROUP lessons for classrooms
  const { data: groupData, isLoading: loadingGroup } = useSWR<Lesson[]>(
    `/api/class-lessons?startDate=${startStr}&endDate=${endStr}&courseType=GROUP&division=${division}`, fetcher, { refreshInterval: 120_000 }
  )
  // Get SMALL lessons for intensive summary
  const { data: smallGroupData } = useSWR<Lesson[]>(
    `/api/class-lessons?startDate=${startStr}&endDate=${endStr}&courseType=SMALL_GROUP&division=${division}`, fetcher, { refreshInterval: 120_000 }
  )
  const { data: oneOnOneData } = useSWR<Lesson[]>(
    `/api/class-lessons?startDate=${startStr}&endDate=${endStr}&courseType=ONE_ON_ONE&division=${division}`, fetcher, { refreshInterval: 120_000 }
  )
  const { data: roomsData } = useSWR<Room[]>('/api/rooms', fetcher)

  const groupLessons = useMemo<Lesson[]>(() => Array.isArray(groupData) ? groupData : [], [groupData])
  const smallLessons = useMemo<Lesson[]>(() => [
    ...(Array.isArray(smallGroupData) ? smallGroupData : []),
    ...(Array.isArray(oneOnOneData) ? oneOnOneData : []),
  ], [oneOnOneData, smallGroupData])
  const allRooms: Room[] = Array.isArray(roomsData) ? roomsData : []
  const classrooms = allRooms.filter(r => { const t = r.type || ''; return !t.includes('一对一') && !t.includes('ONE_ON_ONE') })

  // Build room×day map from GROUP lessons
  const roomDayMap = useMemo(() => {
    const map: Record<string, Record<string, { teacherId: string; teacherName: string; subject: string; startTime: string; part: 'morning' | 'afternoon' | 'evening' }[]>> = {}
    classrooms.forEach(r => { map[r.id] = {} })
    groupLessons.forEach((l) => {
      const roomId = l.group?.room?.id || ''
      if (!map[roomId]) return
      const dateKey = format(new Date(l.lessonDate), 'yyyy-MM-dd')
      if (!map[roomId][dateKey]) map[roomId][dateKey] = []
      map[roomId][dateKey].push({
        teacherId: l.teacher?.id || l.teacherId || '',
        teacherName: l.teacher?.name || l.teacherName || '',
        subject: l.subject || l.group?.course?.subject || '',
        startTime: l.startTime,
        part: dayPart(l.startTime),
      })
    })
    return map
  }, [groupLessons, classrooms])

  // Build intensive summary per day
  const intensiveByDay = useMemo(() => {
    const map: Record<string, { total: number; types: Record<string, number> }> = {}
    smallLessons.forEach((l) => {
      const dateKey = format(new Date(l.lessonDate), 'yyyy-MM-dd')
      if (!map[dateKey]) map[dateKey] = { total: 0, types: {} }
      const type = l.group?.course?.type || 'ONE_ON_ONE'
      map[dateKey].total++
      map[dateKey].types[type] = (map[dateKey].types[type] || 0) + 1
    })
    return map
  }, [smallLessons])

  return (
    <div>
      <div style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, marginBottom: 12, padding: '10px 12px', borderRadius: 10,
        background: 'var(--color-primary-bg)', border: '1px solid var(--color-hairline)',
      }}>
        <Text strong>完整周总览：周一至周日</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>上午 · 下午 · 晚间（展示至 21:00）</Text>
      </div>
      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button type="button" aria-label="查看上一周" onClick={() => setWeekStart(addDays(weekStart, -7))}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', width: 44, height: 44, cursor: 'pointer', fontSize: 16 }}>←</button>
        <div style={{ padding: '0 16px', height: 34, display: 'flex', alignItems: 'center', background: '#fff',
          border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
          {format(weekStart, 'M月d日', { locale: zhCN })} – {format(addDays(weekStart, 6), 'M月d日', { locale: zhCN })}
        </div>
        <button type="button" aria-label="查看下一周" onClick={() => setWeekStart(addDays(weekStart, 7))}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', width: 44, height: 44, cursor: 'pointer', fontSize: 16 }}>→</button>
        <button type="button" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 12px', minHeight: 44, cursor: 'pointer', fontSize: 12 }}>本周</button>
      </div>

      {loadingGroup ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : classrooms.length === 0 ? (
        <Empty description="暂无教室数据" />
      ) : (
        <div style={{ overflowX: 'auto', border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `100px repeat(7, 1fr)`, minWidth: 840 }}>
            {/* Header */}
            <div style={{ borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)', background: '#faf8f5' }} />
            {weekDates.map((date, i) => {
              const today = format(new Date(), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
              return (
                <div key={i} style={{ textAlign: 'center', padding: '8px 4px',
                  borderRight: '0.5px solid var(--color-border, #EEE7E1)',
                  borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
                  background: today ? 'rgba(232,120,74,.06)' : 'transparent',
                }}>
                  <div style={{ fontSize: 10, color: 'var(--color-text-tertiary, #98A2B3)' }}>{WEEK_DAYS[i]}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: today ? '#E8784A' : '#1F2329' }}>{format(date, 'd')}</div>
                </div>
              )
            })}

            {/* Classroom rows */}
            {classrooms.map(room => (
              <div key={room.id} style={{ display: 'contents' }}>
                <div style={{ padding: '8px', borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
                  background: '#faf8f5', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{room.name}</div>
                  <div style={{ fontSize: 9, color: '#E8784A' }}>精品班课</div>
                </div>
                {weekDates.map((date, dayIdx) => {
                  const dateKey = format(date, 'yyyy-MM-dd')
                  const lessons = roomDayMap[room.id]?.[dateKey] || []
                  const sections = [
                    { key: 'morning', label: '上午' },
                    { key: 'afternoon', label: '下午' },
                    { key: 'evening', label: '晚上（至21:00）' },
                  ] as const
                  return (
                    <button type="button" key={dayIdx} aria-label={`查看${room.name}${format(date, 'M月d日')}排课`} style={{ padding: 4, minHeight: 80, cursor: 'pointer',
                      width: '100%', textAlign: 'left', color: 'inherit', font: 'inherit', background: 'transparent',
                      borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
                    }} onClick={() => onCellClick(date)}>
                      {lessons.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', height: '100%', minHeight: 68, justifyContent: 'center' }}>
                          <span style={{ fontSize: 10, color: 'rgba(0,0,0,.25)' }}>未排课</span>
                        </div>
                      ) : (
                        <>
                          {sections.map((section) => {
                            const partLessons = lessons.filter((lesson) => lesson.part === section.key)
                            const teacherIds = [...new Set(partLessons.map((lesson) => lesson.teacherId))]
                            if (!partLessons.length) return null
                            return <div key={section.key}>
                              <div style={{ fontSize: 8, color: 'var(--color-text-tertiary, #98A2B3)', margin: section.key === 'morning' ? '0 0 2px' : '4px 0 2px' }}>{section.label}</div>
                              {teacherIds.map((teacherId) => {
                                const lesson = partLessons.find((item) => item.teacherId === teacherId)!
                                const color = getTeacherColor(teacherId)
                                return <div key={teacherId} style={{ borderRadius: 3, padding: '2px 5px', marginBottom: 2, background: `${color}15`, display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
                                  <span style={{ fontSize: 9, fontWeight: 500, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.teacherName}·{lesson.subject}</span>
                                </div>
                              })}
                            </div>
                          })}
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}

            {/* Intensive summary row */}
            <div style={{ padding: '8px', borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
              background: 'rgba(83,74,183,.03)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#534AB7' }}>突击全能班</div>
              <div style={{ fontSize: 9, color: '#534AB7' }}>1对1/2/3</div>
            </div>
            {weekDates.map((date, dayIdx) => {
              const dateKey = format(date, 'yyyy-MM-dd')
              const summary = intensiveByDay[dateKey]
              // 获取该日的详细课次
              const dayLessons = smallLessons.filter((l) =>
                format(new Date(l.lessonDate), 'yyyy-MM-dd') === dateKey
              )
              const uniqueTeachers = [...new Map(
                dayLessons.map((l) => [
                  l.teacher?.id || l.teacherId || '',
                  { id: l.teacher?.id || l.teacherId || '', name: l.teacher?.name || '', subject: l.subject || '' }
                ])
              ).values()]

              return (
                <button type="button" key={dayIdx} aria-label={`查看${format(date, 'M月d日')}突击全能班排课`} style={{ padding: 4, minHeight: 80, cursor: 'pointer',
                  width: '100%', textAlign: 'left', color: 'inherit', font: 'inherit',
                  borderRight: '0.5px solid var(--color-border, #EEE7E1)',
                  borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
                  background: 'rgba(83,74,183,.015)',
                }} onClick={() => router.push(`/schedule/intensive?date=${dateKey}`)}>
                  {summary ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#534AB7', marginBottom: 1 }}>
                        {summary.total}节
                      </div>
                      {uniqueTeachers.slice(0, 3).map(t => {
                        const color = getTeacherColor(t.id || '')
                        return (
                          <div key={t.id} style={{ borderRadius: 3, padding: '1px 4px', background: `${color}15`, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: color, flexShrink: 0 }} />
                            <span style={{ fontSize: 9, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.name}·{t.subject}
                            </span>
                          </div>
                        )
                      })}
                      {uniqueTeachers.length > 3 && (
                        <span style={{ fontSize: 9, color: '#98A2B3' }}>+{uniqueTeachers.length - 3}位教师</span>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%', minHeight: 68, justifyContent: 'center' }}>
                      <span style={{ fontSize: 10, color: 'rgba(0,0,0,.25)' }}>未排课</span>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, padding: '8px 14px', borderTop: '0.5px solid var(--color-border, #EEE7E1)', background: '#faf8f5' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
              <div style={{ width: 16, height: 4, borderRadius: 2, background: '#E8784A' }} /><span>精品班课</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
              <div style={{ width: 16, height: 4, borderRadius: 2, background: '#534AB7' }} /><span>突击全能班</span>
            </div>
            <Text type="secondary" style={{ fontSize: 10, marginLeft: 'auto' }}>点击格子跳转到对应日期详情</Text>
          </div>
        </div>
      )}
    </div>
  )
}
