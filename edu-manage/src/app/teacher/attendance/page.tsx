'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { Button, Card, Empty, List, message, Space, Tag, Typography } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { toast } from 'sonner'
import { formatHours } from '@/lib/format'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text } = Typography
const fetcher = (url: string) => fetch(url).then(res => res.json())

const STATUS_CONFIG: Record<string, { border: string; bg: string; badge: string; text: string; label: string }> = {
  none:    { border: 'transparent', bg: 'var(--color-background-secondary, #faf8f5)', badge: 'rgba(0,0,0,.06)', text: 'var(--color-text-tertiary, #98A2B3)', label: '未标记' },
  PRESENT: { border: '#1D9E75', bg: '#E1F5EE', badge: '#1D9E75', text: '#fff', label: '出勤' },
  LEAVE:   { border: '#BA7517', bg: '#FAEEDA', badge: '#BA7517', text: '#fff', label: '请假' },
  ABSENT:  { border: '#E24B4A', bg: '#FCEBEB', badge: '#E24B4A', text: '#fff', label: '旷课' },
}
const ATT_CYCLE = ['none', 'PRESENT', 'LEAVE', 'ABSENT'] as const
type AttStatus = 'none' | 'PRESENT' | 'LEAVE' | 'ABSENT'
type TeacherLesson = {
  id: string
  groupName?: string
  courseName?: string
  courseType?: string
  time?: string
  startTime?: string
  lessonDate?: string
  room?: string
  attendanceCount?: number
  status?: string
}
type AttendanceStudent = {
  studentId: string
  enrollmentId?: string
  status?: AttStatus
  name?: string
  remainHours?: number
}

const STUDENT_COLORS = ['#E8784A','#1D9E75','#534AB7','#D4537E','#BA7517','#185FA5','#27500A','#72243E']
function getStudentBg(id: string) { return STUDENT_COLORS[(id || '').split('').reduce((a,c) => a + c.charCodeAt(0), 0) % STUDENT_COLORS.length] }

