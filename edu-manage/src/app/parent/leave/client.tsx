'use client'

import { useEffect, useState } from 'react'
import { Button, Card, DatePicker, Form, Input, Radio, Select, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useIsMobile } from '@/hooks/useIsMobile'
import { ResponsiveTable } from '@/components/Layout/ResponsiveTable'
import { GuidedEmpty } from '@/components/Common/GuidedEmpty'
import { PullToRefresh } from '@/components/PullToRefresh'
import { rememberParentChild } from '@/lib/parent-child-preference'
import { todayLocal } from '@/lib/date/local-day'
import { shouldSearchChoices, shouldUseInlineChoices } from '@/lib/choice-thresholds'

const { Title, Text } = Typography
const { TextArea } = Input
const chinaDateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})

function formatDateKey(value: string) {
  const [, month, day] = value.split('-').map(Number)
  return month && day ? `${month}月${day}日` : value
}

function formatChinaDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : chinaDateTimeFormatter.format(date)
}

const LEAVE_STATUS: Record<string, { label: string; color: string; reply: string }> = {
  pending: { label: '待审批', color: 'gold', reply: '已提交，等待老师审批' },
  approved: { label: '已批准', color: 'green', reply: '请假已批准' },
  rejected: { label: '已驳回', color: 'red', reply: '请假申请未通过' },
}

function leaveStatusMeta(status: string) {
  return LEAVE_STATUS[status] || { label: status || '已通知', color: 'default', reply: '已收到请假通知' }
}

