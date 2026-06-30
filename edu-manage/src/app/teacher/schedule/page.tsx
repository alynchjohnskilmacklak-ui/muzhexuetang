'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Card, Empty, Spin, Tag, Typography } from 'antd'
import { BellOutlined, ClockCircleOutlined, CoffeeOutlined, EnvironmentOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
import { findSchedulePeriod, PERIOD_HEIGHTS, PERIOD_BG } from '@/lib/schedule-periods'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useSchedulePeriods } from '@/hooks/useSchedulePeriods'

const { Title, Text } = Typography
const fetcher = (url: string) => fetch(url).then(r => r.json())

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const INTENSIVE_SLOTS = [
  { id:'h08', start:'08:00', end:'09:00', label:'08:00–09:00' },
  { id:'h09', start:'09:00', end:'10:00', label:'09:00–10:00' },
  { id:'h10', start:'10:00', end:'11:00', label:'10:00–11:00' },
  { id:'h11', start:'11:00', end:'12:00', label:'11:00–12:00' },
  { id:'h14', start:'14:00', end:'15:00', label:'14:00–15:00' },
  { id:'h15', start:'15:00', end:'16:00', label:'15:00–16:00' },
  { id:'h16', start:'16:00', end:'17:00', label:'16:00–17:00' },
]
const INTENSIVE_CONFIG: Record<string, { label:string; color:string; bg:string }> = {
  ONE_ON_ONE:   { label:'一对一', color:'#534AB7', bg:'rgba(83,74,183,.1)' },
  SMALL_GROUP:  { label:'一对三', color:'#D4537E', bg:'rgba(212,83,126,.1)' },
}

function getWeekRange(offset = 0) {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
  monday.setHours(0,0,0,0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23,59,59,999)
  return { start: monday, end: sunday }
}

