'use client'

import { useEffect, useState } from 'react'
import { Button, Card, DatePicker, Form, Input, message, Select, Table, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import { format } from 'date-fns'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text } = Typography
const { TextArea } = Input

export function ParentLeaveClient({
  students, upcomingSchedules, leaveRequests,
}: {
  students: { id: string; name: string }[]
  upcomingSchedules: { id: string; title: string; startTime: string; studentIds: string[] }[]
  leaveRequests: {
    id: string
    studentName: string
    courseName: string
    leaveDate: string
    reason: string
    status: string
    replyNote: string | null
    createdAt: string
  }[]
}) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const [requests, setRequests] = useState(leaveRequests)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '')
  const isMobile = useIsMobile()

  useEffect(() => {
    if (students.length === 1) {
      form.setFieldValue('studentId', students[0].id)
      setSelectedStudentId(students[0].id)
    }
  }, [students, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (!values.studentId && students.length === 1) {
        values.studentId = students[0].id
      }
      if (!values.studentId) {
        message.warning('请选择子女')
        return
      }
      setSubmitting(true)
      const res = await fetch('/api/parent/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: values.studentId || selectedStudentId,
          scheduleId: values.scheduleId || null,
          reason: values.reason,
          leaveDate: values.leaveDate.toISOString(),
        }),
      })
      if (res.ok) {
        message.success('请假通知已发送给老师和管理员')
        form.resetFields()
        const data = await res.json()
        setRequests((prev) => [data, ...prev])
      } else {
        const data = await res.json()
        message.error(data.error || '提交失败，请重试')
      }
    } catch {
      message.error('提交失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredSchedules = upcomingSchedules.filter((schedule) =>
    !selectedStudentId || schedule.studentIds.includes(selectedStudentId)
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'transparent', padding: isMobile ? 0 : 24 }}>
      <Title level={4} style={{ marginBottom: 4 }}>请假通知</Title>
      <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 20 }}>
        提交后将自动通知管理员和对应老师，无需等待审核
      </Text>

      <Card title="提交请假通知" style={{ marginBottom: 24 }}>
        <Form form={form} layout="vertical">
          <Form.Item name="studentId" label="子女" rules={students.length === 1 ? [] : [{ required: true, message: '请选择子女' }]}>
            {students.length === 1 ? (
              <>
                <Text strong style={{ fontSize: 14 }}>{students[0].name}</Text>
                <input type="hidden" value={students[0].id} readOnly />
              </>
            ) : (
              <Select
                placeholder="选择子女"
                onChange={(value) => setSelectedStudentId(value)}
                options={students.map((student) => ({ label: student.name, value: student.id }))}
              />
            )}
          </Form.Item>

          <Form.Item name="scheduleId" label="请假课次（可选）">
            <Select
              allowClear
              placeholder="选择要请假的课次（可不选）"
              options={filteredSchedules.map((schedule) => ({
                label: `${schedule.title} · ${format(new Date(schedule.startTime), 'MM-dd HH:mm')}`,
                value: schedule.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="leaveDate" label="请假日期" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker style={{ width: '100%' }} disabledDate={(current) => current && current < dayjs().startOf('day')} />
          </Form.Item>

          <Form.Item name="reason" label="请假原因" rules={[{ required: true, message: '请填写原因' }]}>
            <TextArea rows={3} maxLength={100} showCount />
          </Form.Item>

          <Button
            type="primary"
            block
            loading={submitting}
            onClick={handleSubmit}
            style={{ background: '#5e6ad2', borderColor: '#5e6ad2', borderRadius: 8, height: 40 }}
          >
            发送请假通知
          </Button>
        </Form>
      </Card>

      <Card title="请假记录">
        <Table
          dataSource={requests}
          rowKey="id"
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          locale={{ emptyText: '暂无请假记录' }}
          columns={[
            { title: '子女', dataIndex: 'studentName', key: 'studentName', width: 80 },
            { title: '课程', dataIndex: 'courseName', key: 'courseName' },
            { title: '日期', dataIndex: 'leaveDate', key: 'leaveDate', width: 110, render: (value: string) => format(new Date(value), 'yyyy-MM-dd') },
            { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true },
            { title: '状态', dataIndex: 'status', key: 'status', width: 90, render: () => <Tag color="success">已通知</Tag> },
            { title: '回执', dataIndex: 'replyNote', key: 'replyNote', render: (value: string | null) => value || '已收到请假通知' },
            { title: '提交时间', dataIndex: 'createdAt', key: 'createdAt', width: 100, render: (value: string) => format(new Date(value), 'MM-dd HH:mm') },
          ]}
        />
      </Card>
    </div>
  )
}
