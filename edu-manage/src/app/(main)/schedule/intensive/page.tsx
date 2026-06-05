'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { addDays, subDays } from 'date-fns'
import { Spin, Empty, Modal, Select, Input, message, Typography } from 'antd'
import useSWR from 'swr'
import { MobileSelect } from '@/components/MobileSelect'
import { SCHEDULE_PERIODS } from '@/lib/schedule-periods'

const { Text } = Typography

const INTENSIVE_COLOR = '#534AB7'
const SLOT_HEIGHT = 72

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === 'object' ? value as Record<string, unknown> : {}
)

const HOURLY_SLOTS = [
  { id:'h08', start:'08:00', end:'09:00', label:'08:00–09:00' },
  { id:'h09', start:'09:00', end:'10:00', label:'09:00–10:00' },
  { id:'h10', start:'10:00', end:'11:00', label:'10:00–11:00' },
  { id:'h11', start:'11:00', end:'12:00', label:'11:00–12:00' },
  { id:'h14', start:'14:00', end:'15:00', label:'14:00–15:00' },
  { id:'h15', start:'15:00', end:'16:00', label:'15:00–16:00' },
  { id:'h16', start:'16:00', end:'17:00', label:'16:00–17:00' },
  { id:'h17', start:'17:00', end:'18:00', label:'17:00–18:00' },
]

const TYPE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  ONE_ON_ONE:   { label:'一对一',   bg:'#EEEDFE', color:'#3C3489' },
  SMALL_GROUP:  { label:'一对三',   bg:'#FBEAF0', color:'#72243E' },
}

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '地理', '历史', '政治']

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : Promise.reject('load error'))

