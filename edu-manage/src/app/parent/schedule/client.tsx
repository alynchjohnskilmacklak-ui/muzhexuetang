'use client'

import { useMemo, useState } from 'react'
import { Card, Empty, Select, Tag, Typography } from 'antd'
import { ClockCircleOutlined, EnvironmentOutlined, TeamOutlined } from '@ant-design/icons'
import { SCHEDULE_PERIODS, PERIOD_HEIGHTS, PERIOD_BG } from '@/lib/schedule-periods'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text } = Typography
const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const SUBJECT_COLORS: Record<string, string> = {
  '语文': '#D4537E', '数学': '#E8784A', '英语': '#185FA5',
  '物理': '#1D9E75', '化学': '#534AB7', '生物': '#27500A',
  '地理': '#BA7517', '历史': '#633806', '政治': '#6B2B6B',
}
function getSubjectColor(subject: string): string {
  for (const [key, color] of Object.entries(SUBJECT_COLORS)) {
    if (subject?.includes(key)) return color
  }
  return '#E8784A'
}

function lessonDateTime(lesson: any, time: string) {
  const dateText = new Date(lesson.lessonDate).toISOString().slice(0, 10)
  return new Date(`${dateText}T${time}:00`)
}

function getLessonStatus(lesson: any): { text: string; color: string; deducted: string } {
  if (lesson.attendanceSubmittedAt) return { text: '已结束', color: 'green', deducted: '已确认' }
  const now = new Date()
  const start = lessonDateTime(lesson, lesson.startTime)
  const end = lessonDateTime(lesson, lesson.endTime)
  if (now < start) return { text: '待上课', color: 'blue', deducted: '待上课' }
  if (now >= start && now <= end) return { text: '上课中', color: 'processing', deducted: '待确认' }
  return { text: '待老师确认', color: 'orange', deducted: '待确认' }
}

