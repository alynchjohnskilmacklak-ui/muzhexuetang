'use client'

import { useMemo, useState } from 'react'
import { format, addDays, startOfWeek } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { Spin, Empty, Select, Typography } from 'antd'
import useSWR from 'swr'
import { SCHEDULE_PERIODS, PERIOD_HEIGHTS, PERIOD_BG, CLASS_PERIODS_ONLY } from '@/lib/schedule-periods'

const { Text } = Typography

const TEACHER_COLORS = [
  '#E8784A', '#1D9E75', '#534AB7', '#D4537E',
  '#BA7517', '#185FA5', '#27500A', '#72243E'
]

function getTeacherColor(teacherId: string): string {
  if (!teacherId) return '#E8784A'
  const hash = teacherId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return TEACHER_COLORS[Math.abs(hash) % TEACHER_COLORS.length]
}

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六']

function getWeekDates(weekStart: Date): Date[] {
  return WEEK_DAYS.map((_, i) => addDays(weekStart, i))
}

const TYPE_LABELS: Record<string, string> = {
  GROUP: '班课', ONE_ON_ONE: '一对一', ONE_ON_TWO: '一对二', SMALL_GROUP: '小组课',
}

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : Promise.reject('load error'))

export function TeacherWeekView({
  onLessonClick,
}: {
  onLessonClick: (lesson: Record<string, unknown>) => void
}) {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | undefined>()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))

  const { data: teachersData, isLoading: loadingTeachers } = useSWR('/api/teachers?status=ACTIVE&limit=100', fetcher)
  const teacherList: Record<string, unknown>[] = Array.isArray(teachersData?.teachers)
    ? teachersData.teachers
    : Array.isArray(teachersData) ? teachersData : []

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart])
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')

  const shouldFetch = !!selectedTeacherId
  const { data: weekData } = useSWR(
    shouldFetch ? `/api/schedules/teacher-week?teacherId=${selectedTeacherId}&weekStart=${weekStartStr}` : null,
    fetcher
  )
  const lessons: Record<string, unknown>[] = Array.isArray(weekData?.lessons) ? weekData.lessons : []

  // Secondary frontend filter by teacherId (safety net)
  const filteredLessons = useMemo(() => {
    if (!selectedTeacherId) return []
    return lessons.filter(l => {
      const tId = (l.teacher as Record<string, unknown> | undefined)?.id || l.teacherId
      return String(tId) === selectedTeacherId
    })
  }, [lessons, selectedTeacherId])

  const lessonsByDayPeriod = useMemo(() => {
    const map: Record<string, Record<string, Record<string, unknown>>> = {}
    filteredLessons.forEach((l: Record<string, unknown>) => {
      const dateKey = format(new Date(l.lessonDate as string), 'yyyy-MM-dd')
      const startTime = l.startTime as string
      const period = SCHEDULE_PERIODS.find(p => p.type === 'CLASS' && p.start === startTime)
      if (period) {
        if (!map[dateKey]) map[dateKey] = {}
        map[dateKey][period.id] = l
      }
    })
    return map
  }, [filteredLessons])

  const selectedTeacher = teacherList.find(t => t.id === selectedTeacherId)
  const teacherColor = selectedTeacherId ? getTeacherColor(selectedTeacherId) : '#E8784A'

  return (
    <div>
      {/* Week navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setWeekStart((prev: Date) => addDays(prev, -7))}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}
        >←</button>

        <div style={{
          padding: '0 16px', height: 34, display: 'flex', alignItems: 'center',
          background: '#fff', border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8,
          fontSize: 14, fontWeight: 500,
        }}>
          {format(weekStart, 'M月d日', { locale: zhCN })} – {format(addDays(weekStart, 5), 'M月d日', { locale: zhCN })}
        </div>

        <button
          onClick={() => setWeekStart((prev: Date) => addDays(prev, 7))}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}
        >→</button>

        <button
          onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}
        >本周</button>

        <div style={{ marginLeft: 'auto', width: 220 }}>
          <Select
            showSearch
            placeholder="选择教师"
            style={{ width: '100%' }}
            value={selectedTeacherId}
            onChange={v => setSelectedTeacherId(v)}
            filterOption={(input, option) => (option?.label as string || '').includes(input)}
            options={teacherList.map((t: Record<string, unknown>) => ({
              label: t.name as string,
              value: t.id as string,
            }))}
          />
        </div>
      </div>

      {loadingTeachers ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : !shouldFetch ? (
        <Empty description="请从上方下拉选择一个教师查看课表" />
      ) : (
        <div style={{ overflowX: 'auto', border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `80px repeat(6, 1fr)`,
            minWidth: 720,
          }}>
            {/* Header */}
            <div style={{ borderRight: '0.5px solid var(--color-border, #EEE7E1)', borderBottom: '0.5px solid var(--color-border, #EEE7E1)', background: 'var(--color-background-secondary, #faf8f5)' }} />
            {weekDates.map((date, i) => {
              const today = format(new Date(), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
              return (
                <div key={i} style={{
                  textAlign: 'center', padding: '8px 4px',
                  borderRight: '0.5px solid var(--color-border, #EEE7E1)',
                  borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
                  background: today ? 'rgba(232,120,74,.06)' : 'transparent',
                }}>
                  <div style={{ fontSize: 10, color: 'var(--color-text-tertiary, #98A2B3)' }}>{WEEK_DAYS[i]}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: today ? '#E8784A' : '#1F2329' }}>
                    {format(date, 'd')}
                  </div>
                </div>
              )
            })}

            {/* Period rows */}
            {SCHEDULE_PERIODS.map(period => {
              const displayHeight = period.type === 'CLASS' ? PERIOD_HEIGHTS.CLASS
                : period.type === 'BIG_BREAK' ? 18
                : period.type === 'LUNCH' ? 22
                : 14

              return (
                <div key={period.id} style={{ display: 'contents' }}>
                  <div style={{
                    height: displayHeight,
                    background: PERIOD_BG[period.type],
                    borderRight: '0.5px solid var(--color-border, #EEE7E1)',
                    borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
                    padding: '2px 6px',
                    display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'flex-end',
                    fontSize: 9,
                    color: period.type === 'CLASS' ? '#E8784A'
                      : period.type === 'BIG_BREAK' ? '#534AB7'
                      : period.type === 'LUNCH' ? '#1D9E75'
                      : 'var(--color-text-tertiary, #98A2B3)',
                    fontWeight: period.type === 'BREAK' ? 'normal' : 500,
                    fontStyle: period.type === 'BREAK' ? 'italic' : 'normal',
                  }}>
                    {period.type === 'CLASS' ? `${period.name} ${period.start}–${period.end}`
                      : period.type === 'LUNCH' ? `午休 ${period.start}–${period.end}`
                      : period.name}
                  </div>

                  {weekDates.map((date, dayIdx) => {
                    const dateKey = format(date, 'yyyy-MM-dd')
                    const lesson = lessonsByDayPeriod[dateKey]?.[period.id]
                    return (
                      <div key={dayIdx} style={{
                        height: displayHeight,
                        background: PERIOD_BG[period.type],
                        borderRight: '0.5px solid var(--color-border, #EEE7E1)',
                        borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
                        padding: period.type === 'CLASS' ? 3 : 0,
                      }}>
                        {period.type === 'CLASS' && lesson ? (
                          <div
                            onClick={() => onLessonClick(lesson!)}
                            style={{
                              height: '100%', borderRadius: 4, padding: '3px 6px',
                              background: `${teacherColor}15`,
                              borderLeft: `3px solid ${teacherColor}`,
                              cursor: 'pointer',
                              display: 'flex', flexDirection: 'column', justifyContent: 'center',
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
                              <span style={{ fontSize: 12, fontWeight: 600, color: teacherColor, lineHeight: 1.3 }}>
                                {(lesson.group as any)?.course?.name || '-'}
                              </span>
                              {(lesson.group as any)?.course?.type && (lesson.group as any).course.type !== 'GROUP' && (
                                <span style={{ fontSize: 8, background: 'rgba(83,74,183,.12)', color: '#534AB7', padding: '0 3px', borderRadius: 2, fontWeight: 500, whiteSpace: 'nowrap' }}>
                                  {TYPE_LABELS[(lesson.group as any).course.type] || (lesson.group as any).course.type}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 10, color: teacherColor, opacity: .8, lineHeight: 1.3 }}>
                              {(lesson.group as any)?.room?.name || '-'} · {(lesson.group as any)?.enrollments?.length || 0}人
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
          {selectedTeacher && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderTop: '0.5px solid var(--color-border, #EEE7E1)' }}>
              <div style={{ width: 16, height: 4, borderRadius: 2, background: teacherColor }} />
              <Text style={{ fontSize: 12 }}>{selectedTeacher.name as string}老师</Text>
              <Text type="secondary" style={{ fontSize: 11 }}>共 {filteredLessons.length} 节课</Text>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
