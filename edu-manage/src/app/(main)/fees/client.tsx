'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  App, Button, Card, Col, DatePicker, Descriptions, Divider, Empty,
  Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space,
  Statistic, Table, Tag, Typography,
} from 'antd'
import {
  DeleteOutlined, DownloadOutlined, EditOutlined,
  PlusOutlined, SearchOutlined, UserOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { Text, Title } = Typography
const { RangePicker } = DatePicker

const DIVISION_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '初中部', value: 'JUNIOR' },
  { label: '高中部', value: 'SENIOR' },
]

const fetcher = (url: string) => fetch(url).then(r => r.json())

interface FeeRow {
  id: string
  studentId: string
  student: { id: string; name: string; division: string }
  course?: { id: string; name: string } | null
  amount: number
  type: string
  hours: number | null
  campus: string | null
  operator: string | null
  notes: string | null
  paidAt: string | null
  createdAt: string
}

interface FeeSummary {
  totalAmount: number
  monthAmount: number
  oneOnOneAmount: number
  classAmount: number
  totalHours: number
  count: number
}

interface FeeListData {
  rows: FeeRow[]
  total: number
  page: number
  limit: number
  summary: FeeSummary
}

interface StudentAggregate {
  student: { id: string; name: string }
  totalAmount: number
  totalHours: number
  count: number
  rows: FeeRow[]
}

