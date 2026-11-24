'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Empty, Popconfirm, Segmented, Space, Spin, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'

type LeaveStatus = 'pending' | 'approved' | 'rejected'
type LeaveRecord = {
  id: string
  status: LeaveStatus
  leaveDate: string
  reason: string
  replyNote?: string | null
  student: { id: string; name: string }
  lesson?: { lessonDate: string; startTime?: string | null; group?: { course?: { name?: string | null } | null } | null } | null
}

const STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: '待审批',
  approved: '已批准',
  rejected: '未通过',
}

export default function LeaveRequestsPage() {
  const [messageApi, messageContext] = message.useMessage()
  const [status, setStatus] = useState<LeaveStatus>('pending')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [records, setRecords] = useState<LeaveRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/leave-requests?status=${status}&page=${page}&limit=20`, { cache: 'no-store' })
      const data = await response.json().catch(() => ({})) as { records?: LeaveRecord[]; total?: number; error?: string }
      if (!response.ok) throw new Error(data.error || '请假记录加载失败')
      setRecords(Array.isArray(data.records) ? data.records : [])
      setTotal(Number(data.total || 0))
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '请假记录加载失败')
    } finally {
      setLoading(false)
    }
  }, [messageApi, page, status])

  useEffect(() => { void load() }, [load])

  const decide = async (record: LeaveRecord, nextStatus: Exclude<LeaveStatus, 'pending'>) => {
    setProcessingId(record.id)
    try {
      const response = await fetch(`/api/leave-requests/${encodeURIComponent(record.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(data.error || '审批操作失败')
      messageApi.success(nextStatus === 'approved' ? '请假已批准，考勤记录已同步' : '请假申请已标记为未通过')
      await load()
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '审批操作失败')
    } finally {
      setProcessingId(null)
    }
  }

  const columns: ColumnsType<LeaveRecord> = [
    { title: '学员', dataIndex: ['student', 'name'], width: 110 },
    {
      title: '请假日期', dataIndex: 'leaveDate', width: 120,
      render: (value: string) => new Date(value).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    },
    {
      title: '课程', width: 140,
      render: (_value, record) => record.lesson?.group?.course?.name || (record.lesson ? '指定课次' : '全天/未指定课次'),
    },
    { title: '请假原因', dataIndex: 'reason', ellipsis: true },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (value: LeaveStatus) => <Tag color={value === 'approved' ? 'green' : value === 'rejected' ? 'default' : 'gold'}>{STATUS_LABELS[value]}</Tag>,
    },
    {
      title: '操作', width: 190,
      render: (_value, record) => record.status !== 'pending' ? (
        <Typography.Text type="secondary">已处理</Typography.Text>
      ) : (
        <Space size={8}>
          <Popconfirm title="批准该学员的请假申请？" description="若已有到课记录，会同步更正为请假。" okText="批准请假" cancelText="取消" onConfirm={() => decide(record, 'approved')}>
            <Button size="small" type="primary" loading={processingId === record.id}>批准</Button>
          </Popconfirm>
          <Popconfirm title="将该申请标记为未通过？" okText="标记未通过" cancelText="取消" onConfirm={() => decide(record, 'rejected')}>
            <Button size="small" danger loading={processingId === record.id}>不通过</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 20, maxWidth: 1200, margin: '0 auto' }}>
      {messageContext}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>请假审批</Typography.Title>
          <Typography.Text type="secondary">家长提交的请假申请与对应考勤记录在此处理。</Typography.Text>
        </div>
        <Button onClick={() => void load()} loading={loading}>刷新</Button>
      </div>
      <Card style={{ borderRadius: 14, borderColor: 'var(--color-hairline)', background: 'var(--color-surface-1)' }}>
        <div style={{ marginBottom: 16 }}>
          <Segmented
            value={status}
            onChange={(value) => { setStatus(value as LeaveStatus); setPage(1) }}
            options={(['pending', 'approved', 'rejected'] as const).map((value) => ({ value, label: STATUS_LABELS[value] }))}
          />
        </div>
        <Spin spinning={loading}>
          <Table<LeaveRecord>
            rowKey="id"
            columns={columns}
            dataSource={records}
            pagination={{ current: page, pageSize: 20, total, showSizeChanger: false, onChange: setPage }}
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: <Empty description="暂无请假申请" /> }}
          />
        </Spin>
      </Card>
    </div>
  )
}
