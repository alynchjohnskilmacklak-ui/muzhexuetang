'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Empty,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { toast } from 'sonner'
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ExportOutlined,
  EyeOutlined,
  ReloadOutlined,
  RestOutlined,
  SafetyOutlined,
  SearchOutlined,
  SettingOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { DATA_ADMIN_ENTITIES, type EntityKey } from '@/lib/data-admin/entities'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Text } = Typography

const ENTITY_TABS: { key: EntityKey | 'health'; label: string; icon: string }[] = [
  { key: 'students', label: '学员', icon: 'user' },
  { key: 'teachers', label: '教师', icon: 'team' },
  { key: 'class-groups', label: '班级', icon: 'book' },
  { key: 'class-lessons', label: '课次', icon: 'calendar' },
  { key: 'enrollments', label: '课时', icon: 'clock' },
  { key: 'attendances', label: '考勤', icon: 'check' },
  { key: 'exam-papers', label: '试卷', icon: 'file' },
  { key: 'classroom-feedbacks', label: '课堂反馈', icon: 'message' },
  { key: 'notifications', label: '通知', icon: 'bell' },
  { key: 'materials', label: '学习资料', icon: 'read' },
  { key: 'meals', label: '就餐', icon: 'coffee' },
  { key: 'health', label: '数据健康', icon: 'safety' },
]

const STATUS_FILTER_MAP: Record<EntityKey, { label: string; value: string }[]> = {
  students: [
    { label: '全部状态', value: '' },
    { label: '试听', value: 'TRIAL' },
    { label: '在读', value: 'ACTIVE' },
    { label: '休学', value: 'INACTIVE' },
    { label: '结业', value: 'GRADUATED' },
  ],
  teachers: [
    { label: '全部状态', value: '' },
    { label: '在职', value: 'ACTIVE' },
    { label: '离职', value: 'RESIGNED' },
  ],
  'class-groups': [
    { label: '全部状态', value: '' },
    { label: '待开班', value: 'WAITING' },
    { label: '进行中', value: 'ACTIVE' },
    { label: '已完成', value: 'COMPLETED' },
    { label: '已归档', value: 'ARCHIVED' },
  ],
  'class-lessons': [
    { label: '全部状态', value: '' },
    { label: '已安排', value: 'SCHEDULED' },
    { label: '进行中', value: 'IN_PROGRESS' },
    { label: '已完成', value: 'COMPLETED' },
    { label: '已取消', value: 'CANCELLED' },
  ],
  enrollments: [
    { label: '全部状态', value: '' },
    { label: '有效', value: 'ACTIVE' },
    { label: '已完成', value: 'COMPLETED' },
    { label: '已退费', value: 'WITHDRAWN' },
  ],
  attendances: [
    { label: '全部状态', value: '' },
    { label: '出席', value: 'PRESENT' },
    { label: '请假', value: 'LEAVE' },
    { label: '缺席', value: 'ABSENT' },
    { label: '补课', value: 'MAKEUP' },
  ],
  'exam-papers': [
    { label: '全部状态', value: '' },
    { label: '草稿', value: 'DRAFT' },
    { label: '已发布', value: 'PUBLISHED' },
    { label: '已删除', value: 'DELETED' },
  ],
  'classroom-feedbacks': [
    { label: '全部状态', value: '' },
    { label: '草稿', value: 'DRAFT' },
    { label: '已发布', value: 'PUBLISHED' },
    { label: '已删除', value: 'DELETED' },
  ],
  'performance-posts': [
    { label: '全部', value: '' },
    { label: '日常', value: 'DAILY' },
    { label: '亮点', value: 'HIGHLIGHT' },
    { label: '周报', value: 'WEEKLY_SUMMARY' },
  ],
  notifications: [
    { label: '全部状态', value: '' },
    { label: '有效', value: 'ACTIVE' },
    { label: '已删除', value: 'DELETED' },
  ],
  materials: [
    { label: '全部状态', value: '' },
    { label: '草稿', value: 'DRAFT' },
    { label: '已发布', value: 'PUBLISHED' },
    { label: '已删除', value: 'DELETED' },
  ],
  meals: [{ label: '全部', value: '' }],
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'green', TRIAL: 'blue', INACTIVE: 'orange', GRADUATED: 'purple',
    RESIGNED: 'red', WAITING: 'gold', COMPLETED: 'green', ARCHIVED: 'default',
    SCHEDULED: 'blue', IN_PROGRESS: 'processing', CANCELLED: 'default',
    POSTPONED: 'warning', WITHDRAWN: 'red', PRESENT: 'green', LEAVE: 'orange',
    ABSENT: 'red', MAKEUP: 'blue', DRAFT: 'default', PUBLISHED: 'green',
    DELETED: 'red', DAILY: 'blue', HIGHLIGHT: 'orange', WEEKLY_SUMMARY: 'purple',
    ACHIEVEMENT: 'green', PARENT_ONLY: 'default', CLASS_PUBLIC: 'blue',
  }
  return map[status] || 'default'
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (value instanceof Date || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value))) {
    return new Date(value as string).toLocaleString('zh-CN')
  }
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 80)
  return String(value)
}