export function FeesClient() {
  const { message } = App.useApp()
  const [division, setDivision] = useState('all')
  const [type, setType] = useState<string>()
  const [campus, setCampus] = useState<string>()
  const [studentSearch, setStudentSearch] = useState('')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  // Entry modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  // Student aggregate modal
  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)

  const params = new URLSearchParams()
  params.set('division', division)
  if (type) params.set('type', type)
  if (campus) params.set('campus', campus)
  if (studentSearch) params.set('studentId', studentSearch)
  if (dateRange) {
    params.set('from', dateRange[0].format('YYYY-MM-DD'))
    params.set('to', dateRange[1].format('YYYY-MM-DD'))
  }
  params.set('page', String(page))
  params.set('limit', String(pageSize))

  const { data, error, isLoading, mutate } = useSWR<FeeListData>(
    `/api/fees?${params.toString()}`,
    fetcher,
    { refreshInterval: 0, revalidateOnFocus: false },
  )

  // Student aggregate
  const { data: studentAgg } = useSWR<StudentAggregate>(
    selectedStudent ? `/api/fees?studentId=${selectedStudent}&aggregate=true&division=${division}` : null,
    fetcher,
  )

  // Fee types for dropdown
  const { data: feeTypes } = useSWR<{ id: string; name: string }[]>(
    '/api/fees/fee-types',
    fetcher,
  )

  // Students for search
  const [studentOptions, setStudentOptions] = useState<{ label: string; value: string }[]>([])
  const [searchingStudents, setSearchingStudents] = useState(false)

  const handleStudentSearch = useCallback(async (name: string) => {
    if (!name || name.length < 1) { setStudentOptions([]); return }
    setSearchingStudents(true)
    try {
      const res = await fetch(`/api/students?search=${encodeURIComponent(name)}&limit=20&division=${division === 'all' ? '' : division}`)
      const json = await res.json()
      const list = json.students || json.data || []
      setStudentOptions(list.map((s: { id: string; name: string }) => ({ label: s.name, value: s.id })))
    } finally { setSearchingStudents(false) }
  }, [division])

  // Unique campuses and types from data
  const campusOptions = useMemo(() => {
    const set = new Set<string>()
    data?.rows.forEach(r => { if (r.campus) set.add(r.campus) })
    return [...set].map(v => ({ label: v, value: v }))
  }, [data])

  const columns: ColumnsType<FeeRow> = [
    { title: '收费日期', dataIndex: 'paidAt', key: 'paidAt', width: 110,
      render: (v: string | null) => v ? dayjs(v).format('YYYY-MM-DD') : '-' },
    { title: '学生', dataIndex: ['student', 'name'], key: 'student', width: 100,
      render: (name: string, record: FeeRow) => (
        <a onClick={() => { setSelectedStudent(record.studentId); setStudentModalOpen(true) }}>
          {name}
        </a>
      ) },
    { title: '学部', dataIndex: ['student', 'division'], key: 'division', width: 80,
      render: (v: string) => <Tag color={v === 'SENIOR' ? 'blue' : 'green'}>{v === 'SENIOR' ? '高中' : '初中'}</Tag> },
    { title: '校区', dataIndex: 'campus', key: 'campus', width: 100 },
    { title: '经办人', dataIndex: 'operator', key: 'operator', width: 90 },
    { title: '类型', dataIndex: 'type', key: 'type', width: 80 },
    { title: '课时', dataIndex: 'hours', key: 'hours', width: 70, render: (v: number | null) => v != null ? v : '-' },
    { title: '费用', dataIndex: 'amount', key: 'amount', width: 100,
      render: (v: number) => <Text strong>¥{v.toLocaleString()}</Text> },
    { title: '单价', key: 'unitPrice', width: 80,
      render: (_: unknown, r: FeeRow) => r.hours ? `¥${Math.round(r.amount / r.hours)}/h` : '-' },
    { title: '备注', dataIndex: 'notes', key: 'notes', width: 120, ellipsis: true },
    { title: '操作', key: 'actions', width: 100, fixed: 'right',
      render: (_: unknown, r: FeeRow) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />}
            onClick={() => {
              setEditingId(r.id)
              form.setFieldsValue({
                studentId: r.studentId,
                studentName: r.student.name,
                type: r.type,
                amount: r.amount,
                hours: r.hours,
                campus: r.campus,
                operator: r.operator,
                notes: r.notes,
                paidAt: r.paidAt ? dayjs(r.paidAt) : undefined,
              })
              setModalOpen(true)
            }} />
          <Popconfirm title="确定删除此记录？" onConfirm={async () => {
            await fetch(`/api/fees/${r.id}`, { method: 'DELETE' })
            message.success('已删除')
            mutate()
          }}>
            <Button type="link" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      setSubmitting(true)
      const body = {
        studentId: values.studentId,
        type: values.type || '其他',
        amount: values.amount,
        hours: values.hours ?? null,
        campus: values.campus || null,
        operator: values.operator || null,
        notes: values.notes || null,
        paidAt: values.paidAt ? values.paidAt.format('YYYY-MM-DD') : undefined,
      }
      const url = editingId ? `/api/fees/${editingId}` : '/api/fees'
      const method = editingId ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const err = await res.json()
        message.error(err.error || '保存失败')
        return
      }
      message.success(editingId ? '已更新' : '已录入')
      setModalOpen(false)
      setEditingId(null)
      form.resetFields()
      mutate()
    } catch { /* validation error */ } finally { setSubmitting(false) }
  }

  const handleExport = async () => {
    message.loading({ content: '正在导出...', key: 'export' })
    try {
      const res = await fetch(`/api/fees?${params.toString()}&limit=10000`)
      const json = await res.json()
      const rows = json.rows || []

      // Build CSV
      const headers = ['收费日期', '学生', '学部', '校区', '经办人', '类型', '课时', '费用', '单价', '备注']
      const lines = [headers.join(',')]
      for (const r of rows) {
        const unit = r.hours ? Math.round(r.amount / r.hours) : ''
        lines.push([
          r.paidAt ? dayjs(r.paidAt).format('YYYY-MM-DD') : '',
          `"${r.student?.name || ''}"`,
          r.student?.division === 'SENIOR' ? '高中' : '初中',
          `"${r.campus || ''}"`,
          `"${r.operator || ''}"`,
          r.type,
          r.hours ?? '',
          r.amount,
          unit,
          `"${(r.notes || '').replace(/"/g, '""')}"`,
        ].join(','))
      }
      // Summary row
      const s = json.summary
      lines.push('')
      lines.push(`"合计",,,,"",,${s.totalHours ?? 0},${s.totalAmount},,""`)
      lines.push(`"其中1对1",,,,"",,,${s.oneOnOneAmount},,""`)
      lines.push(`"其中班课",,,,"",,,${s.classAmount},,""`)

      const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const range = dateRange ? `${dateRange[0].format('YYYYMMDD')}_${dateRange[1].format('YYYYMMDD')}` : 'all'
      a.download = `收费台账_${division === 'all' ? '全部' : division}_${range}.csv`
      a.click()
      URL.revokeObjectURL(url)
      message.success({ content: '导出完成', key: 'export' })
    } catch {
      message.error({ content: '导出失败', key: 'export' })
    }
  }

  const s = data?.summary

  // Campus summary
  const campusSummary = useMemo(() => {
    if (!data?.rows) return []
    const map = new Map<string, { total: number; hours: number; count: number }>()
    for (const r of data.rows) {
      const key = r.campus || '未分类'
      const cur = map.get(key) || { total: 0, hours: 0, count: 0 }
      cur.total += r.amount
      cur.hours += r.hours ?? 0
      cur.count += 1
      map.set(key, cur)
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total)
  }, [data])

  return (
    <div>
      {/* Summary Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8} md={4}>
          <Card size="small"><Statistic title="总收费额" value={s?.totalAmount ?? 0} prefix="¥" precision={0} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small"><Statistic title="本月收费额" value={s?.monthAmount ?? 0} prefix="¥" precision={0} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small"><Statistic title="1对1金额" value={s?.oneOnOneAmount ?? 0} prefix="¥" precision={0} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small"><Statistic title="班课金额" value={s?.classAmount ?? 0} prefix="¥" precision={0} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small"><Statistic title="总课时数" value={s?.totalHours ?? 0} suffix="h" precision={1} /></Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card size="small"><Statistic title="收费笔数" value={s?.count ?? 0} suffix="笔" /></Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card size="small" style={{ marginBottom: 12 }}>
        <Space wrap>
          <Select value={division} onChange={(v) => { setDivision(v); setPage(1) }} options={DIVISION_OPTIONS} style={{ width: 100 }} />
          <Select allowClear placeholder="收费类型" value={type} onChange={(v) => { setType(v); setPage(1) }}
            options={(feeTypes || []).map((t: { name: string }) => ({ label: t.name, value: t.name }))}
            style={{ width: 110 }} />
          <Select allowClear placeholder="校区" value={campus} onChange={(v) => { setCampus(v); setPage(1) }}
            options={campusOptions} style={{ width: 120 }} />
          <Select allowClear showSearch placeholder="搜索学生" value={studentSearch || undefined}
            onSearch={handleStudentSearch} onChange={(v) => { setStudentSearch(v || ''); setPage(1) }}
            filterOption={false} options={studentOptions} loading={searchingStudents}
            style={{ width: 180 }} />
          <RangePicker value={dateRange as any} onChange={(v) => { setDateRange(v as any); setPage(1) }}
            placeholder={['开始日期', '结束日期']} allowClear />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); form.resetFields(); setModalOpen(true) }}>
            录入收费
          </Button>
          <Button icon={<DownloadOutlined />} onClick={handleExport}>导出</Button>
        </Space>
      </Card>

      {/* Table */}
      <Card size="small">
        <Table<FeeRow>
          rowKey="id"
          columns={columns}
          dataSource={data?.rows || []}
          loading={isLoading}
          size="small"
          scroll={{ x: 1100 }}
          pagination={{
            current: page,
            pageSize,
            total: data?.total ?? 0,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / 共 ${total} 条`,
            onChange: (p, ps) => { setPage(p); setPageSize(ps) },
          }}
        />
      </Card>

      {/* Campus Summary */}
      {campusSummary.length > 0 && (
        <Card size="small" title="按校区汇总" style={{ marginTop: 12 }}>
          <Table
            rowKey="0"
            dataSource={campusSummary.map(([name, val]) => ({ campus: name, ...val }))}
            columns={[
              { title: '校区', dataIndex: 'campus', key: 'campus' },
              { title: '总额', dataIndex: 'total', key: 'total', render: (v: number) => `¥${v.toLocaleString()}` },
              { title: '课时', dataIndex: 'hours', key: 'hours', render: (v: number) => v.toFixed(1) },
              { title: '笔数', dataIndex: 'count', key: 'count' },
            ]}
            size="small"
            pagination={false}
          />
        </Card>
      )}

      {/* Entry Modal */}
      <Modal
        title={editingId ? '编辑收费记录' : '录入收费'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => { setModalOpen(false); setEditingId(null); form.resetFields() }}
        confirmLoading={submitting}
        destroyOnClose
        width={520}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="studentId" label="学生" rules={[{ required: true, message: '请选择学生' }]}>
            <Select showSearch placeholder="按名字搜索学生" filterOption={false}
              onSearch={handleStudentSearch} options={studentOptions} loading={searchingStudents} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="type" label="收费类型" rules={[{ required: true }]}>
                <Select placeholder="选择类型" options={
                  (feeTypes || []).map((t: { name: string }) => ({ label: t.name, value: t.name }))
                } />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="paidAt" label="收费日期">
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="amount" label="费用" rules={[{ required: true, message: '请输入金额' }]}>
                <InputNumber min={0} prefix="¥" style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="hours" label="课时数">
                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="campus" label="校区">
                <Input placeholder="如: 35校区" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="operator" label="经办人">
                <Input placeholder="经办人姓名" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} placeholder="可选备注" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Student Aggregate Modal */}
      <Modal
        title={studentAgg ? `${studentAgg.student.name} — 收费汇总` : '学生收费汇总'}
        open={studentModalOpen}
        onCancel={() => { setStudentModalOpen(false); setSelectedStudent(null) }}
        footer={null}
        width={700}
      >
        {studentAgg && (
          <>
            <Row gutter={12} style={{ marginBottom: 16 }}>
              <Col span={8}><Statistic title="累计金额" value={studentAgg.totalAmount} prefix="¥" /></Col>
              <Col span={8}><Statistic title="累计课时" value={studentAgg.totalHours} suffix="h" /></Col>
              <Col span={8}><Statistic title="笔数" value={studentAgg.count} suffix="笔" /></Col>
            </Row>
            <Table
              rowKey="id"
              dataSource={studentAgg.rows}
              columns={[
                { title: '日期', dataIndex: 'paidAt', render: (v: string) => v ? dayjs(v).format('YYYY-MM-DD') : '-' },
                { title: '类型', dataIndex: 'type' },
                { title: '课时', dataIndex: 'hours', render: (v: number | null) => v ?? '-' },
                { title: '费用', dataIndex: 'amount', render: (v: number) => `¥${v.toLocaleString()}` },
                { title: '备注', dataIndex: 'notes', ellipsis: true },
              ]}
              size="small"
              pagination={false}
            />
          </>
        )}
      </Modal>
    </div>
  )
}