function attendanceTimeHint(lesson: Record<string, unknown> | undefined) {
  const startTime = (lesson?.startTime as string) || String(lesson?.time || '').slice(0, 5)
  const lessonDate = (lesson?.lessonDate as string) || new Date().toISOString()
  const dateStr = lessonDate.substring(0, 10)
  if (!startTime || !dateStr) return null
  const lessonStart = new Date(`${dateStr}T${startTime}:00`)
  const earliestAllowed = new Date(lessonStart.getTime() - 30 * 60 * 1000)
  if (new Date() >= earliestAllowed) return null
  return (
    <div style={{ fontSize: 12, color: '#98A2B3', textAlign: 'center', padding: '4px 0', marginBottom: 4 }}>
      {startTime} 开课，最早 {earliestAllowed.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 可考勤
    </div>
  )
}

export default function TeacherAttendancePage() {
  const isMobile = useIsMobile() ?? false
  const { data: dashboard, mutate: mutateDashboard } = useSWR('/api/teacher/dashboard', fetcher)
  const lessons = useMemo(() => (dashboard?.todayLessons || []) as TeacherLesson[], [dashboard?.todayLessons])
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [students, setStudents] = useState<AttendanceStudent[]>([])
  const [attMap, setAttMap] = useState<Map<string, AttStatus>>(new Map())
  const [submitting, setSubmitting] = useState(false)
  const summary = useMemo(() => {
    const vals = [...attMap.values()]
    return {
      present: vals.filter(v => v === 'PRESENT').length,
      leave: vals.filter(v => v === 'LEAVE').length,
      absent: vals.filter(v => v === 'ABSENT').length,
      unmarked: vals.filter(v => v === 'none').length,
    }
  }, [attMap])

  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId) || lessons[0]

  useEffect(() => { if (!selectedLessonId && lessons[0]?.id) setSelectedLessonId(lessons[0].id) }, [lessons, selectedLessonId])

  useEffect(() => {
    if (!selectedLesson?.id) return
    fetch(`/api/teacher/attendance?lessonId=${selectedLesson.id}`)
      .then(res => res.json())
      .then(payload => {
        const list = (payload.students || []) as AttendanceStudent[]
        setStudents(list)
        const m = new Map<string, AttStatus>()
        list.forEach((student) => m.set(student.studentId, (student.status as AttStatus) || 'none'))
        setAttMap(m)
      })
      .catch((error) => toast.error(`学员列表加载失败：${error instanceof Error ? error.message : '请检查网络连接'}`))
  }, [selectedLesson?.id])

  const cycleAttendance = (studentId: string) => {
    setAttMap(prev => {
      const next = new Map(prev)
      const current = prev.get(studentId) || 'none'
      const idx = ATT_CYCLE.indexOf(current)
      const nextStatus = ATT_CYCLE[(idx + 1) % ATT_CYCLE.length]
      next.set(studentId, nextStatus)
      return next
    })
  }

  const handleAllPresent = () => {
    const m = new Map(attMap)
    students.forEach(s => m.set(s.studentId, 'PRESENT'))
    setAttMap(m)
  }

  const [submitted, setSubmitted] = useState(false)
  const submittingRef = { current: false }

  const submitAttendance = async () => {
    if (submitting || submittingRef.current) return
    submittingRef.current = true
    if (!selectedLesson?.id) { submittingRef.current = false; return }
    const startTime = (selectedLesson.startTime as string) || String(selectedLesson.time || '').slice(0, 5)
    const lessonDate = (selectedLesson.lessonDate as string) || new Date().toISOString()
    if (startTime && lessonDate) {
      const dateStr = typeof lessonDate === 'string'
        ? lessonDate.substring(0, 10)
        : new Date(lessonDate).toISOString().substring(0, 10)
      const lessonStart = new Date(`${dateStr}T${startTime}:00`)
      const earliestAllowed = new Date(lessonStart.getTime() - 30 * 60 * 1000)
      if (new Date() < earliestAllowed) {
        message.warning(`未到考勤时间，课程 ${startTime} 开始，最早 30 分钟前可提交考勤`)
        return
      }
    }
    const records = students.map(s => ({
      studentId: s.studentId, enrollmentId: s.enrollmentId,
      status: attMap.get(s.studentId) || 'PRESENT',
      note: '',
    }))
    setSubmitting(true)
    const res = await fetch('/api/teacher/attendance', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: selectedLesson.id, records }),
    })
    const payload = await res.json().catch(() => ({}))
    setSubmitting(false)
    submittingRef.current = false
    if (!res.ok) { message.error(payload.error || '提交失败'); return }
    setSubmitted(true)
    mutateDashboard()
    fetch(`/api/teacher/attendance?lessonId=${selectedLesson.id}`)
      .then(r => r.json())
      .then(payload => {
        const list = (payload.students || []) as AttendanceStudent[]
        setStudents(list)
        const m = new Map<string, AttStatus>()
        list.forEach((student) => m.set(student.studentId, (student.status as AttStatus) || 'none'))
        setAttMap(m)
      })
      .catch((error) => toast.warning(`考勤已提交，但最新考勤列表刷新失败，请手动刷新页面。原因：${error instanceof Error ? error.message : '未知错误'}`))
    setTimeout(() => setSubmitted(false), 2000)
    if (payload.alreadyDeducted) {
      message.success(`✅ 考勤已更新，本次课次已结算课时`, 4)
    } else {
      message.success(`✅ 考勤已提交，本次课次状态已更新`, 4)
    }
  }

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>考勤录入</Title>

      <div style={isMobile ? { display: 'flex', flexDirection: 'column', gap: 12 } : { display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        {/* LEFT: Lesson list — pill tabs on mobile (grouped by time period), Card list on desktop */}
        {isMobile ? (
          (() => {
            const timeBucket = (startTime: string): '上午' | '下午' | '晚上' => {
              const h = parseInt((startTime || '00').split(':')[0])
              if (h < 12) return '上午'
              if (h < 18) return '下午'
              return '晚上'
            }
            const buckets = ['上午', '下午', '晚上'] as const
            const grouped = buckets.map(b => ({
              label: b,
              items: lessons.filter(l => timeBucket(l.time || l.startTime || '') === b)
            })).filter(g => g.items.length > 0)
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {grouped.map(g => (
                  <div key={g.label}>
                    <div style={{ fontSize: 11, color: '#98A2B3', marginBottom: 6, fontWeight: 500 }}>{g.label}</div>
                    <div style={{ display: 'flex', overflowX: 'auto', gap: 8, paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>
                      {g.items.map((lesson: TeacherLesson) => {
                        const selected = selectedLesson?.id === lesson.id
                        const done = Number(lesson.attendanceCount || 0) > 0 || lesson.status === 'COMPLETED'
                        const isOneOnOne = lesson.groupName?.includes('一对一') || lesson.courseType === 'ONE_ON_ONE'
                        const pillColor = done ? '#1D9E75' : isOneOnOne ? '#534AB7' : '#E8784A'
                        return (
                          <div key={lesson.id} onClick={() => setSelectedLessonId(lesson.id)} style={{
                            padding: '7px 14px', borderRadius: 20, fontSize: 13, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none',
                            border: `1.5px solid ${selected ? pillColor : '#EEE7E1'}`,
                            background: selected ? (isOneOnOne ? 'rgba(83,74,183,.08)' : '#FFF3EC') : '#fff',
                            color: selected ? pillColor : '#1F2329',
                            fontWeight: selected ? 600 : 400,
                            flexShrink: 0,
                          }}>
                            <div style={{ fontSize: 9, color: pillColor, marginBottom: 2 }}>
                              {isOneOnOne ? '一对一' : '班课'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {done && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#1D9E75', flexShrink: 0 }} />}
                              {!done && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5A623', flexShrink: 0 }} />}
                              {lesson.groupName || lesson.courseName} {lesson.time}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()
        ) : (
        <Card bordered={false} style={{ borderRadius: 10 }} title={`今日课次 (${lessons.length})`}>
          <List
            dataSource={lessons}
            locale={{ emptyText: '今日暂无课次' }}
            renderItem={(lesson: TeacherLesson) => {
              const selected = selectedLesson?.id === lesson.id
              const done = Number(lesson.attendanceCount || 0) > 0 || lesson.status === 'COMPLETED'
              return (
                <List.Item onClick={() => setSelectedLessonId(lesson.id)} style={{
                  cursor: 'pointer', border: selected ? '1px solid #E8784A' : '1px solid #f0e7de',
                  borderRadius: 8, padding: '8px 9px', marginBottom: 8,
                  background: selected ? '#FFF8F4' : '#fff',
                }}>
                  <div style={{ width: '100%' }}>
                    <Text strong style={{ fontSize: 12 }}>{lesson.groupName || lesson.courseName}</Text>
                    <div style={{ fontSize: 10, color: '#8d806f', marginTop: 2 }}>
                      <ClockCircleOutlined style={{ fontSize: 9 }} /> {lesson.time}
                    </div>
                    <div style={{ fontSize: 10, color: '#8d806f', marginTop: 1 }}>
                      <EnvironmentOutlined style={{ fontSize: 9 }} /> {lesson.room || '-'}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <Tag color={done ? 'green' : 'orange'} style={{ borderRadius: 9999, fontSize: 9 }}>
                        {done ? '已完成' : '待考勤'}
                      </Tag>
                    </div>
                  </div>
                </List.Item>
              )
            }}
          />
          {/* Sticky summary */}
          {lessons.length > 0 && (
            <div style={{ borderTop: '1px solid #f0e7de', paddingTop: 12, fontSize: 11, position: 'sticky', bottom: 0, background: '#fff' }}>
              今日汇总：<Text style={{ color: '#1D9E75' }}>出勤{summary.present}</Text> / <Text style={{ color: '#BA7517' }}>请假{summary.leave}</Text> / <Text style={{ color: '#E24B4A' }}>旷课{summary.absent}</Text>
            </div>
          )}
        </Card>
        )}

        {/* RIGHT: Attendance area */}
        <Card bordered={false} style={{ borderRadius: 10 }}
          title={selectedLesson ? `${selectedLesson.groupName || selectedLesson.courseName} · ${selectedLesson.time}` : '选择课次'}
          extra={!isMobile && selectedLesson ? (
            <Space>
              <Tag color="blue" style={{ borderRadius: 9999 }}>{students.length}人</Tag>
              <Button icon={<CheckCircleOutlined />} onClick={handleAllPresent} style={{ borderColor: '#1D9E75', color: '#1D9E75' }}>一键全勤</Button>
              {attendanceTimeHint(selectedLesson)}
              <Button type="primary" loading={submitting} onClick={submitAttendance} style={{ background: '#E8784A' }}>{submitted ? '已提交 ✓' : '提交考勤'}</Button>
            </Space>
          ) : null}>
          {!selectedLesson ? <Empty description="请从左侧选择课次" /> : (
            <>
              {isMobile && attendanceTimeHint(selectedLesson)}
              {/* Progress bar */}
              <div style={{ 
                background: 'linear-gradient(135deg, #FFFBF9 0%, #FDFCFB 100%)', 
                borderRadius: 16, 
                padding: '14px 18px', 
                marginBottom: 16, 
                border: '1px solid #F0EBE5',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#5a4e3a' }}>签到进度</span>
                  <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1D9E75' }} />
                      <span style={{ color: '#1D9E75', fontWeight: 600 }}>{summary.present}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#BA7517' }} />
                      <span style={{ color: '#BA7517', fontWeight: 600 }}>{summary.leave}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#E24B4A' }} />
                      <span style={{ color: '#E24B4A', fontWeight: 600 }}>{summary.absent}</span>
                    </div>
                  </div>
                </div>
                <div style={{ height: 10, background: 'rgba(0,0,0,.04)', borderRadius: 5, overflow: 'hidden', display: 'flex', gap: 0 }}>
                  <div style={{ flex: summary.present || 0, background: 'linear-gradient(90deg, #1D9E75, #27D4A0)', transition: 'flex .5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                  <div style={{ flex: summary.leave || 0, background: 'linear-gradient(90deg, #BA7517, #F5A623)', transition: 'flex .5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                  <div style={{ flex: summary.absent || 0, background: 'linear-gradient(90deg, #E24B4A, #FF6B6B)', transition: 'flex .5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                  <div style={{ flex: summary.unmarked || 0, background: '#F0EBE5', transition: 'flex .5s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                </div>
              </div>

              {/* Student grid */}
              <div className="teacher-attendance-student-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, 1fr)', 
                gap: 12, 
                paddingBottom: isMobile ? 140 : 0 
              }}>
                {students.map((s) => {
                  const status: AttStatus = attMap.get(s.studentId) || 'none'
                  const cfg = STATUS_CONFIG[status]
                  return (
                    <div key={s.studentId} onClick={() => cycleAttendance(s.studentId)} style={{
                      borderRadius: 9, padding: isMobile ? '10px 6px' : '10px 8px', textAlign: 'center', cursor: 'pointer', userSelect: 'none',
                      border: `1.5px solid ${cfg.border}`, background: cfg.bg, transition: 'all .2s',
                    }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, margin: '0 auto 6px',
                        background: getStudentBg(s.studentId), display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: 14, fontWeight: 500, color: '#fff' }}>
                        {(s.name || '?')[0]}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: (s.remainHours || 0) <= 5 ? '#E24B4A' : 'var(--color-text-tertiary, #98A2B3)' }}>
                        余{formatHours(s.remainHours)}课时{(s.remainHours || 0) <= 5 ? ' ⚠️' : ''}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 500, marginTop: 4, padding: '2px 6px', borderRadius: 6,
                        display: 'inline-block', background: cfg.badge, color: status === 'none' ? cfg.text : '#fff' }}>
                        {cfg.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Hint */}
              <div style={{ background: 'var(--color-background-secondary, #faf8f5)', borderRadius: 8, padding: '8px 12px', marginTop: 12 }}>
                <Text type="secondary" style={{ fontSize: isMobile ? 11 : 10 }}>
                  点击学员卡片切换状态：未标记 → 出勤（绿）→ 请假（橙）→ 旷课（红）→ 循环
                </Text>
              </div>

              {/* Fixed bottom bar on mobile - positioned above the layout tab bar */}
              {isMobile && (
                <div style={{ 
                  position: 'fixed', 
                  bottom: 'calc(74px + env(safe-area-inset-bottom, 0px))', 
                  left: 12, 
                  right: 12, 
                  zIndex: 400,
                  background: 'rgba(255, 255, 255, 0.95)', 
                  backdropFilter: 'blur(10px)',
                  borderRadius: 16,
                  border: '1px solid #F0EBE5',
                  boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
                  padding: '12px 16px', 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: 12 
                }}>
                  <Button 
                    icon={<CheckCircleOutlined />} 
                    onClick={handleAllPresent} 
                    style={{ 
                      height: 46, 
                      borderRadius: 12, 
                      borderColor: '#1D9E75', 
                      color: '#1D9E75',
                      fontWeight: 600,
                      background: '#fff'
                    }}>
                    一键全勤
                  </Button>
                  <Button 
                    type="primary" 
                    loading={submitting} 
                    onClick={submitAttendance}
                    style={{ 
                      height: 46, 
                      borderRadius: 12, 
                      background: '#E8784A', 
                      borderColor: '#E8784A',
                      fontWeight: 600,
                      boxShadow: '0 4px 12px rgba(232,120,74,0.2)'
                    }}>
                    {submitted ? '已提交 ✓' : '提交考勤'}
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      </div>
      <div style={{ height: isMobile ? 12 : 0 }} />
    </div>
  )
}