export function ParentScheduleClient({ students, lessons }: { students: any[]; lessons: any[] }) {
  const isMobile = useIsMobile() ?? false
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '')

  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1))
  monday.setHours(0, 0, 0, 0)

  const weekDates = useMemo(() => WEEKDAYS.map((_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d
  }), [monday])

  // Filter lessons for selected child
  const childLessons = useMemo(() => lessons.filter(l =>
    l.group?.enrollments?.some((e: any) => e.student?.id === selectedStudentId)
  ), [lessons, selectedStudentId])

  // Build day × period grid
  const grid = useMemo(() => {
    const map: Record<string, any[]> = {}
    for (let d = 0; d < 7; d++) {
      for (const p of SCHEDULE_PERIODS) map[`${d}-${p.id}`] = []
    }
    childLessons.forEach((l: any) => {
      const ld = new Date(l.lessonDate)
      const dayIdx = (ld.getDay() + 6) % 7
      const period = SCHEDULE_PERIODS.find(p => p.type === 'CLASS' && p.start === l.startTime)
      if (period) map[`${dayIdx}-${period.id}`]?.push(l)
    })
    return map
  }, [childLessons])

  const selectedStudent = students.find(s => s.id === selectedStudentId)
  const mobileLessons = useMemo(() => [...childLessons].sort((a, b) =>
    String(a.lessonDate).localeCompare(String(b.lessonDate)) || String(a.startTime).localeCompare(String(b.startTime))
  ), [childLessons])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>课程表</Title>
          <Text type="secondary" style={{ fontSize: 12 }}>本周课程安排</Text>
        </div>
        <Select value={selectedStudentId || undefined} style={{ width: 180 }} getPopupContainer={(trigger) => trigger.parentElement ?? document.body} onChange={v => setSelectedStudentId(v)}
          options={students.map((s: any) => ({ label: s.name, value: s.id }))} />
      </div>

      {!students.length ? (
        <Card bordered={false} style={{ borderRadius: 10, minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
          <Empty description="暂未绑定学员" />
        </Card>
      ) : childLessons.length === 0 ? (
        <Card bordered={false} style={{ borderRadius: 10, minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
          <Empty description={`${selectedStudent?.name || ''}本周暂无课程`} />
        </Card>
      ) : isMobile ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {mobileLessons.map((lesson: any, index) => {
            const status = getLessonStatus(lesson)
            const studentNames = lesson.group?.enrollments?.map((e: any) => e.student?.name).filter(Boolean).join('、') || selectedStudent?.name || '-'
            return (
            <div key={lesson.id}>
              {(index === 0 || new Date(mobileLessons[index - 1].lessonDate).toDateString() !== new Date(lesson.lessonDate).toDateString()) && (
                <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 600 }}>
                  {new Date(lesson.lessonDate).toLocaleDateString('zh-CN')}
                </Text>
              )}
            <Card bordered={false} style={{ borderRadius: 10, background: '#fff', border: '1px solid #EEE7E1' }} styles={{ body: { padding: 14 } }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                <Text strong style={{ color: '#1F2329' }}>{lesson.group?.course?.name || '-'}</Text>
                <Tag color={status.color}>{status.text}</Tag>
              </div>
              <div style={{ display: 'grid', gap: 5, fontSize: 12, color: '#5a4e3a' }}>
                <span><ClockCircleOutlined style={{ marginRight: 5 }} />{new Date(lesson.lessonDate).toLocaleDateString('zh-CN')} {lesson.startTime}-{lesson.endTime}</span>
                <span><TeamOutlined style={{ marginRight: 5 }} />{lesson.teacher?.name || lesson.group?.teacher?.name || '-'}</span>
                <span><EnvironmentOutlined style={{ marginRight: 5 }} />{lesson.group?.room?.name || '-'}</span>
                <span>学生：{studentNames}</span>
                <span>考勤状态：{lesson.attendanceSubmittedAt ? '老师已确认' : '待老师确认'}</span>
                <span>课时扣除：{status.deducted}</span>
              </div>
            </Card>
            </div>
            )
          })}
        </div>
      ) : (
        <Card bordered={false} style={{ borderRadius: 10, overflow: 'auto', background: '#fff' }} bodyStyle={{ padding: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '72px repeat(7, minmax(72px, 1fr))', minWidth: 640 }}>
            <div style={{ padding: 8, background: '#faf8f5', borderBottom: '0.5px solid #EEE7E1' }} />
            {weekDates.map((date, i) => {
              const isToday = date.toDateString() === today.toDateString()
              return (
                <div key={i} style={{ textAlign: 'center', padding: '8px 4px', background: isToday ? '#FFF6F1' : undefined, borderBottom: '0.5px solid #EEE7E1' }}>
                  <div style={{ fontSize: 10, color: '#98A2B3' }}>{WEEKDAYS[i]}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? '#E8784A' : '#1F2329' }}>{date.getDate()}</div>
                </div>
              )
            })}
            {SCHEDULE_PERIODS.map(period => {
              const h = period.type === 'CLASS' ? 70 : period.type === 'BIG_BREAK' ? 20 : period.type === 'LUNCH' ? 24 : 16
              return (
                <div key={period.id} style={{ display: 'contents' }}>
                  <div style={{ minHeight: h, background: PERIOD_BG[period.type], borderRight: '0.5px solid #EEE7E1', borderBottom: '0.5px solid #EEE7E1', padding: '2px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end' }}>
                    {period.type === 'CLASS' && <><div style={{ fontSize: 10, fontWeight: 500, color: '#E8784A' }}>{period.name}</div><div style={{ fontSize: 8, fontFamily: 'monospace', color: '#98A2B3' }}>{period.start}–{period.end}</div></>}
                    {period.type === 'BREAK' && <span style={{ fontSize: 9, fontStyle: 'italic', color: '#98A2B3' }}>课间</span>}
                    {period.type === 'BIG_BREAK' && <span style={{ fontSize: 9, fontWeight: 500, color: '#534AB7' }}>大课间</span>}
                    {period.type === 'LUNCH' && <span style={{ fontSize: 9, fontWeight: 500, color: '#1D9E75' }}>午休</span>}
                  </div>
                  {weekDates.map((_, dayIdx) => {
                    const items = grid[`${dayIdx}-${period.id}`] || []
                    const hasItem = items.length > 0 && period.type === 'CLASS'
                    return (
                      <div key={dayIdx} style={{ minHeight: h, borderRight: '0.5px solid #EEE7E1', borderBottom: '0.5px solid #EEE7E1', padding: 3, background: PERIOD_BG[period.type] }}>
                        {hasItem ? items.map((l: any) => {
                          const subject = l.group?.course?.subject || ''
                          const color = getSubjectColor(subject)
                          const status = getLessonStatus(l)
                          return (
                            <div key={l.id} style={{ borderLeft: `3px solid ${color}`, background: `${color}10`, borderRadius: 5, padding: '5px 7px', height: '100%', minHeight: 54, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                              <div style={{ fontSize: 11, fontWeight: 500, color, lineHeight: 1.3 }}>{l.group?.course?.name || '-'}</div>
                              <div style={{ fontSize: 10, color, opacity: .8, lineHeight: 1.3 }}><TeamOutlined style={{ fontSize: 9 }} /> {l.teacher?.name || l.group?.teacher?.name || '-'}</div>
                              <div style={{ fontSize: 9, color, opacity: .6, lineHeight: 1.3 }}><EnvironmentOutlined style={{ fontSize: 8 }} /> {l.group?.room?.name || '-'}</div>
                              <Tag color={status.color} style={{ alignSelf: 'flex-start', marginTop: 3, fontSize: 9, lineHeight: 1.4 }}>{status.text}</Tag>
                            </div>
                          )
                        }) : period.type === 'CLASS' ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 40 }}>
                            <span style={{ fontSize: 11, color: '#ddd' }}>—</span>
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
      )}
    </div>
  )
}
