'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { Button, Card, Empty, List, message, Space, Tag, Typography } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, EnvironmentOutlined, TeamOutlined } from '@ant-design/icons'
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

const STUDENT_COLORS = ['#E8784A','#1D9E75','#534AB7','#D4537E','#BA7517','#185FA5','#27500A','#72243E']
function getStudentBg(id: string) { return STUDENT_COLORS[(id || '').split('').reduce((a,c) => a + c.charCodeAt(0), 0) % STUDENT_COLORS.length] }

export default function TeacherAttendancePage() {
  const isMobile = useIsMobile() ?? false
  const { data: dashboard, mutate: mutateDashboard } = useSWR('/api/teacher/dashboard', fetcher)
  const lessons = (dashboard?.todayLessons || []) as any[]
  const [selectedLessonId, setSelectedLessonId] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [attMap, setAttMap] = useState<Map<string, AttStatus>>(new Map())
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [summary, setSummary] = useState({ present: 0, leave: 0, absent: 0, unmarked: 0 })

  const selectedLesson = lessons.find((l: any) => l.id === selectedLessonId) || lessons[0]

  useEffect(() => { if (!selectedLessonId && lessons[0]?.id) setSelectedLessonId(lessons[0].id) }, [lessons, selectedLessonId])

  useEffect(() => {
    if (!selectedLesson?.id) return
    setLoadingStudents(true)
    fetch(`/api/teacher/attendance?lessonId=${selectedLesson.id}`)
      .then(res => res.json())
      .then(payload => {
        const list = payload.students || []
        setStudents(list)
        const m = new Map<string, AttStatus>()
        list.forEach((s: any) => m.set(s.studentId, (s.status as AttStatus) || 'none'))
        setAttMap(m)
      })
      .catch(() => message.error('学员列表加载失败'))
      .finally(() => setLoadingStudents(false))
  }, [selectedLesson?.id])

  // Recalc summary whenever attMap changes
  useEffect(() => {
    const vals = [...attMap.values()]
    setSummary({
      present: vals.filter(v => v === 'PRESENT').length,
      leave: vals.filter(v => v === 'LEAVE').length,
      absent: vals.filter(v => v === 'ABSENT').length,
      unmarked: vals.filter(v => v === 'none').length,
    })
  }, [attMap])

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

  const submitAttendance = async () => {
    if (!selectedLesson?.id) return
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
    if (!res.ok) { message.error(payload.error || '提交失败'); return }
    setSubmitted(true)
    mutateDashboard()
    fetch(`/api/teacher/attendance?lessonId=${selectedLesson.id}`)
      .then(r => r.json())
      .then(payload => {
        const list = payload.students || []
        setStudents(list)
        const m = new Map<string, AttStatus>()
        list.forEach((s: any) => m.set(s.studentId, (s.status as AttStatus) || 'none'))
        setAttMap(m)
      })
      .catch(() => {})
    setTimeout(() => setSubmitted(false), 2000)
    if (payload.alreadyDeducted) {
      message.success(`✅ 考勤已提交，本次课次状态已更新`, 4)
    } else {
      message.success(`✅ 考勤已提交，本次课次状态已更新`, 4)
    }
  }

  const total = summary.present + summary.leave + summary.absent + summary.unmarked

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>考勤录入</Title>

      <div style={isMobile ? { display: 'flex', flexDirection: 'column', gap: 12 } : { display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        {/* LEFT: Lesson list */}
        <Card bordered={false} style={{ borderRadius: 10 }} title={`今日课次 (${lessons.length})`}>
          <List
            dataSource={lessons}
            locale={{ emptyText: '今日暂无课次' }}
            style={isMobile ? { display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 } : undefined}
            renderItem={(lesson: any) => {
              const selected = selectedLesson?.id === lesson.id
              const done = lesson.attendanceCount > 0 || lesson.status === 'COMPLETED'
              return (
                <List.Item onClick={() => setSelectedLessonId(lesson.id)} style={{
                  cursor: 'pointer', border: selected ? '1px solid #E8784A' : '1px solid #f0e7de',
                  borderRadius: 8, padding: '8px 9px', marginBottom: 8,
                  background: selected ? '#FFF8F4' : '#fff',
                  minWidth: isMobile ? 160 : undefined,
                  maxWidth: isMobile ? 180 : undefined,
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

        {/* RIGHT: Attendance area */}
        <Card bordered={false} style={{ borderRadius: 10 }}
          title={selectedLesson ? `${selectedLesson.groupName || selectedLesson.courseName} · ${selectedLesson.time}` : '选择课次'}
          extra={!isMobile && selectedLesson ? (
            <Space>
              <Tag color="blue" style={{ borderRadius: 9999 }}>{students.length}人</Tag>
              <Button icon={<CheckCircleOutlined />} onClick={handleAllPresent} style={{ borderColor: '#1D9E75', color: '#1D9E75' }}>一键全勤</Button>
              <Button type="primary" loading={submitting} onClick={submitAttendance} style={{ background: '#E8784A' }}>{submitted ? '已提交 ✓' : '提交考勤'}</Button>
            </Space>
          ) : null}>
          {!selectedLesson ? <Empty description="请从左侧选择课次" /> : (
            <>
              {isMobile && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <Button icon={<CheckCircleOutlined />} onClick={handleAllPresent} style={{ width: '100%', borderColor: '#1D9E75', color: '#1D9E75' }}>一键全勤</Button>
                  <Button type="primary" loading={submitting} onClick={submitAttendance} style={{ width: '100%', background: '#E8784A' }}>{submitted ? '已提交 ✓' : '提交考勤'}</Button>
                </div>
              )}
              {/* Progress bar */}
              <div style={{ background: 'var(--color-background-secondary, #faf8f5)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>签到进度</span>
                  <div style={{ display: 'flex', gap: 10, fontSize: 10 }}>
                    <span style={{ color: '#1D9E75', fontWeight: 500 }}>{summary.present}</span>
                    <span style={{ color: '#BA7517', fontWeight: 500 }}>{summary.leave}</span>
                    <span style={{ color: '#E24B4A', fontWeight: 500 }}>{summary.absent}</span>
                  </div>
                </div>
                <div style={{ flex: 1, height: 8, background: 'rgba(0,0,0,.06)', borderRadius: 4, overflow: 'hidden', display: 'flex', gap: 1 }}>
                  <div style={{ flex: summary.present || 0.1, background: '#1D9E75', borderRadius: 2, transition: 'flex .3s' }} />
                  <div style={{ flex: summary.leave || 0.1, background: '#BA7517', borderRadius: 2, transition: 'flex .3s' }} />
                  <div style={{ flex: summary.absent || 0.1, background: '#E24B4A', borderRadius: 2, transition: 'flex .3s' }} />
                  <div style={{ flex: summary.unmarked || 0.1, background: 'rgba(0,0,0,.08)', borderRadius: 2, transition: 'flex .3s' }} />
                </div>
              </div>

              {/* Student grid */}
              <div className="teacher-attendance-student-grid" style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, 1fr)', gap: 6 }}>
                {students.map((s: any) => {
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
            </>
          )}
        </Card>
      </div>
      <div style={{ height: isMobile ? 12 : 0 }} />
    </div>
  )
}
