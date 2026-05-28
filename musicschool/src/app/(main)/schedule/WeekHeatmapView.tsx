'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format, addDays, startOfWeek } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Spin, Empty, Typography } from 'antd'
import useSWR from 'swr'

const { Text } = Typography

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六']

const TEACHER_COLORS = ['#E8784A', '#1D9E75', '#534AB7', '#D4537E', '#BA7517', '#185FA5', '#27500A', '#72243E']
function getTeacherColor(teacherId: string): string {
  if (!teacherId) return '#E8784A'
  const hash = teacherId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return TEACHER_COLORS[Math.abs(hash) % TEACHER_COLORS.length]
}
function isAM(startTime: string): boolean { return parseInt(startTime?.split(':')[0] || '0') < 12 }

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : Promise.reject('load error'))

export function WeekHeatmapView({
  weekStart, setWeekStart, onCellClick,
}: {
  weekStart: Date; setWeekStart: (d: Date) => void; onCellClick: (date: Date) => void
}) {
  const router = useRouter()
  const weekDates = useMemo(() => WEEK_DAYS.map((_, i) => addDays(weekStart, i)), [weekStart])
  const startStr = format(weekStart, 'yyyy-MM-dd')
  const endStr = format(addDays(weekStart, 5), 'yyyy-MM-dd')

  // Get GROUP lessons for classrooms
  const { data: groupData, isLoading: loadingGroup } = useSWR(
    `/api/class-lessons?startDate=${startStr}&endDate=${endStr}&courseType=GROUP`, fetcher, { refreshInterval: 120_000 }
  )
  // Get SMALL lessons for intensive summary
  const { data: smallData } = useSWR(
    `/api/class-lessons?startDate=${startStr}&endDate=${endStr}&courseType=SMALL_GROUP`, fetcher, { refreshInterval: 120_000 }
  )
  const { data: roomsData } = useSWR('/api/rooms', fetcher)

  const groupLessons: Record<string, unknown>[] = Array.isArray(groupData) ? groupData : []
  const smallLessons: Record<string, unknown>[] = Array.isArray(smallData) ? smallData : []
  const allRooms: Record<string, unknown>[] = Array.isArray(roomsData) ? roomsData : []
  const classrooms = allRooms.filter(r => { const t = (r.type as string) || ''; return !t.includes('一对一') && !t.includes('ONE_ON_ONE') })

  // Build room×day map from GROUP lessons
  const roomDayMap = useMemo(() => {
    const map: Record<string, Record<string, { teacherId: string; teacherName: string; subject: string; startTime: string; isAM: boolean }[]>> = {}
    classrooms.forEach(r => { map[r.id as string] = {} })
    groupLessons.forEach((l: Record<string, unknown>) => {
      const roomId = (l.group as any)?.room?.id || ''
      if (!map[roomId]) return
      const dateKey = format(new Date(l.lessonDate as string), 'yyyy-MM-dd')
      if (!map[roomId][dateKey]) map[roomId][dateKey] = []
      map[roomId][dateKey].push({
        teacherId: (l.teacher as any)?.id || l.teacherId as string || '',
        teacherName: (l.teacher as any)?.name || (l.teacherName as string) || '',
        subject: (l.subject as string) || (l.group as any)?.course?.subject || '',
        startTime: l.startTime as string,
        isAM: isAM(l.startTime as string),
      })
    })
    return map
  }, [groupLessons, classrooms])

  // Build intensive summary per day
  const intensiveByDay = useMemo(() => {
    const map: Record<string, { total: number; types: Record<string, number> }> = {}
    smallLessons.forEach((l: Record<string, unknown>) => {
      const dateKey = format(new Date(l.lessonDate as string), 'yyyy-MM-dd')
      if (!map[dateKey]) map[dateKey] = { total: 0, types: {} }
      const type = ((l.group as any)?.course?.type as string) || 'ONE_ON_ONE'
      map[dateKey].total++
      map[dateKey].types[type] = (map[dateKey].types[type] || 0) + 1
    })
    return map
  }, [smallLessons])

  return (
    <div>
      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setWeekStart(addDays(weekStart, -7))}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>←</button>
        <div style={{ padding: '0 16px', height: 34, display: 'flex', alignItems: 'center', background: '#fff',
          border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
          {format(weekStart, 'M月d日', { locale: zhCN })} – {format(addDays(weekStart, 5), 'M月d日', { locale: zhCN })}
        </div>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>→</button>
        <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>本周</button>
      </div>

      {loadingGroup ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : classrooms.length === 0 ? (
        <Empty description="暂无教室数据" />
      ) : (
        <div style={{ overflowX: 'auto', border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `100px repeat(6, 1fr)`, minWidth: 720 }}>
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
              <div key={room.id as string} style={{ display: 'contents' }}>
                <div style={{ padding: '8px', borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
                  background: '#faf8f5', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{room.name as string}</div>
                  <div style={{ fontSize: 9, color: '#E8784A' }}>精品班课</div>
                </div>
                {weekDates.map((date, dayIdx) => {
                  const dateKey = format(date, 'yyyy-MM-dd')
                  const lessons = roomDayMap[room.id as string]?.[dateKey] || []
                  const amLessons = lessons.filter(l => l.isAM)
                  const pmLessons = lessons.filter(l => !l.isAM)
                  const uniqueAMTeachers = [...new Set(amLessons.map(l => l.teacherId))]
                  const uniquePMTeachers = [...new Set(pmLessons.map(l => l.teacherId))]
                  return (
                    <div key={dayIdx} style={{ padding: 4, minHeight: 80, cursor: 'pointer',
                      borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
                    }} onClick={() => onCellClick(date)}>
                      {lessons.length === 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', height: '100%', minHeight: 68, justifyContent: 'center' }}>
                          <span style={{ fontSize: 10, color: 'rgba(0,0,0,.25)' }}>未排课</span>
                        </div>
                      ) : (
                        <>
                          {amLessons.length > 0 && <div style={{ fontSize: 8, color: 'var(--color-text-tertiary, #98A2B3)', marginBottom: 2 }}>上午</div>}
                          {uniqueAMTeachers.map(tid => {
                            const l = amLessons.find(x => x.teacherId === tid)
                            if (!l) return null
                            const color = getTeacherColor(tid)
                            return (
                              <div key={tid} style={{ borderRadius: 3, padding: '2px 5px', marginBottom: 2, background: `${color}15`, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
                                <span style={{ fontSize: 9, fontWeight: 500, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {l.teacherName}·{l.subject}
                                </span>
                              </div>
                            )
                          })}
                          {pmLessons.length > 0 && <div style={{ fontSize: 8, color: 'var(--color-text-tertiary, #98A2B3)', margin: '4px 0 2px' }}>下午</div>}
                          {uniquePMTeachers.map(tid => {
                            const l = pmLessons.find(x => x.teacherId === tid)
                            if (!l) return null
                            const color = getTeacherColor(tid)
                            return (
                              <div key={tid} style={{ borderRadius: 3, padding: '2px 5px', marginBottom: 2, background: `${color}15`, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
                                <span style={{ fontSize: 9, fontWeight: 500, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {l.teacherName}·{l.subject}
                                </span>
                              </div>
                            )
                          })}
                        </>
                      )}
                    </div>
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
              return (
                <div key={dayIdx} style={{ padding: 4, minHeight: 80, cursor: 'pointer',
                  borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
                  background: 'rgba(83,74,183,.015)',
                }} onClick={() => router.push(`/schedule/intensive?date=${dateKey}`)}>
                  {summary ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center', height: '100%' }}>
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#534AB7' }}>已排 {summary.total} 节</div>
                      {summary.types.ONE_ON_ONE > 0 && <div style={{ fontSize: 9, color: '#3C3489' }}>1对1 × {summary.types.ONE_ON_ONE}</div>}
                      {summary.types.SMALL_GROUP > 0 && <div style={{ fontSize: 9, color: '#72243E' }}>1对3 × {summary.types.SMALL_GROUP}</div>}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', height: '100%', minHeight: 68, justifyContent: 'center' }}>
                      <span style={{ fontSize: 10, color: 'rgba(0,0,0,.25)' }}>未排课</span>
                    </div>
                  )}
                </div>
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
