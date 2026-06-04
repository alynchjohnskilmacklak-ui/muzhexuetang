'use client'

import useSWR from 'swr'
import { Button, Card, Empty, Input, Modal, Segmented, Skeleton, Space, Tag, Typography, message } from 'antd'
import { CalendarOutlined, CheckOutlined, CloseOutlined, ReloadOutlined, UserOutlined } from '@ant-design/icons'
import { useMemo, useState } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text, Paragraph } = Typography

type LeaveStatus = 'all' | 'pending' | 'approved' | 'rejected'

type LeaveRecord = {
  id: string
  student: { id: string; name: string }
  schedule?: { id: string; startTime?: string; title?: string; course?: { name: string } } | null
  reason: string
  leaveDate: string
  status: 'pending' | 'approved' | 'rejected' | string
  replyNote?: string | null
  repliedAt?: string | null
  createdAt: string
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const STATUS_META: Record<string, { label: string; color: string; bg: string; tag: string }> = {
  pending: { label: '待审批', color: '#BA7517', bg: '#FAEEDA', tag: 'gold' },
  approved: { label: '已批准', color: '#1D9E75', bg: '#EAF7F1', tag: 'green' },
  rejected: { label: '已驳回', color: '#E24B4A', bg: '#FDECEB', tag: 'red' },
}

function statusMeta(status: string) {
  return STATUS_META[status] || { label: status || '未知', color: '#5A4E3A', bg: '#F5F2EE', tag: 'default' }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatTime(value?: string) {
  if (!value) return ''
  return new Date(value).toLocaleString('zh-CN', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function TeacherLeavePage() {
  const isMobile = useIsMobile() ?? false
  const [status, setStatus] = useState<LeaveStatus>('pending')
  const [action, setAction] = useState<{ record: LeaveRecord; status: 'approved' | 'rejected' } | null>(null)
  const [replyNote, setReplyNote] = useState('')
  const { data, isLoading, mutate } = useSWR<{ records: LeaveRecord[]; total: number }>(
    `/api/leave-requests?status=${status === 'all' ? '' : status}&limit=80`,
    fetcher
  )

  const records = data?.records || []
  const pendingCount = useMemo(() => records.filter((record) => record.status === 'pending').length, [records])

  const submitAction = async () => {
    if (!action) return
    const hide = message.loading(action.status === 'approved' ? '正在批准请假...' : '正在驳回请假...', 0)
    try {
      const res = await fetch(`/api/leave-requests/${action.record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action.status, replyNote }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || '处理失败')
      }
      message.success(action.status === 'approved' ? '已批准请假' : '已驳回请假')
      setAction(null)
      setReplyNote('')
      mutate()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '处理失败')
    } finally {
      hide()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section style={{
        background: '#fff',
        border: '1px solid #F0DDD2',
        borderRadius: 12,
        padding: isMobile ? 14 : 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row' }}>
          <div>
            <Text style={{ color: '#B4663F', fontSize: 12, fontWeight: 700 }}>教师工作台</Text>
            <Title level={4} style={{ margin: '4px 0 4px', fontSize: isMobile ? 18 : undefined }}>请假审批</Title>
            <Text style={{ color: '#7D6D5E', fontSize: 13 }}>
              查看本班学生请假申请，随手批准或驳回，回执会同步给家长。
            </Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={() => mutate()} style={{ minHeight: 40 }}>
            刷新
          </Button>
        </div>
      </section>

      <Card bordered={false} style={{ borderRadius: 12, border: '1px solid #F0DDD2' }} styles={{ body: { padding: isMobile ? 12 : 16 } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <Segmented
            value={status}
            onChange={(value) => setStatus(value as LeaveStatus)}
            options={[
              { label: '待审批', value: 'pending' },
              { label: '已批准', value: 'approved' },
              { label: '已驳回', value: 'rejected' },
              { label: '全部', value: 'all' },
            ]}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            当前 {records.length} 条{status === 'pending' ? `，待处理 ${pendingCount} 条` : ''}
          </Text>
        </div>

        {isLoading ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {[0, 1, 2].map((item) => <Skeleton key={item} active paragraph={{ rows: 3 }} />)}
          </div>
        ) : records.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无请假申请，有新申请会出现在这里。" />
        ) : (
          <div className="scroll-area" style={{ display: 'grid', gap: 10 }}>
            {records.map((record) => {
              const meta = statusMeta(record.status)
              const canReview = record.status === 'pending'
              return (
                <div key={record.id} style={{
                  padding: isMobile ? 12 : 14,
                  borderRadius: 12,
                  background: canReview ? '#FFFBF7' : '#FFFFFF',
                  border: '1px solid #F0DDD2',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <Space wrap size={6}>
                        <UserOutlined style={{ color: '#E8784A' }} />
                        <Text strong style={{ fontSize: 15 }}>{record.student?.name || '学员'}</Text>
                        <Tag color={meta.tag} style={{ borderRadius: 9999 }}>{meta.label}</Tag>
                      </Space>
                      <div style={{ color: '#7D6D5E', fontSize: 12, marginTop: 6 }}>
                        <CalendarOutlined style={{ marginRight: 4 }} />
                        请假日期：{formatDate(record.leaveDate)}
                        {record.schedule?.startTime ? ` · 课次：${formatTime(record.schedule.startTime)}` : ''}
                      </div>
                    </div>
                    <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                      提交于 {formatTime(record.createdAt)}
                    </Text>
                  </div>

                  <Paragraph style={{ margin: '10px 0 0', color: '#4A382B', lineHeight: 1.7, fontSize: 14, whiteSpace: 'pre-wrap' }}>
                    {record.reason}
                  </Paragraph>

                  {record.schedule && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#8A7869' }}>
                      {record.schedule.course?.name || record.schedule.title || '未指定课程'}
                    </div>
                  )}

                  {record.replyNote && (
                    <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 10, background: meta.bg, color: meta.color, fontSize: 12 }}>
                      回执：{record.replyNote}
                    </div>
                  )}

                  {canReview && (
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '120px 120px', gap: 8, marginTop: 12 }}>
                      <Button
                        type="primary"
                        icon={<CheckOutlined />}
                        style={{ background: '#1D9E75', borderColor: '#1D9E75', minHeight: 44 }}
                        onClick={() => setAction({ record, status: 'approved' })}
                      >
                        批准
                      </Button>
                      <Button
                        danger
                        icon={<CloseOutlined />}
                        style={{ minHeight: 44 }}
                        onClick={() => setAction({ record, status: 'rejected' })}
                      >
                        驳回
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Modal
        open={!!action}
        title={action?.status === 'approved' ? '批准请假' : '驳回请假'}
        onCancel={() => {
          setAction(null)
          setReplyNote('')
        }}
        onOk={submitAction}
        okText={action?.status === 'approved' ? '确认批准' : '确认驳回'}
        cancelText="取消"
      >
        {action && (
          <div>
            <Text style={{ display: 'block', marginBottom: 8 }}>
              {action.record.student?.name}，{formatDate(action.record.leaveDate)}
            </Text>
            <Input.TextArea
              rows={4}
              value={replyNote}
              onChange={(event) => setReplyNote(event.target.value)}
              placeholder={action.status === 'approved' ? '可填写回执，例如：已批准，请注意补课安排。' : '请填写驳回原因，方便家长了解情况。'}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