export default function TeacherSchedulePage() {
  const isMobile = useIsMobile() ?? false
  const isTablet = useIsMobile(1025) ?? false
  const [scheduleType, setScheduleType] = useState<'group'|'intensive'>('group')
  const [weekOffset, setWeekOffset] = useState(0)
  const { periods } = useSchedulePeriods()
  const { start, end } = getWeekRange(weekOffset)
  const startDate = start.toISOString().slice(0,10)
  const endDate = end.toISOString().slice(0,10)

  // Fetch both types for stats
  const { data: groupData, isLoading: loadingGroup } = useSWR(
    `/api/teacher/schedule?startDate=${startDate}&endDate=${endDate}&type=GROUP`, fetcher
  )
  const { data: intensiveData, isLoading: loadingIntensive } = useSWR(
    `/api/teacher/schedule?startDate=${startDate}&endDate=${endDate}&type=INTENSIVE`, fetcher
  )

  const currentTeacherId = groupData?.currentTeacherId || intensiveData?.currentTeacherId || ''
  const groupLessons: any[] = Array.isArray(groupData?.lessons) ? groupData.lessons : []
  const intensiveLessons: any[] = Array.isArray(intensiveData?.lessons) ? intensiveData.lessons : []
  const allLessons = [...groupLessons, ...intensiveLessons]
  const isLoading = loadingGroup || loadingIntensive

  // Stats
  const stats = useMemo(() => {
    const uniqueStudentIds = new Set<string>()
    allLessons.forEach((l: any) => {
      l.group?.enrollments?.forEach((e: any) => { if (e.student?.id) uniqueStudentIds.add(e.student.id) })
    })
    return {
      total: allLessons.length,
      completed: allLessons.filter((l: any) => l.status === 'COMPLETED').length,
      students: uniqueStudentIds.size,
    }
  }, [allLessons])

  // Group grid: day × period matrix
  const groupGrid = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (let d = 0; d < 7; d++) {
      for (const p of periods) map[`${d}-${p.id}`] = []
    }
    for (const lesson of groupLessons) {
      const ld = new Date(lesson.lessonDate)
      const dayIdx = (ld.getDay() + 6) % 7
      const period = findSchedulePeriod(periods, lesson.startTime)
      if (period) map[`${dayIdx}-${period.id}`]?.push(lesson)
    }
    return map
  }, [groupLessons, periods])

  // Intensive grid: day × hour slot
  const intensiveGrid = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (let d = 0; d < 7; d++) {
      for (const s of INTENSIVE_SLOTS) map[`${d}-${s.id}`] = []
    }
    for (const lesson of intensiveLessons) {
      const ld = new Date(lesson.lessonDate)
      const dayIdx = (ld.getDay() + 6) % 7
      const sh = parseInt((lesson.startTime || '00').split(':')[0])
      const slot = INTENSIVE_SLOTS.find(s => parseInt(s.start.split(':')[0]) === sh)
      if (slot) map[`${dayIdx}-${slot.id}`]?.push(lesson)
    }
    return map
  }, [intensiveLessons])

  const weekDates = useMemo(() => {
    const d = new Date(start)
    return WEEKDAYS.map((_, i) => { const nd = new Date(d); nd.setDate(d.getDate() + i); return nd })
  }, [start])
  const visibleLessons = scheduleType === 'group' ? groupLessons : intensiveLessons
  const mobileLessonsByDay = useMemo(() => {
    return weekDates.map((date, index) => {
      const lessons = visibleLessons
        .filter((lesson: any) => new Date(lesson.lessonDate).toDateString() === date.toDateString())
        .sort((a: any, b: any) => String(a.startTime || '').localeCompare(String(b.startTime || '')))
      return { date, label: WEEKDAYS[index], lessons }
    })
  }, [visibleLessons, weekDates])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-end', marginBottom: 16, flexWrap: 'wrap', gap: 8, flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>我的课表</Title>
          <Text type="secondary">{startDate} 至 {endDate}</Text>
        </div>
        <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : undefined }}>
          {/* Week nav */}
          <button onClick={() => setWeekOffset(o => o - 1)} style={{ ...navBtnStyle, flex: isMobile ? 1 : undefined }}>←</button>
          <button onClick={() => setWeekOffset(0)} style={{ ...navBtnStyle, flex: isMobile ? 1 : undefined }}>本周</button>
          <button onClick={() => setWeekOffset(o => o + 1)} style={{ ...navBtnStyle, flex: isMobile ? 1 : undefined }}>→</button>
        </div>
      </div>

      {/* Type tabs */}
      <div style={{ display: 'flex', border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8, overflow: 'hidden', width: isMobile ? '100%' : 'fit-content', marginBottom: 12 }}>
        <button onClick={() => setScheduleType('group')} style={{
          padding: '7px 18px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: scheduleType === 'group' ? 500 : 400, width: isMobile ? '50%' : undefined,
          background: scheduleType === 'group' ? '#E8784A' : 'transparent',
          color: scheduleType === 'group' ? '#fff' : 'var(--color-text-secondary, #666)',
        }}>精品班课</button>
        <button onClick={() => setScheduleType('intensive')} style={{
          padding: '7px 18px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: scheduleType === 'intensive' ? 500 : 400, width: isMobile ? '50%' : undefined,
          background: scheduleType === 'intensive' ? '#534AB7' : 'transparent',
          color: scheduleType === 'intensive' ? '#fff' : 'var(--color-text-secondary, #666)',
        }}>突击全能班</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: isMobile ? 8 : 12, marginBottom: 16 }}>
        <Card bordered={false} style={{ borderRadius: 10 }}><Text type="secondary" style={{ fontSize: isMobile ? 11 : undefined }}>本周课次</Text><div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700 }}>{stats.total}</div></Card>
        <Card bordered={false} style={{ borderRadius: 10 }}><Text type="secondary" style={{ fontSize: isMobile ? 11 : undefined }}>已完成</Text><div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#1D9E75' }}>{stats.completed}</div></Card>
        <Card bordered={false} style={{ borderRadius: 10 }}><Text type="secondary" style={{ fontSize: isMobile ? 11 : undefined }}>在带学员</Text><div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, color: '#E8784A' }}>{stats.students}</div></Card>
      </div>

      {isLoading ? <Spin size="large" style={{ display: 'block', margin: '60px auto' }} /> : (
        isMobile ? (
          <Card bordered={false} title="本周课程列表" style={{ borderRadius: 10 }}>
            {visibleLessons.length === 0 ? <Empty description="本周暂无课程" /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {mobileLessonsByDay.map((day) => (
                  <div key={day.label}>
                    <div style={{ fontWeight: 700, color: '#1F2329', marginBottom: 8 }}>
                      {day.label} {day.date.getMonth() + 1}月{day.date.getDate()}日
                    </div>
                    {day.lessons.length ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {day.lessons.map((lesson: any) => {
                          const courseType = lesson.group?.course?.type
                          const intensiveCfg = INTENSIVE_CONFIG[courseType || 'ONE_ON_ONE'] || INTENSIVE_CONFIG.ONE_ON_ONE
                          const accent = scheduleType === 'group' ? '#E8784A' : intensiveCfg.color
                          const lessonSubject = lesson.subject || lesson.group?.course?.subject
                          return (
                            <div key={lesson.id} style={{ border: '1px solid #EEE7E1', borderTop: `3px solid ${accent}`, borderRadius: 10, padding: '10px 12px', background: '#fff', minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ color: accent, fontWeight: 700, fontSize: 13 }}>
                                  {lesson.startTime || '-'}{lesson.endTime ? `–${lesson.endTime}` : ''}
                                </span>
                                <Tag color={lesson.status === 'COMPLETED' ? 'green' : 'orange'}
                                  style={{ marginInlineEnd: 0, fontSize: 11 }}>
                                  {lesson.status === 'COMPLETED' ? '已完成' : '待上课'}
                                </Tag>
                              </div>
                              <div style={{ fontWeight: 700, color: '#1F2329', fontSize: 14, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {lesson.group?.name || lesson.group?.course?.name || '-'}
                              </div>
                              {lessonSubject && (
                                <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 9999,
                                  background: `${accent}18`, color: accent, marginBottom: 4, display: 'inline-block' }}>
                                  {lessonSubject}
                                </span>
                              )}
                              <div style={{ display: 'flex', gap: 12, color: '#8D806F', fontSize: 12, marginTop: 4 }}>
                                <span><EnvironmentOutlined /> {lesson.group?.room?.name || '-'}</span>
                                <span><TeamOutlined /> {lesson.group?.enrollments?.length || 0}人</span>
                                {scheduleType === 'intensive' && (
                                  <span><UserOutlined /> {lesson.group?.enrollments?.[0]?.student?.name || '-'}</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{ color: '#98A2B3', fontSize: 12, padding: '4px 0 8px' }}>暂无课程</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) :
        scheduleType === 'group' ? (
          groupLessons.length === 0 ? <Empty description="本周暂无精品班课" /> : (
            <Card bordered={false} style={{ borderRadius: 10, overflow: 'auto' }} styles={{ body: { padding: 0 } }}>
              <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '56px repeat(7, minmax(58px, 1fr))' : '72px repeat(7, minmax(72px, 1fr))', minWidth: isTablet ? 0 : 640 }}>
                <div style={{ padding: 8, background: 'var(--color-background-secondary, #faf8f5)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)' }} />
                {weekDates.map((date, i) => {
                  const today = date.toDateString() === new Date().toDateString()
                  return (
                    <div key={i} style={{ textAlign: 'center', padding: '8px 4px', background: today ? '#FFF6F1' : undefined, borderBottom: '0.5px solid var(--color-border, #EEE7E1)' }}>
                      <div style={{ fontSize: 10, color: 'var(--color-text-tertiary, #98A2B3)' }}>{WEEKDAYS[i]}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: today ? '#E8784A' : '#1F2329' }}>{date.getDate()}</div>
                    </div>
                  )
                })}
                {periods.map(period => {
                  const h = period.type === 'CLASS' ? PERIOD_HEIGHTS.CLASS : period.type === 'BIG_BREAK' ? 20 : period.type === 'LUNCH' ? 22 : 16
                  return (
                    <div key={period.id} style={{ display: 'contents' }}>
                      <div style={{ minHeight: h, background: PERIOD_BG[period.type], borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)', padding: '2px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
                        {period.type === 'CLASS' && <><div style={{ fontSize: 10, fontWeight: 500, color: '#E8784A' }}>{period.name}</div><div style={{ fontSize: 8, fontFamily: 'monospace', color: 'var(--color-text-tertiary, #98A2B3)' }}>{period.start}–{period.end}</div></>}
                        {period.type === 'BREAK' && <span style={{ fontSize: 9, fontStyle: 'italic', color: 'var(--color-text-tertiary, #98A2B3)' }}>课间</span>}
                        {period.type === 'BIG_BREAK' && <span style={{ fontSize: 9, fontWeight: 500, color: '#534AB7', display: 'inline-flex', alignItems: 'center', gap: 3 }}><BellOutlined />大课间</span>}
                        {period.type === 'LUNCH' && <span style={{ fontSize: 9, fontWeight: 500, color: '#1D9E75', display: 'inline-flex', alignItems: 'center', gap: 3 }}><CoffeeOutlined />午休</span>}
                      </div>
                      {weekDates.map((date, dayIdx) => {
                        const items = groupGrid[`${dayIdx}-${period.id}`] || []
                        const hasItem = items.length > 0 && period.type === 'CLASS'
                        return (
                          <div key={dayIdx} style={{ minHeight: h, overflow: 'hidden', borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)', padding: 3, background: PERIOD_BG[period.type] }}>
                            {hasItem ? items.map((l: any) => (
                              <div key={l.id} style={{ background: 'rgba(232,120,74,.1)', borderRadius: 5, padding: '5px 7px', minHeight: 58, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                <div style={{ fontSize: 11, fontWeight: 500, color: '#E8784A', lineHeight: 1.3 }}>{l.group?.course?.name || l.group?.name || '-'}</div>
                                <div style={{ fontSize: 10, color: '#993C1D', lineHeight: 1.3 }}><EnvironmentOutlined style={{ fontSize: 9 }} /> {l.group?.room?.name || '-'}</div>
                                <div style={{ fontSize: 10, color: '#993C1D', lineHeight: 1.3 }}><TeamOutlined style={{ fontSize: 9 }} /> {l.group?.enrollments?.length || 0}人</div>
                              </div>
                            )) : period.type === 'CLASS' ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 40 }}>
                                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary, #98A2B3)' }}>—</span>
                              </div>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        ) : (
          intensiveLessons.length === 0 ? <Empty description="本周暂无突击全能班课程" /> : (
            <Card bordered={false} style={{ borderRadius: 10, overflow: 'auto' }} styles={{ body: { padding: 0 } }}>
              <div style={{ display: 'grid', gridTemplateColumns: isTablet ? '56px repeat(7, minmax(58px, 1fr))' : '72px repeat(7, minmax(72px, 1fr))', minWidth: isTablet ? 0 : 640 }}>
                <div style={{ padding: 8, background: 'var(--color-background-secondary, #faf8f5)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)' }} />
                {weekDates.map((date, i) => {
                  const today = date.toDateString() === new Date().toDateString()
                  return (
                    <div key={i} style={{ textAlign: 'center', padding: '8px 4px', background: today ? '#F5F0FF' : undefined, borderBottom: '0.5px solid var(--color-border, #EEE7E1)' }}>
                      <div style={{ fontSize: 10, color: 'var(--color-text-tertiary, #98A2B3)' }}>{WEEKDAYS[i]}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: today ? '#534AB7' : '#1F2329' }}>{date.getDate()}</div>
                    </div>
                  )
                })}
                {INTENSIVE_SLOTS.map((slot, si) => {
                  const isNoon = slot.start === '12:00'
                  const h = isNoon ? 22 : 68
                  return (
                    <div key={slot.id} style={{ display: 'contents' }}>
                      <div style={{ minHeight: h, borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)', padding: '4px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', background: isNoon ? 'rgba(29,158,117,.04)' : '#fafafa' }}>
                        {isNoon ? <span style={{ fontSize: 9, fontWeight: 500, color: '#1D9E75', display: 'inline-flex', alignItems: 'center', gap: 3 }}><CoffeeOutlined />午休</span> :
                          <><div style={{ fontSize: 11, fontWeight: 500, color: '#534AB7' }}>{slot.start.split(':')[0]}:00</div><div style={{ fontSize: 9, fontFamily: 'monospace', color: 'var(--color-text-tertiary, #98A2B3)' }}>至 {slot.end}</div></>
                        }
                      </div>
                      {weekDates.map((date, dayIdx) => {
                        if (isNoon) return <div key={dayIdx} style={{ minHeight: h, borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)', background: 'rgba(29,158,117,.02)' }} />
                        const items = intensiveGrid[`${dayIdx}-${slot.id}`] || []
                        return (
                          <div key={dayIdx} style={{ minHeight: h, overflow: 'hidden', borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)', padding: 3 }}>
                            {items.length ? items.map((l: any) => {
                              const ct = l.group?.course?.type || 'ONE_ON_ONE'
                              const cfg = INTENSIVE_CONFIG[ct] || INTENSIVE_CONFIG.ONE_ON_ONE
                              const studentName = l.group?.enrollments?.[0]?.student?.name || ''
                              return (
                                <div key={l.id} style={{ background: cfg.bg, borderRadius: 5, padding: '5px 7px', minHeight: 56, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                  <div style={{ fontSize: 9, fontWeight: 500, color: cfg.color, background: `${cfg.color}18`, padding: '0 4px', borderRadius: 3, alignSelf: 'flex-start', marginBottom: 3 }}>{cfg.label}</div>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: cfg.color, lineHeight: 1.3 }}>{l.teacher?.name || l.teacherId || '-'}</div>
                                  <div style={{ fontSize: 11, color: cfg.color, lineHeight: 1.3 }}><UserOutlined style={{ fontSize: 10 }} /> {studentName}</div>
                                  <div style={{ fontSize: 10, color: cfg.color, opacity: .8, lineHeight: 1.3 }}>{l.subject || l.group?.course?.subject || '-'}</div>
                                </div>
                              )
                            }) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 40 }}>
                                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary, #98A2B3)' }}>—</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        )
      )}
    </div>
  )
}

const navBtnStyle: React.CSSProperties = { border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 13 }