export default function IntensiveSchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [createOpen, setCreateOpen] = useState(false)
  const [createData, setCreateData] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [conflictMsg, setConflictMsg] = useState('')

  const dateStr = format(selectedDate, 'yyyy-MM-dd')
  const { data: daily, isLoading, mutate } = useSWR(`/api/schedules/daily?date=${dateStr}&courseType=SMALL`, fetcher, { refreshInterval: 180_000 })
  // 额外获取 ClassLesson 中的一对一/小组课数据
  const { data: classLessonsData } = useSWR(
    `/api/class-lessons?startDate=${dateStr}&endDate=${dateStr}&courseType=ONE_ON_ONE`,
    fetcher, { refreshInterval: 180_000 }
  )
  const { data: smallGroupData } = useSWR(
    `/api/class-lessons?startDate=${dateStr}&endDate=${dateStr}&courseType=SMALL_GROUP`,
    fetcher, { refreshInterval: 180_000 }
  )
  const { data: roomsData } = useSWR('/api/rooms', fetcher)
  const { data: teachersData } = useSWR('/api/teachers?status=ACTIVE&limit=100', fetcher)
  const { data: studentsData } = useSWR('/api/students?limit=500', fetcher)

  const matrix = useMemo(() => (
    (daily?.matrix || {}) as Record<string, Record<string, Record<string, unknown>>>
  ), [daily?.matrix])
  const allRooms: Record<string, unknown>[] = useMemo(() => (
    Array.isArray(roomsData) ? roomsData : []
  ), [roomsData])
  const teacherList: Record<string, unknown>[] = Array.isArray(teachersData?.teachers) ? teachersData.teachers : Array.isArray(teachersData) ? teachersData : []
  const studentList: Record<string, unknown>[] = Array.isArray(studentsData?.students) ? studentsData.students : Array.isArray(studentsData) ? studentsData : []

  // Only ONE_ON_ONE rooms (desks/spots)
  const spots = useMemo(() => allRooms.filter(r => {
    const t = (r.type as string || '').toLowerCase()
    const u = (r.usageType as string || '').toLowerCase()
    return t.includes('一对一') || t.includes('one_on_one')
      || u.includes('one_on_one') || u.includes('一对一')
  }), [allRooms])

  // 合并 ClassLesson 数据到 classLessonGrid
  const classLessons: Record<string, unknown>[] = useMemo(() => [
    ...(Array.isArray(classLessonsData) ? classLessonsData : []),
    ...(Array.isArray(smallGroupData) ? smallGroupData : []),
  ], [classLessonsData, smallGroupData])

  const classLessonGrid = useMemo(() => {
    const g: Record<string, Record<string, Record<string, unknown>>> = {}
    classLessons.forEach((l: Record<string, unknown>) => {
      const group = asRecord(l.group)
      const room = asRecord(group.room)
      const teacher = asRecord(l.teacher)
      const course = asRecord(group.course)
      const enrollments = Array.isArray(group.enrollments) ? group.enrollments : []
      const roomId = String(room.id || '')
      if (!roomId) return
      const start = l.startTime as string || ''
      const sh = parseInt(start.split(':')[0])
      const slot = HOURLY_SLOTS.find(s => parseInt(s.start.split(':')[0]) === sh)
      if (!slot) return
      if (!g[roomId]) g[roomId] = {}
      g[roomId][slot.id] = {
        lessonId: l.id,
        teacherName: teacher.name || '',
        teacherId: teacher.id || l.teacherId,
        courseName: course.name || '',
        subject: (l.subject as string) || course.subject || '',
        courseType: course.type || 'ONE_ON_ONE',
        headcount: enrollments.length,
        startTime: start,
      }
    })
    return g
  }, [classLessons])

  // Build spot × hour grid
  const grid = useMemo(() => {
    const g: Record<string, Record<string, Record<string, unknown>>> = {}
    spots.forEach(s => { g[s.id as string] = {} })
    Object.entries(matrix).forEach(([roomId, periods]) => {
      if (!spots.find(s => s.id === roomId)) return
      Object.entries(periods).forEach(([periodId, lesson]) => {
        // Map periodId to hour slot
        const period = SCHEDULE_PERIODS.find(p => p.id === periodId)
        if (!period) return
        const hourSlot = HOURLY_SLOTS.find(h => h.start <= period.start && period.end <= h.end)
        if (hourSlot) {
          if (!g[roomId]) g[roomId] = {}
          if (!g[roomId][hourSlot.id]) g[roomId][hourSlot.id] = lesson
        }
      })
    })
    return g
  }, [matrix, spots])

  // Count intensive lessons
  const intensiveCount = useMemo(() => {
    let count = 0
    Object.values(grid).forEach(hours => { count += Object.keys(hours).length })
    return count
  }, [grid])

  const openCreate = (spotId: string, slotId: string) => {
    const spot = spots.find(s => s.id === spotId)
    const slot = HOURLY_SLOTS.find(s => s.id === slotId)
    setCreateData({
      roomId: spotId,
      roomName: (spot?.name as string) || '',
      startTime: slot?.start || '',
      endTime: slot?.end || '',
      date: dateStr,
      teacherId: '',
      studentId: '',
      subject: '',
    })
    setConflictMsg('')
    setCreateOpen(true)
  }

  const handleCreate = async () => {
    if (!createData.teacherId || !createData.studentId || !createData.subject) {
      message.warning('请填写老师、学员和科目')
      return
    }
    setSaving(true)
    setConflictMsg('')
    try {
      const res = await fetch('/api/schedules/one-on-one', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: createData.teacherId,
          studentId: createData.studentId,
          subject: createData.subject,
          date: createData.date,
          startTime: createData.startTime,
          endTime: createData.endTime,
          roomId: createData.roomId,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (payload.conflicts?.length) {
          setConflictMsg(payload.conflicts.map((c: Record<string, unknown>) => c.detail || c.message).join('；'))
        } else {
          setConflictMsg(payload.error || '创建失败')
        }
        return
      }
      message.success('突击全能班排课成功')
      setCreateOpen(false)
      mutate()
    } catch {
      message.error('网络错误')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ fontSize: 16, color: '#1F2329' }}>突击全能班</Text>
        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>一对一/一对二/一对三 · 整点排课</Text>
      </div>

      {/* Date navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>←</button>
        <div style={{ padding: '0 16px', height: 34, display: 'flex', alignItems: 'center', gap: 8,
          background: '#fff', border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8, fontSize: 14, fontWeight: 500 }}>
          <span style={{ color: INTENSIVE_COLOR }}>📅</span>
          {format(selectedDate, 'M月d日 EEEE', { locale: zhCN })}
        </div>
        <button onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>→</button>
        <button onClick={() => setSelectedDate(new Date())}
          style={{ border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 6, background: '#fff', padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>今天</button>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: INTENSIVE_COLOR, fontWeight: 500 }}>
          今日已排 {intensiveCount} 课时
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : spots.length === 0 ? (
        <Empty description="暂无突击全能班桌位，请在系统设置→教室管理中添加类型为'一对一'的教室/桌位" />
      ) : (
        <div style={{ overflowX: 'auto', border: '0.5px solid var(--color-border, #EEE7E1)', borderRadius: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: `80px repeat(${spots.length}, 1fr)`, minWidth: 80 + spots.length * 160 }}>
            {/* Header */}
            <div />
            {spots.map(spot => (
              <div key={spot.id as string} style={{
                padding: '10px 8px', textAlign: 'center',
                borderRight: '0.5px solid var(--color-border, #EEE7E1)',
                borderBottom: `2px solid ${INTENSIVE_COLOR}`,
                background: 'rgba(83,74,183,.03)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{spot.name as string}</div>
                <div style={{ fontSize: 9, color: INTENSIVE_COLOR, marginTop: 2 }}>突击全能班</div>
              </div>
            ))}

            {/* Hour slots */}
            {HOURLY_SLOTS.map(slot => (
              <div key={slot.id} style={{ display: 'contents' }}>
                <div style={{
                  height: SLOT_HEIGHT, borderRight: '0.5px solid var(--color-border, #EEE7E1)',
                  borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
                  padding: '4px 8px', textAlign: 'right',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end',
                  background: '#fafafa',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: INTENSIVE_COLOR }}>{slot.start}</div>
                  <div style={{ fontSize: 9, color: 'var(--color-text-tertiary, #98A2B3)' }}>至 {slot.end}</div>
                </div>

                {spots.map(spot => {
                  const lesson = grid[spot.id as string]?.[slot.id]
                    || classLessonGrid[spot.id as string]?.[slot.id]
                  const courseType = (lesson?.courseType as string) || 'ONE_ON_ONE'
                  const cfg = TYPE_CONFIG[courseType] || TYPE_CONFIG.ONE_ON_ONE
                  return (
                    <div key={spot.id as string} style={{
                      height: SLOT_HEIGHT, borderRight: '0.5px solid var(--color-border, #EEE7E1)',
                      borderBottom: '0.5px solid var(--color-border, #EEE7E1)',
                      padding: 3, cursor: 'pointer',
                    }} onClick={() => { if (!lesson) openCreate(spot.id as string, slot.id) }}>
                      {lesson ? (
                        <div style={{ height: '100%', borderRadius: 6, padding: '5px 7px',
                          background: `${cfg.color}12`, borderLeft: `4px solid ${cfg.color}`,
                          display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <span style={{ fontSize: 8, fontWeight: 600, color: cfg.color, marginBottom: 3,
                            background: `${cfg.color}18`, padding: '0 4px', borderRadius: 2, alignSelf: 'flex-start' }}>
                            {cfg.label}
                          </span>
                          <div style={{ fontSize: 11, fontWeight: 600, color: cfg.color, lineHeight: 1.3 }}>{lesson.teacherName as string}</div>
                          <div style={{ fontSize: 10, color: cfg.color, opacity: .85, lineHeight: 1.3 }}>{lesson.courseName as string} · {lesson.subject as string}</div>
                          <div style={{ fontSize: 9, color: cfg.color, opacity: .6, lineHeight: 1.3 }}>{lesson.grade as string || ''} · 1课时</div>
                        </div>
                      ) : (
                        <div style={{ height: '100%', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'transparent', transition: 'all .15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(83,74,183,.06)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                          <span style={{ fontSize: 10, color: 'rgba(0,0,0,.12)' }}>+ 安排</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, padding: '8px 14px', borderTop: '0.5px solid var(--color-border, #EEE7E1)', background: '#faf8f5' }}>
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                <div style={{ width: 16, height: 4, borderRadius: 2, background: cfg.color }} />
                <span>{cfg.label}</span>
              </div>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--color-text-tertiary, #98A2B3)' }}>每小时为1课时单位 · 点击空格安排课程</span>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal title="安排突击全能班课程" open={createOpen}
        onCancel={() => setCreateOpen(false)} onOk={handleCreate}
        confirmLoading={saving} okText="确认排课" cancelText="取消" width={440}
        okButtonProps={{ style: { background: INTENSIVE_COLOR, borderColor: INTENSIVE_COLOR } }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 8 }}>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>桌位</Text>
            <Input value={createData.roomName || ''} readOnly style={{ background: '#f5f5f5' }} />
          </div>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>时间</Text>
            <Input value={`${createData.date || ''} ${createData.startTime || ''}-${createData.endTime || ''}`} readOnly style={{ background: '#f5f5f5' }} />
          </div>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>老师 *</Text>
            <MobileSelect placeholder="选择老师" style={{ width: '100%' }}
              value={createData.teacherId || undefined} onChange={v => setCreateData(p => ({ ...p, teacherId: v }))}
              options={teacherList.map((t: Record<string, unknown>) => ({ label: t.name as string, value: t.id as string }))} />
          </div>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>学员 *</Text>
            <MobileSelect placeholder="选择学员" style={{ width: '100%' }}
              value={createData.studentId || undefined} onChange={v => setCreateData(p => ({ ...p, studentId: v }))}
              options={studentList.map((s: Record<string, unknown>) => ({ label: `${s.name}${s.grade ? ` (${s.grade})` : ''}`, value: s.id as string }))} />
          </div>
          <div>
            <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>科目 *</Text>
            <Select placeholder="选择科目" style={{ width: '100%' }}
              value={createData.subject || undefined} onChange={v => setCreateData(p => ({ ...p, subject: v }))}
              options={SUBJECTS.map(s => ({ label: s, value: s }))} />
          </div>
          {conflictMsg && (
            <div style={{ background: 'rgba(226,75,74,.08)', border: '1px solid rgba(226,75,74,.2)', borderRadius: 6, padding: 10, fontSize: 11, color: '#E24B4A' }}>
              {conflictMsg}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