function DetailDrawer({
  open,
  onClose,
  entityKey,
  record,
}: {
  open: boolean
  onClose: () => void
  entityKey: EntityKey
  record: Record<string, unknown> | null
}) {
  if (!record) return null
  const def = DATA_ADMIN_ENTITIES[entityKey]
  const keys = Object.keys(record).filter((k) => !def.sensitiveFields.includes(k) && !def.hiddenFields.includes(k))

  return (
    <Drawer title="查看详情" open={open} onClose={onClose} width={560}>
      <Descriptions column={1} size="small" bordered>
        {keys.map((k) => (
          <Descriptions.Item key={k} label={k}>
            {k === 'status' && typeof record[k] === 'string' ? (
              <Tag color={getStatusColor(record[k] as string)}>{String(record[k])}</Tag>
            ) : (
              <Text style={{ wordBreak: 'break-all' }}>{formatValue(record[k])}</Text>
            )}
          </Descriptions.Item>
        ))}
      </Descriptions>
    </Drawer>
  )
}

function HourAdjustmentModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [studentId, setStudentId] = useState('')
  const [enrollmentId] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: studentsData } = useSWR('/api/admin/data-admin/students?limit=200', (url: string) =>
    fetch(url).then((r) => r.json()),
  )

  const students = studentsData?.data || []

  const handleSubmit = async () => {
    if (!studentId || amount === 0) {
      toast.warning('请选择学员并输入课时数')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/data-admin/enrollments/any-id`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hour-adjustment', studentId, enrollmentId: enrollmentId || null, amount, reason }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message)
        onClose()
      } else {
        toast.error(data.error || '调整失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="课时调整" open={open} onOk={handleSubmit} onCancel={onClose} confirmLoading={loading} okText="确认调整" cancelText="取消">
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Alert type="warning" showIcon message="不要直接在数据库改课时数据，必须通过此入口调整以保证账目一致。" />
        <div>
          <Text type="secondary">选择学员</Text>
          <Select
            showSearch
            placeholder="搜索学员姓名"
            value={studentId || undefined}
            onChange={setStudentId}
            style={{ width: '100%', marginTop: 4 }}
            filterOption={(input, option) => (option?.label as string || '').includes(input)}
            options={students.map((s: { name?: string; grade?: string; id?: string }) => ({ label: `${s.name ?? '-'} (${s.grade ?? '-'})`, value: s.id ?? '' }))}
          />
        </div>
        <div>
          <Text type="secondary">调整类型</Text>
          <Select
            value={amount > 0 ? 'add' : amount < 0 ? 'deduct' : undefined}
            onChange={(val) => {
              if (val === 'add') setAmount(Math.abs(amount) || 2)
              else if (val === 'deduct') setAmount(-Math.abs(amount) || -2)
            }}
            style={{ width: '100%', marginTop: 4 }}
            options={[
              { label: '增加课时', value: 'add' },
              { label: '减少课时', value: 'deduct' },
              { label: '修正课时', value: 'adjust' },
            ]}
          />
        </div>
        <div>
          <Text type="secondary">课时数</Text>
          <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} style={{ marginTop: 4 }} />
        </div>
        <div>
          <Text type="secondary">调整原因</Text>
          <Input.TextArea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="请填写调整原因" rows={3} style={{ marginTop: 4 }} />
        </div>
      </Space>
    </Modal>
  )
}

export function DataAdminClient() {
  const isMobile = useIsMobile() ?? false
  const [activeTab, setActiveTab] = useState<EntityKey | 'health'>('students')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [includeDeleted, setIncludeDeleted] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Record<string, unknown> | null>(null)
  const [editData, setEditData] = useState<Record<string, unknown>>({})
  const [editLoading, setEditLoading] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingRecord, setDeletingRecord] = useState<Record<string, unknown> | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRecord, setDetailRecord] = useState<Record<string, unknown> | null>(null)
  const [hourAdjustOpen, setHourAdjustOpen] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [batchLoading, setBatchLoading] = useState(false)

  const isHealthTab = activeTab === 'health'
  const entityKey = activeTab as EntityKey
  const def = isHealthTab ? null : DATA_ADMIN_ENTITIES[entityKey]

  const buildUrl = useCallback(() => {
    if (isHealthTab) return null
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    params.set('page', String(page))
    params.set('limit', String(limit))
    if (includeDeleted) params.set('includeDeleted', 'true')
    return `/api/admin/data-admin/${entityKey}?${params.toString()}`
  }, [entityKey, search, statusFilter, page, limit, includeDeleted, isHealthTab])

  const { data, mutate, isLoading } = useSWR(buildUrl, async (url: string) => {
    const res = await fetch(url)
    if (res.status === 403) {
      toast.error('无权限访问')
      return null
    }
    return res.json()
  })

  const { data: healthData, mutate: healthMutate } = useSWR(
    isHealthTab ? '/api/admin/data-health' : null,
    (url: string) => fetch(url).then((r) => r.json()),
  )

  useEffect(() => {
    setPage(1)
    setSelectedRowKeys([])
  }, [entityKey, search, statusFilter, includeDeleted])

  const records = data?.data || []
  const total = data?.meta?.total || 0
  const batchSupportedEntities: EntityKey[] = [
    'students',
    'teachers',
    'class-groups',
    'class-lessons',
    'exam-papers',
    'notifications',
    'materials',
    'performance-posts',
  ]
  const supportsBatch = batchSupportedEntities.includes(entityKey)

  const handleEdit = (record: Record<string, unknown>) => {
    if (!def) return
    const initial: Record<string, unknown> = {}
    for (const f of def.editableFields) {
      initial[f] = record[f]
    }
    setEditingRecord(record)
    setEditData(initial)
    setEditModalOpen(true)
  }

  const handleEditSave = async () => {
    if (!def || !editingRecord) return
    setEditLoading(true)
    try {
      const res = await fetch(`/api/admin/data-admin/${entityKey}/${editingRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })
      const result = await res.json()
      if (result.success) {
        toast.success('更新成功')
        setEditModalOpen(false)
        mutate()
      } else {
        toast.error(result.error || '更新失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteClick = (record: Record<string, unknown>) => {
    setDeletingRecord(record)
    setDeleteReason('')
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/admin/data-admin/${entityKey}/${deletingRecord.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteReason || '管理员手动删除' }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success('已删除')
        setDeleteModalOpen(false)
        mutate()
      } else {
        toast.error(result.error || '删除失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleRestore = async (id: string) => {
    setRestoringId(id)
    try {
      const res = await fetch(`/api/admin/data-admin/${entityKey}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success('已恢复')
        mutate()
      } else {
        toast.error(result.error || '恢复失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setRestoringId(null)
    }
  }

  const handleBatchAction = async (action: 'softDelete' | 'restore' | 'markRead') => {
    if (!selectedRowKeys.length) return
    if (!supportsBatch && action !== 'markRead') {
      toast.warning('该类型暂不支持批量操作')
      return
    }
    if (action === 'markRead' && entityKey !== 'notifications') {
      toast.warning('仅通知支持批量标记已读')
      return
    }

    setBatchLoading(true)
    try {
      const res = await fetch(`/api/admin/data-admin/${entityKey}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          ids: selectedRowKeys.map(String),
          reason: action === 'markRead' ? '批量标记通知已读' : '数据管理中心批量操作',
        }),
      })
      const result = await res.json()
      if (result.success) {
        toast.success(result.message || '批量操作成功')
        setSelectedRowKeys([])
        mutate()
      } else {
        toast.error(result.error || '批量操作失败')
      }
    } catch {
      toast.error('网络错误')
    } finally {
      setBatchLoading(false)
    }
  }

  const handleViewDetail = async (record: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/admin/data-admin/${entityKey}/${record.id}`)
      const result = await res.json()
      if (result.success) {
        setDetailRecord(result.data)
        setDetailOpen(true)
      }
    } catch {
      toast.error('加载失败')
    }
  }

  const getRecordName = (record: Record<string, unknown>): string => {
    return (record.name as string) || (record.title as string) || (record.id as string)?.slice(0, 8) || '-'
  }

  const isDeletedRecord = (record: Record<string, unknown>): boolean => {
    const status = record.status as string
    if (entityKey === 'performance-posts') return !!record.deletedAt
    const deletedValues = ['INACTIVE', 'RESIGNED', 'ARCHIVED', 'CANCELLED', 'DELETED']
    return deletedValues.includes(status)
  }

  const columnKeys = useMemo(() => {
    if (!records.length || !def) return []
    const first = records[0]
    return Object.keys(first).filter(
      (k) =>
        !def.hiddenFields.includes(k) &&
        !def.sensitiveFields.includes(k) &&
        !['password', 'sessionToken'].some((s) => k.toLowerCase().includes(s.toLowerCase())),
    ).slice(0, 8)
  }, [records, def])

  const tableColumns = useMemo(() => {
    const displayColumnKeys = isMobile ? columnKeys.slice(0, 3) : columnKeys
    const cols: Record<string, unknown>[] = displayColumnKeys.map((k) => ({
      title: k,
      dataIndex: k,
      key: k,
      ellipsis: true,
      width: k === 'status' ? 100 : k === 'id' ? 120 : 150,
      render: (val: unknown) => {
        if (k === 'status' && typeof val === 'string') {
          return <Tag color={getStatusColor(val)}>{val}</Tag>
        }
        return <span style={{ fontSize: 13 }}>{formatValue(val)}</span>
      },
    }))

    cols.push({
      title: '操作',
      key: 'actions',
      width: 200,
      fixed: 'right' as const,
      render: (_: unknown, record: Record<string, unknown>) => {
        const deleted = isDeletedRecord(record)
        return (
          <Space size="small">
            <Tooltip title="查看详情">
              <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetail(record)} />
            </Tooltip>
            {!deleted && def !== null && def.editableFields.length > 0 && (
              <Tooltip title="编辑">
                <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
              </Tooltip>
            )}
            {!deleted ? (
              <Tooltip title="软删除">
                <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteClick(record)} />
              </Tooltip>
            ) : (
              <Tooltip title="恢复">
                <Button
                  size="small"
                  icon={<UndoOutlined />}
                  loading={restoringId === record.id}
                  onClick={() => handleRestore(record.id as string)}
                />
              </Tooltip>
            )}
            {entityKey === 'enrollments' && !deleted && (
              <Tooltip title="课时调整">
                <Button size="small" icon={<SettingOutlined />} onClick={() => setHourAdjustOpen(true)} />
              </Tooltip>
            )}
          </Space>
        )
      },
    })

    return cols
  }, [columnKeys, entityKey, def, restoringId, isDeletedRecord, handleViewDetail, handleEdit, handleRestore, isMobile])

  const handleExport = async () => {
    try {
      toast.info('正在导出数据，请稍候...')
      const res = await fetch(`/api/admin/data-admin/${entityKey}?limit=10000`)
      const result = await res.json()
      if (result.success && result.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${entityKey}-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('导出成功')
      }
    } catch {
      toast.error('导出失败')
    }
  }

  const handleExportHealth = () => {
    if (!healthData?.data) return
    const blob = new Blob([JSON.stringify(healthData.data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `data-health-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <PageLayout
      title="数据管理中心"
      subtitle="用于查看、筛选、维护系统核心业务数据。请谨慎修改，重要操作会记录日志。"
      actions={
        isHealthTab ? (
          <Space style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center' }}>
            <Button icon={<ReloadOutlined />} onClick={() => healthMutate()}>刷新检查</Button>
            <Button icon={<DownloadOutlined />} onClick={handleExportHealth}>导出问题</Button>
          </Space>
        ) : (
          <Space style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center' }}>
            <Button icon={<ReloadOutlined />} onClick={() => mutate()}>刷新</Button>
            <Button icon={<ExportOutlined />} onClick={handleExport}>导出</Button>
            {entityKey === 'enrollments' && (
              <Button type="primary" icon={<SettingOutlined />} onClick={() => setHourAdjustOpen(true)}>课时调整</Button>
            )}
          </Space>
        )
      }
    >
      <Alert
        type="warning"
        showIcon
        message="重要数据请优先通过对应业务模块修改。删除操作会记录日志并支持恢复。课时数据请通过「课时调整」入口处理，不要直接编辑。"
        style={{ marginBottom: 16 }}
      />

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', marginBottom: 0 }}>
        <Tabs
          activeKey={activeTab}
          onChange={(k) => setActiveTab(k as EntityKey | 'health')}
          items={ENTITY_TABS.map((t) => ({
            key: t.key,
            label: (
              <span>
                {t.key === 'health' ? <SafetyOutlined style={{ marginRight: 6 }} /> : null}
                {t.label}
              </span>
            ),
          }))}
          style={{ minWidth: isMobile ? `${ENTITY_TABS.length * 70}px` : undefined, marginBottom: 0 }}
        />
      </div>

      {isHealthTab ? (
        <div>
          {healthData?.data ? (
            healthData.data.length === 0 ? (
              <Empty description="未发现数据问题，数据状态良好" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Table
                dataSource={healthData.data.map((issue: { label: string; count: number; severity: string; description: string; sampleIds?: string[] }, i: number) => ({ ...issue, key: i }))}
                columns={[
                  { title: '问题', dataIndex: 'label', key: 'label', width: 200 },
                  { title: '数量', dataIndex: 'count', key: 'count', width: 80 },
                  {
                    title: '严重程度',
                    dataIndex: 'severity',
                    key: 'severity',
                    width: 100,
                    render: (s: string) => {
                      const color = s === 'high' ? 'red' : s === 'medium' ? 'orange' : 'blue'
                      const labels = { high: '高', medium: '中', low: '低' }
                      return <Tag color={color}>{labels[s as keyof typeof labels]}</Tag>
                    },
                  },
                  { title: '说明', dataIndex: 'description', key: 'description' },
                  {
                    title: '样例ID',
                    dataIndex: 'sampleIds',
                    key: 'sampleIds',
                    width: 200,
                    render: (ids: string[]) => ids?.slice(0, 5).join(', ') || '-',
                  },
                ]}
                size="small"
                pagination={false}
              />
            )
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin /></div>
          )}
        </div>
      ) : (
        <div>
          {/* Search & Filter bar */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: isMobile ? 'stretch' : 'center' }}>
            <Input
              placeholder={`搜索${def?.label || ''}...`}
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: isMobile ? '100%' : 240 }}
              allowClear
            />
            {STATUS_FILTER_MAP[entityKey] && (
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={STATUS_FILTER_MAP[entityKey]}
                style={{ width: isMobile ? '100%' : 140 }}
              />
            )}
            <Button
              type={includeDeleted ? 'primary' : 'default'}
              danger={includeDeleted}
              icon={includeDeleted ? <DeleteOutlined /> : <RestOutlined />}
              onClick={() => setIncludeDeleted(!includeDeleted)}
            >
              {includeDeleted ? '显示已删除' : '显示已删除/归档'}
            </Button>
            {entityKey === 'enrollments' && (
              <Button type="primary" icon={<SettingOutlined />} onClick={() => setHourAdjustOpen(true)}>
                课时调整
              </Button>
            )}
          </div>

          {selectedRowKeys.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
                marginBottom: 12,
                padding: 12,
                borderRadius: 8,
                background: '#fff7e6',
                border: '1px solid #ffd591',
              }}
            >
              <Text strong>已选择 {selectedRowKeys.length} 条</Text>
              {includeDeleted ? (
                <Button
                  icon={<UndoOutlined />}
                  loading={batchLoading}
                  disabled={!supportsBatch}
                  onClick={() => handleBatchAction('restore')}
                >
                  批量恢复
                </Button>
              ) : (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  loading={batchLoading}
                  disabled={!supportsBatch}
                  onClick={() => handleBatchAction('softDelete')}
                >
                  批量软删除
                </Button>
              )}
              {entityKey === 'notifications' && (
                <Button loading={batchLoading} onClick={() => handleBatchAction('markRead')}>
                  批量标记已读
                </Button>
              )}
              {!supportsBatch && entityKey !== 'notifications' && <Text type="secondary">该类型暂不支持批量操作</Text>}
              <Button onClick={() => setSelectedRowKeys([])}>取消选择</Button>
            </div>
          )}

          {/* Table */}
          <Table
            rowKey="id"
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            dataSource={records.map((r: Record<string, unknown> & { key?: string }) => ({ ...r, key: r.key ?? (r.id as string) }))}
            columns={tableColumns}
            loading={isLoading}
            size="small"
            scroll={{ x: isMobile ? 400 : 'max-content' }}
            pagination={false}
            locale={{ emptyText: <Empty description="暂无数据" /> }}
          />

          {/* Pagination */}
          {total > limit && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
              <Pagination
                current={page}
                total={total}
                pageSize={limit}
                onChange={setPage}
                showSizeChanger={false}
                showTotal={(t) => `共 ${t} 条`}
              />
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {def && (
        <Modal
          title={`编辑${def.label}`}
          open={editModalOpen}
          onOk={handleEditSave}
          onCancel={() => setEditModalOpen(false)}
          confirmLoading={editLoading}
          okText="保存"
          cancelText="取消"
          width={520}
        >
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {def.editableFields.map((f) => (
              <div key={f}>
                <Text type="secondary" style={{ fontSize: 12 }}>{f}</Text>
                <Input
                  value={editData[f] === null || editData[f] === undefined ? '' : String(editData[f])}
                  onChange={(e) => setEditData({ ...editData, [f]: e.target.value })}
                  style={{ marginTop: 2 }}
                />
              </div>
            ))}
          </Space>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        title="确认删除"
        open={deleteModalOpen}
        onOk={handleDeleteConfirm}
        onCancel={() => setDeleteModalOpen(false)}
        confirmLoading={deleteLoading}
        okText="确认删除"
        cancelText="取消"
        okButtonProps={{ danger: true }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <div>
            确认删除
            <Text strong> {deletingRecord ? getRecordName(deletingRecord) : ''}</Text>
            ？此操作为软删除，数据可在「显示已删除」视图中恢复。
          </div>
          <div>
            <Text type="secondary">删除原因（必填）</Text>
            <Input.TextArea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="请填写删除原因"
              rows={3}
              style={{ marginTop: 4 }}
            />
          </div>
        </Space>
      </Modal>

      {/* Detail Drawer */}
      <DetailDrawer open={detailOpen} onClose={() => setDetailOpen(false)} entityKey={entityKey} record={detailRecord} />

      {/* Hour Adjustment Modal */}
      <HourAdjustmentModal open={hourAdjustOpen} onClose={() => setHourAdjustOpen(false)} />
    </PageLayout>
  )
}
