'use client'

import { useEffect, useState } from 'react'
import { Button, Card, DatePicker, Form, Input, Select, Tag, Typography } from 'antd'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { format } from 'date-fns'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ResponsiveTable } from '@/components/Layout/ResponsiveTable'

const { Title, Text } = Typography
const { TextArea } = Input

const LEAVE_STATUS: Record<string, { label: string; color: string; reply: string }> = {
  pending: { label: '待审批', color: 'gold', reply: '已提交，等待老师审批' },
  approved: { label: '已批准', color: 'green', reply: '请假已批准' },
  rejected: { label: '已驳回', color: 'red', reply: '请假申请未通过' },
}

function leaveStatusMeta(status: string) {
  return LEAVE_STATUS[status] || { label: status || '已通知', color: 'default', reply: '已收到请假通知' }
}

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
  const isMobile = useIsMobile() ?? false

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
        toast.warning('请选择子女')
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
        toast.success('请假通知已发送给老师和管理员')
        form.resetFields()
        const data = await res.json()
        setRequests((prev) => [data, ...prev])
      } else {
        const data = await res.json()
        toast.error(data.error || '提交失败，请重试')
      }
    } catch {
      toast.error('提交失败，请重试')
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
        提交后将通知管理员和对应老师，老师处理后会同步回执
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
                getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
                onChange={(value) => setSelectedStudentId(value)}
                options={students.map((student) => ({ label: student.name, value: student.id }))}
              />
            )}
          </Form.Item>

          <Form.Item name="scheduleId" label="请假课次（可选）">
            <Select
              allowClear
              placeholder="选择要请假的课次（可不选）"
              getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
              options={filteredSchedules.map((schedule) => ({
                label: `${schedule.title} · ${format(new Date(schedule.startTime), 'MM-dd HH:mm')}`,
                value: schedule.id,
              }))}
            />
          </Form.Item>

          <Form.Item name="leaveDate" label="请假日期" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker
              style={{ width: '100%' }}
              getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </Form.Item>

          <Form.Item name="reason" label="请假原因" rules={[{ required: true, message: '请填写原因' }]}>
            <TextArea rows={3} maxLength={100} showCount />
          </Form.Item>

          <Button
            type="primary"
            block
            loading={submitting}
            onClick={handleSubmit}
            style={{ background: '#E8784A', borderColor: '#E8784A', borderRadius: 8, height: 44 }}
          >
            发送请假通知
          </Button>
        </Form>
      </Card>

      <Card title="请假记录">
        <ResponsiveTable
          dataSource={requests}
          rowKey="id"
          scroll={{ x: 760 }}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          locale={{ emptyText: '暂无请假记录' }}
          mobileEmptyText="暂无请假记录"
          renderMobileItem={(r) => {
            const meta = leaveStatusMeta(r.status)
            return (
              <div key={r.id} className="responsive-record-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 15 }}>{r.studentName}</Text>
                  <Tag color={meta.color} style={{ margin: 0 }}>{meta.label}</Tag>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#5a4e3a' }}>
                  <div>请假日期：{format(new Date(r.leaveDate), 'yyyy-MM-dd')}</div>
                  <div>课程：{r.courseName || '未指定课程'}</div>
                  <div>原因：{r.reason}</div>
                  <div>提交时间：{format(new Date(r.createdAt), 'MM-dd HH:mm')}</div>
                  <div>回执：{r.replyNote || meta.reply}</div>
                </div>
              </div>
            )
          }}
          columns={[
            { title: '子女', dataIndex: 'studentName', key: 'studentName', width: 80 },
            { title: '课程', dataIndex: 'courseName', key: 'courseName' },
            { title: '日期', dataIndex: 'leaveDate', key: 'leaveDate', width: 110, render: (value: string) => format(new Date(value), 'yyyy-MM-dd') },
            { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true },
            { title: '状态', dataIndex: 'status', key: 'status', width: 90, render: (value: string) => {
              const meta = leaveStatusMeta(value)
              return <Tag color={meta.color}>{meta.label}</Tag>
            } },
            { title: '回执', key: 'replyNote', render: (_: unknown, record: typeof requests[number]) => record.replyNote || leaveStatusMeta(record.status).reply },
            { title: '提交时间', dataIndex: 'createdAt', key: 'createdAt', width: 100, render: (value: string) => format(new Date(value), 'MM-dd HH:mm') },
          ]}
        />
      </Card>
    </div>
  )
}
