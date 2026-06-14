'use client'

import { useEffect, useState } from 'react'
import { Alert, DatePicker, Form, Input, Modal, Select, Tag, TimePicker, message } from 'antd'
import dayjs from 'dayjs'
import useSWR from 'swr'
import { CLASS_TYPE_OPTIONS, TYPE_LABELS, USAGE_TYPE_LABELS } from '../_types'
import { useIsMobile } from '@/hooks/useIsMobile'
import { getPersonalClassLimit, isPersonalClassType } from '@/lib/schedule-class-type'
import { useDivision } from '@/contexts/DivisionContext'

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
  const isMobile = useIsMobile() ?? false
  const { division } = useDivision()
  const writableDivision = division === 'ALL' ? 'JUNIOR' : division

  const { data: teachers } = useSWR('/api/teachers?status=ACTIVE&limit=100', fetcher)
  const { data: rooms } = useSWR('/api/rooms', fetcher)
  const { data: coursesData } = useSWR(`/api/courses?limit=200&division=${division}`, fetcher)
  const { data: students } = useSWR(`/api/students?limit=200&status=ACTIVE&division=${division}`, fetcher, { refreshInterval: 0 })

  const teacherList = Array.isArray(teachers?.teachers) ? teachers.teachers : Array.isArray(teachers) ? teachers : []
  const roomList: Array<Record<string, unknown>> = Array.isArray(rooms) ? rooms : []
  const courseList: Array<Record<string, unknown>> = Array.isArray(coursesData) ? coursesData : []
  const studentList: Array<Record<string, unknown>> = Array.isArray(students?.students) ? students.students : Array.isArray(students) ? students : []

  const filteredRooms = roomList.filter((room) => {
    const usage = room.usageType as string
    if (isPersonalClassType(classType)) return usage === 'ONE_ON_ONE' || usage === 'GENERAL'
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
        division: editData.division || writableDivision,
      })
      setClassType((editData.classType as string) || 'SMALL_CLASS')
      setSelectedStudentIds((editData.studentIds as string[]) || [])
    } else {
      form.resetFields()
      form.setFieldsValue({ startDate: dayjs(), classType: 'SMALL_CLASS', division: writableDivision })
      setClassType('SMALL_CLASS')
      setSelectedStudentIds([])
    }
    setConflicts(null)
  }, [open, editData, form, writableDivision])

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
        division: values.division || writableDivision,
        courseId: values.courseId || undefined,
        color: values.color || undefined,
        notes: values.notes || undefined,
      }

      const url = editData?.id ? `/api/schedules/${editData.id}` : '/api/schedules'
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
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="时间冲突"
          description={
            <div style={{ maxHeight: 120, overflow: 'auto' }}>
              {conflicts.map((conflict, index) => (
                <div key={index} style={{ fontSize: 12, marginBottom: 4 }}>
                  {conflict.type === 'teacher' ? '教师' : '教室'}冲突：
                  <strong>{conflict.title as string}</strong>
                  （{conflict.teacherName as string}）
                  {conflict.roomName ? ` @${conflict.roomName}` : ''}
                  {' '}{new Date(conflict.startTime as string).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}-
                  {new Date(conflict.endTime as string).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              ))}
            </div>
          }
        />
      )}

      <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
        <Form.Item name="division" label="??" rules={[{ required: true, message: '?????' }]}>
          <Select options={[{ label: '???', value: 'JUNIOR' }, { label: '???', value: 'SENIOR' }]} />
        </Form.Item>

        <Form.Item name="classType" label="班型" rules={[{ required: true, message: '请选择班型' }]}>
          <Select
            options={CLASS_TYPE_OPTIONS}
            onChange={(value) => {
              setClassType(value)
              setSelectedStudentIds([])
              form.setFieldValue('roomId', undefined)
            }}
          />
        </Form.Item>

        <Form.Item name="courseId" label="所属课程" rules={[{ required: true, message: '请选择课程' }]}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="选择课程（决定科目与归属）"
            options={courseList.map((c: Record<string, unknown>) => ({
              label: `${c.name as string}${c.subject ? ` · ${c.subject}` : ''}`,
              value: c.id as string,
            }))}
          />
        </Form.Item>

        <Form.Item name="title" label="课程标题" rules={[{ required: true, message: '请输入课程标题' }]}>
          <Input placeholder="如：数学一对一、英语小班课" />
        </Form.Item>

        <Form.Item name="teacherId" label="教师" rules={[{ required: true, message: '请选择教师' }]}>
          <Select
            showSearch
            optionFilterProp="label"
            placeholder="选择教师"
            options={teacherList.map((teacher: Record<string, unknown>) => ({
              label: teacher.name as string,
              value: teacher.id as string,
            }))}
          />
        </Form.Item>

        <Form.Item name="roomId" label="教室">
          <Select
            allowClear
            placeholder={isPersonalClassType(classType) ? '优先个性化教室' : '优先小班课教室'}
            options={filteredRooms.map((room: Record<string, unknown>) => ({
              label: `${room.name} (${USAGE_TYPE_LABELS[room.usageType as string] || room.type})`,
              value: room.id as string,
            }))}
          />
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

        <Form.Item label={isPersonalClassType(classType) ? `选择学生（最多 ${getPersonalClassLimit(classType)} 人）` : '选择学生（可多选）'}>
          <Select
            mode="multiple"
            placeholder={isPersonalClassType(classType) ? `请选择 ${getPersonalClassLimit(classType)} 名以内学生` : '选择多名学生'}
            value={selectedStudentIds}
            onChange={(value: string[]) => {
              const limit = getPersonalClassLimit(classType)
              if (limit && value.length > limit) {
                message.warning(`${TYPE_LABELS[classType] || '课程'}最多只能选择 ${limit} 名学生`)
                return
              }
              setSelectedStudentIds(value || [])
            }}
            options={studentList.map((student: Record<string, unknown>) => ({
              label: student.name as string,
              value: student.id as string,
            }))}
            showSearch
            optionFilterProp="label"
          />
          {selectedStudentIds.length > 0 && (
            <div style={{ marginTop: 4 }}>
              {selectedStudentIds.map(id => {
                const student = studentList.find((item: Record<string, unknown>) => item.id === id) as Record<string, unknown> | undefined
                return (
                  <Tag key={id} closable onClose={() => setSelectedStudentIds(prev => prev.filter(item => item !== id))}>
                    {(student?.name as string) || id}
                  </Tag>
                )
              })}
            </div>
          )}
        </Form.Item>
      </Form>
    </Modal>
  )
}