export function ParentLeaveClient({
  students, upcomingSchedules, leaveRequests, initialSelectedStudentId,
}: {
  students: { id: string; name: string; membershipLevel?: string | null }[]
  initialSelectedStudentId: string
  upcomingSchedules: { id: string; title: string; dateKey: string; studentIds: string[] }[]
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
  const selectedLessonId = Form.useWatch('lessonId', form) as string | undefined
  const [submitting, setSubmitting] = useState(false)
  const [requests, setRequests] = useState(leaveRequests)
  const [selectedStudentId, setSelectedStudentId] = useState<string>(initialSelectedStudentId || students[0]?.id || '')
  const [lessonDateAutofilled, setLessonDateAutofilled] = useState(false)
  const isMobile = useIsMobile() ?? false
  const router = useRouter()

  useEffect(() => {
    if (students.length === 1) {
      form.setFieldValue('studentId', students[0].id)
      setSelectedStudentId(students[0].id)
    }
  }, [students, form])

  // SSR 刷新（router.refresh）回灌服务端最新记录，与 notifications 页同一同步口径
  useEffect(() => {
    setRequests(leaveRequests)
  }, [leaveRequests])

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
          lessonId: values.lessonId || null,
          reason: values.reason,
          leaveDate: values.leaveDate.format('YYYY-MM-DD'),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(data.reused ? '该申请已保存，请查看处理状态，无需重复提交' : data.teacherNotified === false ? '请假申请已保存并通知管理员，教师账号尚未关联，请联系机构确认' : '请假申请已保存，老师和管理员可查看')
        form.resetFields()
        form.setFieldValue('studentId', selectedStudentId)
        setLessonDateAutofilled(false)
        setRequests((prev) => [data, ...prev.filter((item) => item.id !== data.id)])
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

  const handleStudentSelection = (value: string) => {
    setSelectedStudentId(value)
    form.setFieldValue('lessonId', undefined)
    if (lessonDateAutofilled) form.setFieldValue('leaveDate', undefined)
    setLessonDateAutofilled(false)
    rememberParentChild(value, students.find((student) => student.id === value)?.membershipLevel)
    const params = new URLSearchParams(window.location.search)
    params.set('childId', value)
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
  }

  const handleLessonSelection = (lessonId?: string) => {
    const lesson = upcomingSchedules.find((schedule) => schedule.id === lessonId)
    if (lesson) {
      form.setFieldValue('leaveDate', dayjs(lesson.dateKey))
      setLessonDateAutofilled(true)
    } else {
      setLessonDateAutofilled(false)
    }
  }

  return (
    <PullToRefresh onRefresh={async () => { router.refresh(); await new Promise((resolve) => setTimeout(resolve, 500)) }}>
    <div style={{ minHeight: '100vh', backgroundColor: 'transparent', padding: isMobile ? 0 : 24 }}>
      <Title level={4} style={{ marginBottom: 4 }}>请假通知</Title>
      <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 20 }}>
        提交后将通知管理员和对应老师，老师处理后会同步回执
      </Text>

      <Card title="提交请假通知" style={{ marginBottom: 24 }}>
      <Form form={form} layout="vertical" initialValues={{ studentId: initialSelectedStudentId || students[0]?.id }}>
          <Form.Item name="studentId" label="子女" rules={students.length === 1 ? [] : [{ required: true, message: '请选择子女' }]}>
            {students.length === 1 ? (
              <>
                <Text strong style={{ fontSize: 14 }}>{students[0].name}</Text>
                <input type="hidden" value={students[0].id} readOnly />
              </>
            ) : shouldUseInlineChoices(students.length) ? (
                <Radio.Group
                  id="parent-leave-student"
                  aria-label="选择请假学员"
                  optionType="button"
                  buttonStyle="solid"
                  size="large"
                  style={{ display: 'flex', flexWrap: 'wrap' }}
                  onChange={(event) => handleStudentSelection(event.target.value)}
                  options={students.map((student) => ({ label: student.name, value: student.id }))}
                />
              ) : (
                <Select
                  id="parent-leave-student"
                  placeholder="选择子女"
                  getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
                  onChange={handleStudentSelection}
                  options={students.map((student) => ({ label: student.name, value: student.id }))}
                  showSearch={shouldSearchChoices(students.length)}
                  optionFilterProp="label"
                  placement="bottomLeft"
                  listHeight={240}
                />
            )}
          </Form.Item>

          <Form.Item label="请假课次（可选）">
            <div style={{ display: 'grid', gap: 4 }}>
              <Form.Item name="lessonId" noStyle>
                {shouldUseInlineChoices(filteredSchedules.length) ? (
                  <Radio.Group
                    id="parent-leave-lesson"
                    aria-label="选择请假课次"
                    optionType="button"
                    buttonStyle="solid"
                    size="large"
                    style={{ display: 'flex', flexWrap: 'wrap' }}
                    onChange={(event) => handleLessonSelection(event.target.value)}
                    options={filteredSchedules.map((schedule) => ({ label: schedule.title, value: schedule.id }))}
                  />
                ) : (
                  <Select
                    id="parent-leave-lesson"
                    allowClear
                    placeholder="选择要请假的课次（可不选）"
                    getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
                    onChange={handleLessonSelection}
                    options={filteredSchedules.map((schedule) => ({ label: schedule.title, value: schedule.id }))}
                    showSearch={shouldSearchChoices(filteredSchedules.length)}
                    optionFilterProp="label"
                    placement="bottomLeft"
                    listHeight={240}
                  />
                )}
              </Form.Item>
              {shouldUseInlineChoices(filteredSchedules.length) && selectedLessonId && (
                <Button
                  type="link"
                  size="small"
                  aria-label="清除请假课次"
                  onClick={() => {
                    form.setFieldValue('lessonId', undefined)
                    handleLessonSelection(undefined)
                  }}
                  style={{ justifySelf: 'start', paddingInline: 0 }}
                >
                  清除选择
                </Button>
              )}
            </div>
          </Form.Item>

          <Form.Item name="leaveDate" label="请假日期" rules={[{ required: true, message: '请选择日期' }]}>
            <DatePicker
              inputReadOnly={isMobile}
              style={{ width: '100%' }}
              getPopupContainer={(trigger) => trigger.parentElement ?? document.body}
              disabledDate={(current) => current && current.format('YYYY-MM-DD') < todayLocal()}
              onChange={(date) => {
                const selectedLessonId = form.getFieldValue('lessonId') as string | undefined
                const selectedLesson = upcomingSchedules.find((schedule) => schedule.id === selectedLessonId)
                if (selectedLesson && date?.format('YYYY-MM-DD') !== selectedLesson.dateKey) {
                  form.setFieldValue('lessonId', undefined)
                  toast.info('请假日期已变更，请按需要重新选择课次')
                }
                setLessonDateAutofilled(false)
              }}
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
            style={{
              background: 'linear-gradient(135deg, #14574D 0%, #0E483F 100%)',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: 12,
              height: 46,
              fontSize: 15,
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(20, 87, 77, 0.22)',
            }}
          >
            发送请假通知
          </Button>
        </Form>
      </Card>

      <Card title="请假记录" style={{ borderRadius: 16 }}>
        <ResponsiveTable
          dataSource={requests}
          rowKey="id"
          scroll={{ x: 760 }}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          locale={{
            emptyText: (
              <GuidedEmpty
                compact
                title="还没有请假记录"
                description="提交请假后，审批进度和老师回执会显示在这里，方便你随时确认。"
              />
            ),
          }}
          mobileEmpty={(
            <GuidedEmpty
              compact
              title="还没有请假记录"
              description="提交请假后，审批进度和老师回执会显示在这里，方便你随时确认。"
            />
          )}
          renderMobileItem={(r, index) => {
            const meta = leaveStatusMeta(r.status)
            return (
              <div
                key={r.id}
                className="responsive-record-card stagger-item"
                style={{
                  borderRadius: 14,
                  padding: '13px 14px',
                  background: 'var(--color-surface-1, #ffffff)',
                  border: '1px solid rgba(20, 87, 77, 0.08)',
                  boxShadow: '0 2px 8px rgba(20, 60, 50, 0.03)',
                  marginBottom: 10,
                  animationDelay: `${Math.min(index, 8) * 40}ms`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Text strong style={{ fontSize: 15, color: '#17352F' }}>{r.studentName}</Text>
                  <Tag color={meta.color} style={{ margin: 0, borderRadius: 999, fontWeight: 600 }}>{meta.label}</Tag>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 13, color: '#5a4e3a' }}>
                  <div>请假日期：<strong style={{ color: '#17352F' }}>{formatDateKey(r.leaveDate)}</strong></div>
                  <div>课程：{r.courseName || '未指定课程'}</div>
                  <div>原因：{r.reason}</div>
                  <div style={{ fontSize: 11.5, color: '#9a8e7a' }}>提交时间：{formatChinaDateTime(r.createdAt)}</div>
                  {r.replyNote && (
                    <div style={{ marginTop: 4, padding: '6px 10px', borderRadius: 8, background: 'rgba(20,87,77,0.06)', color: '#14574D', fontSize: 12 }}>
                      老师回执：{r.replyNote}
                    </div>
                  )}
                </div>
              </div>
            )
          }}
          columns={[
            { title: '子女', dataIndex: 'studentName', key: 'studentName', width: 80 },
            { title: '课程', dataIndex: 'courseName', key: 'courseName' },
            { title: '日期', dataIndex: 'leaveDate', key: 'leaveDate', width: 110, render: (value: string) => formatDateKey(value) },
            { title: '原因', dataIndex: 'reason', key: 'reason', ellipsis: true },
            { title: '状态', dataIndex: 'status', key: 'status', width: 90, render: (value: string) => {
              const meta = leaveStatusMeta(value)
              return <Tag color={meta.color}>{meta.label}</Tag>
            } },
            { title: '回执', key: 'replyNote', render: (_: unknown, record: typeof requests[number]) => record.replyNote || leaveStatusMeta(record.status).reply },
            { title: '提交时间', dataIndex: 'createdAt', key: 'createdAt', width: 100, render: (value: string) => formatChinaDateTime(value) },
          ]}
        />
      </Card>
    </div>
    </PullToRefresh>
  )
}
