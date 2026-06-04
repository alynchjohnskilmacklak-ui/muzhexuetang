'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Modal, Select, Input, message, Typography } from 'antd'
import { MobileSelect } from '@/components/MobileSelect'
import { SCHEDULE_PERIODS } from '@/lib/schedule-periods'

const { Text } = Typography

const CLASS_PERIOD_TIMES = SCHEDULE_PERIODS
  .filter(p => p.type === 'CLASS')
  .map(p => ({ start: p.start, end: p.end, label: `${p.name} ${p.start}-${p.end}` }))

const SUBJECTS = ['语文', '数学', '英语', '物理', '化学', '生物', '地理', '历史', '政治']

const fetcher = (url: string) => fetch(url).then(r => r.ok ? r.json() : Promise.reject('load error'))

export function OneOnOneModal({
  open,
  onClose,
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  defaultDate?: string
  defaultStartTime?: string
  defaultEndTime?: string
  onSuccess?: () => void
}) {
  const [teacherId, setTeacherId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [subject, setSubject] = useState('')
  const [date, setDate] = useState(defaultDate || '')
  const [startTime, setStartTime] = useState(defaultStartTime || '')
  const [endTime, setEndTime] = useState(defaultEndTime || '')
  const [roomId, setRoomId] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [conflicts, setConflicts] = useState<{ type: string; message: string; detail: string }[]>([])

  const { data: teachersData } = useSWR(open ? '/api/teachers?status=ACTIVE&limit=100' : null, fetcher)
  const { data: studentsData } = useSWR(open ? '/api/students?limit=500' : null, fetcher)
  const { data: roomsData } = useSWR(open ? '/api/rooms' : null, fetcher)

  const teacherList: Record<string, unknown>[] = Array.isArray(teachersData?.teachers) ? teachersData.teachers : Array.isArray(teachersData) ? teachersData : []
  const studentList: Record<string, unknown>[] = Array.isArray(studentsData?.students) ? studentsData.students : Array.isArray(studentsData) ? studentsData : []
  const roomList: Record<string, unknown>[] = Array.isArray(roomsData) ? roomsData : []

  const resetForm = () => {
    setTeacherId('')
    setStudentId('')
    setSubject('')
    setDate(defaultDate || '')
    setStartTime(defaultStartTime || '')
    setEndTime(defaultEndTime || '')
    setRoomId('')
    setNote('')
    setConflicts([])
  }

  const handleSave = async () => {
    if (!teacherId || !studentId || !subject || !date || !startTime || !endTime) {
      message.warning('请填写所有必填字段')
      return
    }

    setSaving(true)
    setConflicts([])

    try {
      const res = await fetch('/api/schedules/one-on-one', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          studentId,
          subject,
          date,
          startTime,
          endTime,
          roomId: roomId || undefined,
          note: note || undefined,
        }),
      })

      const payload = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 409 && payload.conflicts) {
          setConflicts(payload.conflicts)
          message.error('时间冲突，无法安排')
        } else {
          message.error(payload.error || '创建失败')
        }
        return
      }

      message.success(payload.message || '一对一排课成功')
      resetForm()
      onClose()
      onSuccess?.()
    } catch {
      message.error('网络错误')
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Modal
      title="+ 突击全能班排课"
      open={open}
      onCancel={handleClose}
      onOk={handleSave}
      confirmLoading={saving}
      okText="保存排课"
      cancelText="取消"
      width={480}
      okButtonProps={{ style: { background: '#E8784A', borderColor: '#E8784A' } }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
        {/* Teacher */}
        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>老师 *</Text>
          <MobileSelect
            placeholder="选择老师"
            style={{ width: '100%' }}
            value={teacherId || undefined}
            onChange={v => { setTeacherId(v); setConflicts([]) }}
            options={teacherList.map((t: Record<string, unknown>) => ({ label: t.name as string, value: t.id as string }))}
          />
        </div>

        {/* Student */}
        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>学员 *</Text>
          <MobileSelect
            placeholder="选择学员"
            style={{ width: '100%' }}
            value={studentId || undefined}
            onChange={v => { setStudentId(v); setConflicts([]) }}
            options={studentList.map((s: Record<string, unknown>) => ({ label: `${s.name}${s.grade ? ` (${s.grade})` : ''}`, value: s.id as string }))}
          />
        </div>

        {/* Subject */}
        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>科目 *</Text>
          <Select
            placeholder="选择科目"
            style={{ width: '100%' }}
            value={subject || undefined}
            onChange={v => setSubject(v)}
            options={SUBJECTS.map(s => ({ label: s, value: s }))}
          />
        </div>

        {/* Date */}
        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>日期 *</Text>
          <Input type="date" value={date} onChange={e => { setDate(e.target.value); setConflicts([]) }} />
        </div>

        {/* Time period */}
        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>时间段 *</Text>
          <Select
            placeholder="选择节次（自动填充时间）"
            style={{ width: '100%' }}
            value={startTime && endTime ? `${startTime}-${endTime}` : undefined}
            onChange={v => {
              const [st, en] = v.split('-')
              setStartTime(st)
              setEndTime(en)
              setConflicts([])
            }}
            options={CLASS_PERIOD_TIMES.map(p => ({
              label: p.label,
              value: `${p.start}-${p.end}`,
            }))}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              placeholder="开始"
              style={{ flex: 1 }}
            />
            <Input
              type="time"
              value={endTime}
              onChange={e => setEndTime(e.target.value)}
              placeholder="结束"
              style={{ flex: 1 }}
            />
          </div>
        </div>

        {/* Room */}
        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>教室（可选）</Text>
          <Select
            allowClear
            placeholder="选择教室"
            style={{ width: '100%' }}
            value={roomId || undefined}
            onChange={v => { setRoomId(v || ''); setConflicts([]) }}
            options={roomList.map((r: Record<string, unknown>) => ({ label: r.name as string, value: r.id as string }))}
          />
        </div>

        {/* Note */}
        <div>
          <Text strong style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>备注（可选）</Text>
          <Input placeholder="备注信息" value={note} onChange={e => setNote(e.target.value)} />
        </div>

        {/* Conflict display */}
        {conflicts.length > 0 && (
          <div style={{ background: 'rgba(226,75,74,.08)', border: '1px solid rgba(226,75,74,.2)', borderRadius: 6, padding: 10 }}>
            {conflicts.map((c, i) => (
              <div key={i} style={{ fontSize: 11, color: '#E24B4A', marginBottom: 4 }}>
                <strong>{c.message}</strong>
                <div style={{ opacity: .8 }}>{c.detail}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
