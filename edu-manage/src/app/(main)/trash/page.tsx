'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { App, Button, Card, Empty, Segmented, Space, Table, Tag, Typography } from 'antd'
import { DeleteOutlined, ReloadOutlined, RestOutlined, UndoOutlined, WarningOutlined } from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Text } = Typography
const fetcher = async (url: string) => {
  const response = await fetch(url)
  const payload = await response.json()
  if (!response.ok) throw new Error(payload.error || '加载失败')
  return payload
}

const TYPE_LABELS: Record<string, string> = {
  ClassGroup: '班级', Student: '学员', ClassLesson: '排课记录', ExamPaper: '试卷', StudyMaterial: '学习资料', FileAsset: '文件', CleanupBatch: '定向清理',
}

type TrashItem = {
  id: string
  entityType: string
  entityName?: string
  deletedByName: string
  createdAt: string
  termName: string
  impact?: { summary?: string }
  daysRemaining: number
  reason?: string
}

export default function TrashPage() {
  const isMobile = useIsMobile() ?? false
  const { message, modal } = App.useApp()
  const [type, setType] = useState('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const { data, mutate, isLoading } = useSWR(`/api/admin/trash?type=${type}`, fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const records: TrashItem[] = useMemo(() => data?.data || [], [data?.data])

  const restore = (record: TrashItem) => modal.confirm({
    title: '恢复这条记录？',
    icon: <UndoOutlined style={{ color: 'var(--color-primary)' }} />,
    content: `将恢复「${record.entityName || '未命名记录'}」以及本次删除时级联处理的关联数据。`,
    okText: '确认恢复', cancelText: '取消',
    onOk: async () => {
      setBusyId(record.id)
      try {
        const response = await fetch(`/api/admin/trash/${record.id}`, { method: 'PATCH' })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || '恢复失败')
        message.success('已恢复，相关业务数据重新可见')
        await mutate()
      } catch (error) { message.error(error instanceof Error ? error.message : '恢复失败') } finally { setBusyId(null) }
    },
  })

  const purge = (record: TrashItem) => modal.confirm({
    title: '彻底删除这条记录？',
    icon: <WarningOutlined style={{ color: 'var(--color-error)' }} />,
    content: <div><p>「{record.entityName || '未命名记录'}」及其关联数据将被物理删除。</p><Text type="danger">这个操作不可撤销，也无法从回收站恢复。</Text></div>,
    okText: '彻底删除', okButtonProps: { danger: true }, cancelText: '取消',
    onOk: async () => {
      setBusyId(record.id)
      try {
        const response = await fetch(`/api/admin/trash/${record.id}`, { method: 'DELETE' })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || '彻底删除失败')
        message.success('已彻底删除')
        await mutate()
      } catch (error) { message.error(error instanceof Error ? error.message : '彻底删除失败') } finally { setBusyId(null) }
    },
  })

  const cleanupExpired = () => modal.confirm({
    title: '清理已过期记录',
    content: '将彻底删除回收站中已超过保留期限的记录，用于测试正式定时任务。',
    okText: '执行清理', okButtonProps: { danger: true }, cancelText: '取消',
    onOk: async () => {
      const response = await fetch('/api/admin/trash', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'cleanup-expired' }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || '清理失败')
      message.success(`已彻底清理 ${payload.result.purged} 条过期记录`)
      await mutate()
    },
  })

  const actionButtons = (record: TrashItem) => <Space size={4}>
    <Button icon={<UndoOutlined />} loading={busyId === record.id} onClick={() => restore(record)}>恢复</Button>
    <Button danger icon={<DeleteOutlined />} loading={busyId === record.id} onClick={() => purge(record)}>彻底删除</Button>
  </Space>

  const columns = [
    { title: '记录', key: 'record', render: (_: unknown, record: TrashItem) => <div><Text strong>{record.entityName || '未命名记录'}</Text><div style={{ marginTop: 4 }}><Tag>{TYPE_LABELS[record.entityType] || record.entityType}</Tag><Text type="secondary">{record.termName}</Text></div></div> },
    { title: '删除信息', key: 'deleted', render: (_: unknown, record: TrashItem) => <div><div>{record.deletedByName}，{new Date(record.createdAt).toLocaleString('zh-CN')}</div><Text type="secondary">{record.reason || '管理员删除'}</Text></div> },
    { title: '关联影响', key: 'impact', render: (_: unknown, record: TrashItem) => record.impact?.summary || '无关联数据' },
    { title: '自动清理', key: 'countdown', width: 120, render: (_: unknown, record: TrashItem) => <Tag color={record.daysRemaining <= 3 ? 'error' : record.daysRemaining <= 7 ? 'warning' : 'default'} className="bin-countdown">{record.daysRemaining} 天后清理</Tag> },
    { title: '操作', key: 'actions', width: 210, render: (_: unknown, record: TrashItem) => actionButtons(record) },
  ]

  return <PageLayout title="回收站" subtitle={`删除的数据会在这里保留 ${data?.retentionDays || 30} 天，期间可以恢复。过期后将自动彻底清理。`} actions={<Space><Button icon={<ReloadOutlined />} onClick={() => mutate()}>刷新</Button><Button danger icon={<RestOutlined />} onClick={cleanupExpired}>清理过期记录</Button></Space>}>
    <Card styles={{ body: { padding: isMobile ? 12 : 20 } }}>
      <Segmented block={isMobile} value={type} onChange={(value) => setType(String(value))} options={[
        { label: '全部', value: 'all' }, { label: '班级', value: 'ClassGroup' }, { label: '学员', value: 'Student' }, { label: '排课', value: 'ClassLesson' }, { label: '文件', value: 'FileAsset' },
      ]} style={{ marginBottom: 16 }} />
      {isMobile ? <Space direction="vertical" size={10} style={{ width: '100%' }}>
        {records.length ? records.map((record) => <Card key={record.id} size="small" title={<Space><Tag>{TYPE_LABELS[record.entityType] || record.entityType}</Tag><span>{record.entityName}</span></Space>}>
          <Space direction="vertical" size={8} style={{ width: '100%' }}><Text type="secondary">{record.termName}，{record.deletedByName} 于 {new Date(record.createdAt).toLocaleString('zh-CN')} 删除</Text><div className="impact-list">{record.impact?.summary || '无关联数据'}</div><Tag className="bin-countdown">{record.daysRemaining} 天后自动清理</Tag>{actionButtons(record)}</Space>
        </Card>) : <Empty description="回收站是空的" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </Space> : <Table rowKey="id" dataSource={records} columns={columns} loading={isLoading} pagination={{ pageSize: 12, showTotal: (total) => `共 ${total} 条` }} scroll={{ x: 'max-content' }} locale={{ emptyText: <Empty description="回收站是空的" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }} />}
    </Card>
  </PageLayout>
}
