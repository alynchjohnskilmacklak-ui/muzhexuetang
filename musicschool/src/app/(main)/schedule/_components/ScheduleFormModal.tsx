'use client'

import { useState, useEffect } from 'react'
import { Modal, Form, Select, Input, DatePicker, TimePicker, message, Alert, Tag, Button } from 'antd'
import dayjs from 'dayjs'
import useSWR from 'swr'
import { CLASS_TYPE_OPTIONS, USAGE_TYPE_OPTIONS, USAGE_TYPE_LABELS } from '../_types'
import { useIsMobile } from '@/hooks/useIsMobile'

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface ScheduleFormModalProps {
  open: boolean
  editData?: Record<string, unknown> | null
  onClose: () => void
  onSuccess: () => void
}

export function ScheduleFormModal({ open, editData, onClose, onSuccess }: ScheduleFormModalProps) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [conflicts, setConflicts] = useState<Array<Record<string, unknown>> | null>(null)
  const [classType, setClassType] = useState<string>('SMALL_CLASS')
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const isMobile = useIsMobile()

  const { data: teachers } = useSWR('/api/teachers?status=ACTIVE&limit=100', fetcher)
  const { data: rooms } = useSWR('/api/rooms', fetcher)
  const { data: students } = useSWR('/api/students?limit=200&status=active', fetcher, { refreshInterval: 0 })

  const teacherList = Array.isArray(teachers?.teachers) ? teachers.teachers : Array.isArray(teachers) ? teachers : []
  const roomList: Array<Record<string, unknown>> = Array.isArray(rooms) ? rooms : []
  const studentList: Array<Record<string, unknown>> = Array.isArray(students?.students) ? students.students : Array.isArray(students) ? students : []

  const filteredRooms = roomList.filter((r) => {
    const usage = r.usageType as string
    if (classType === 'ONE_ON_ONE') return usage === 'ONE_ON_ONE' || usage === 'GENERAL'
    if (classType === 'SMALL_CLASS') return usage === 'SMALL_CLASS' || usage === 'GENERAL'
    return true
  })

  useEffect(() => {
    if (!open) return
    if (editData) {
      form.setFieldsValue({
        title: editData.title,
        teacherId: editData.teacherId,
        roomId: editData.roomId || undefined,
        startDate: editData.startDate ? dayjs(editData.startDate as string) : undefined,
        startTimeVal: editData.startTimeVal ? dayjs(editData.startTimeVal as string, 'HH:mm') : undefined,
        endTimeVal: editData.endTimeVal ? dayjs(editData.endTimeVal as string, 'HH:mm') : undefined,
        classType: editData.classType || 'SMALL_CLASS',
      })
      setClassType((editData.classType as string) || 'SMALL_CLASS')
      setSelectedStudentIds((editData.studentIds as string[]) || [])
    } else {
      form.resetFields()
      form.setFieldsValue({ startDate: dayjs(), classType: 'SMALL_CLASS' })
      setClassType('SMALL_CLASS')
      setSelectedStudentIds([])
    }
    setConflicts(null)
  }, [open, editData, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      setConflicts(null)

      const body = {
        title: values.title,
        teacherId: values.teacherId,
        roomId: values.roomId || null,
        startDate: values.startDate.format('YYYY-MM-DD'),
        startTimeVal: values.startTimeVal.format('HH:mm'),
        endTimeVal: values.endTimeVal.format('HH:mm'),
        classType: values.classType,
        studentIds: selectedStudentIds,
        courseId: values.courseId || undefined,
        color: values.color || undefined,
        notes: values.notes || undefined,
      }

      const url = editData?.id
        ? `/api/schedules/${editData.id}`
        : '/api/schedules'
      const method = editData?.id ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409 && data.conflicts) {
          setConflicts(data.conflicts)
          message.error(data.error || '存在时间冲突')
        } else {
          message.error(data.error || '操作失败')
        }
        return
      }

      message.success(editData?.id ? '排课已更新' : '排课已创建')
      onSuccess()
      onClose()
    } catch {
      // form validation error
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title={editData?.id ? '编辑排课' : '新建排课'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={submitting}
      okText={editData?.id ? '保存' : '创建'}
      cancelText="取消"
      width={isMobile ? '100%' : 560}
      className={isMobile ? 'ant-modal-mobile' : undefined}
      style={isMobile ? { top: 0, margin: 0, maxWidth: '100vw' } : undefined}
      styles={isMobile ? { body: { height: 'calc(100vh - 110px)', overflow: 'auto' } } : undefined}
      destroyOnClose
    >
      {conflicts && conflicts.length > 0 && (
        <Alert type="error" showIcon style={{ marginBottom: 16 }}
          message="时间冲突"
          description={
            <div style={{ maxHeight: 120, overflow: 'auto' }}>
              {conflicts.map((c, i) => (
                <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>
                  {c.type === 'teacher' ? '教师' : '教室'}冲突：
                  <strong>{c.title as string}</strong>
                  （{c.teacherName as string}）
                  {c.roomName ? ` @${c.roomName}` : ''}
                  {' '}{new Date(c.startTime as string).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}-
                  {new Date(c.endTime as string).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              ))}
            </div>
          }
        />
      )}

      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item name="classType" label="班型" rules={[{ required: true, message: '请选择班型' }]}>
          <Select options={CLASS_TYPE_OPTIONS} onChange={v => { setClassType(v); setSelectedStudentIds([]) }} />
        </Form.Item>

        <Form.Item name="title" label="课程标题" rules={[{ required: true, message: '请输入课程标题' }]}>
          <Input placeholder="如：数学一对一、英语小班课" />
        </Form.Item>

        <Form.Item name="teacherId" label="教师" rules={[{ required: true, message: '请选择教师' }]}>
          <Select showSearch optionFilterProp="label" placeholder="选择教师"
            options={teacherList.map((t: Record<string, unknown>) => ({ label: t.name as string, value: t.id as string }))} />
        </Form.Item>

        <Form.Item name="roomId" label="教室">
          <Select allowClear placeholder={classType === 'ONE_ON_ONE' ? '优先一对一教室' : '优先小班课教室'}
            options={filteredRooms.map((r: Record<string, unknown>) => ({
              label: `${r.name} (${USAGE_TYPE_LABELS[r.usageType as string] || r.type})`,
              value: r.id as string,
            }))} />
        </Form.Item>

        <Form.Item name="startDate" label="日期" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="startTimeVal" label="开始时间" rules={[{ required: true }]} style={{ flex: 1 }}>
            <TimePicker format="HH:mm" minuteStep={5} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="endTimeVal" label="结束时间" rules={[{ required: true }]} style={{ flex: 1 }}>
            <TimePicker format="HH:mm" minuteStep={5} style={{ width: '100%' }} />
          </Form.Item>
        </div>

        <Form.Item label={classType === 'ONE_ON_ONE' ? '选择学生（仅可选1人）' : '选择学生（可多选）'}>
          <Select
            mode={classType === 'ONE_ON_ONE' ? undefined : 'multiple'}
            placeholder={classType === 'ONE_ON_ONE' ? '选择 1 名学生' : '选择多名学生'}
            value={classType === 'ONE_ON_ONE' ? selectedStudentIds[0] : selectedStudentIds}
            onChange={(value: string | string[]) => {
              if (classType === 'ONE_ON_ONE') {
                setSelectedStudentIds(value ? [value as string] : [])
              } else {
                setSelectedStudentIds((value || []) as string[])
              }
            }}
            options={studentList.map((s: Record<string, unknown>) => ({ label: s.name as string, value: s.id as string }))}
            showSearch
            optionFilterProp="label"
          />
          {selectedStudentIds.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {selectedStudentIds.map(id => {
                const s = studentList.find((s2: Record<string, unknown>) => s2.id === id) as Record<string, unknown> | undefined
                return <Tag key={id} closable onClose={() => setSelectedStudentIds(prev => prev.filter(x => x !== id))}>{s?.name as string || id}</Tag>
              })}
            </div>
          )}
        </Form.Item>
      </Form>
    </Modal>
  )
}
