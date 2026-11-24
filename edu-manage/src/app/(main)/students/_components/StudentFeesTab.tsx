'use client'

import React, { useMemo, useState } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import {
  Alert,
  Card,
  Input,
  Radio,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'

const { Text } = Typography

export interface FeeItemRow {
  id: string
  studentId: string
  student: { id: string; name: string; division: string }
  course?: { id: string; name: string } | null
  amount: number
  type: string
  status: string
  dueDate: string | null
  hours: number | null
  campus: string | null
  operator: string | null
  notes: string | null
  paidAt: string | null
  createdAt: string
}

interface StudentFeesTabProps {
  searchQuery: string
  division: string
  isMobile: boolean
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('学费订单加载失败')
  return res.json()
}

export function StudentFeesTab({
  searchQuery,
  division,
  isMobile,
}: StudentFeesTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [localSearch, setLocalSearch] = useState('')

  const effectiveSearch = (localSearch || searchQuery).trim()
  const apiUrl = `/api/fees?division=${division}&studentSearch=${encodeURIComponent(
    effectiveSearch
  )}&limit=100`

  const { data, error, isLoading } = useSWR<{
    rows: FeeItemRow[]
    total: number
    summary: {
      totalAmount: number
      monthAmount: number
      oneOnOneAmount: number
      classAmount: number
      totalHours: number
      count: number
    }
  }>(apiUrl, fetcher, { revalidateOnFocus: false, dedupingInterval: 30000 })

  const rows = data?.rows || []
  const summary = data?.summary || {
    totalAmount: 0,
    monthAmount: 0,
    oneOnOneAmount: 0,
    classAmount: 0,
    totalHours: 0,
    count: 0,
  }

  // 状态过滤
  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows
    return rows.filter((r) => r.status === statusFilter)
  }, [rows, statusFilter])

  // 待付统计
  const unpaidCount = useMemo(() => {
    return rows.filter((r) => r.status === 'UNPAID' || r.status === 'OVERDUE').length
  }, [rows])

  const columns: ColumnsType<FeeItemRow> = [
    {
      title: '学员姓名',
      key: 'student',
      width: 140,
      render: (_, record) => (
        <div>
          <Link
            href={`/students/${record.studentId}`}
            style={{ fontWeight: 700, color: '#14574D', fontSize: 13.5 }}
          >
            {record.student?.name || '学员'}
          </Link>
          <div style={{ fontSize: 11, color: '#756A58', marginTop: 2 }}>
            {record.student?.division === 'SENIOR' ? '高中部' : '初中部'}
          </div>
        </div>
      ),
    },
    {
      title: '课程与费用项目',
      dataIndex: 'type',
      key: 'type',
      width: 180,
      render: (type, record) => (
        <div>
          <span style={{ fontWeight: 600, color: '#2B2110', fontSize: 13.5 }}>
            {record.course?.name || type || '课程培训费'}
          </span>
          {record.hours && (
            <div style={{ fontSize: 11.5, color: '#756A58', marginTop: 2 }}>
              折合 {record.hours} 课时
            </div>
          )}
        </div>
      ),
    },
    {
      title: '订单金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      render: (amount) => (
        <span style={{ fontWeight: 800, color: '#14574D', fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
          ¥ {Number(amount).toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: '缴费状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status, record) => {
        if (status === 'PAID') {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              已缴清
            </Tag>
          )
        }
        if (status === 'OVERDUE' || (record.dueDate && dayjs(record.dueDate).isBefore(dayjs()))) {
          return (
            <Tag color="error" icon={<ExclamationCircleOutlined />}>
              已逾期
            </Tag>
          )
        }
        return (
          <Tag color="warning" icon={<ClockCircleOutlined />}>
            待缴费
          </Tag>
        )
      },
    },
    {
      title: '发生日期',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (date) => (
        <span style={{ fontSize: 12.5, color: '#756A58', fontVariantNumeric: 'tabular-nums' }}>
          {date ? dayjs(date).format('YYYY-MM-DD') : '-'}
        </span>
      ),
    },
    {
      title: '经办人',
      dataIndex: 'operator',
      key: 'operator',
      width: 110,
      render: (op) => <span style={{ fontSize: 12.5, color: '#5A4E3A' }}>{op || '系统录入'}</span>,
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 顶部统计卡片 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
          gap: 10,
        }}
      >
        <div
          style={{
            background: '#FFFDF7',
            border: '1px solid rgba(214, 180, 91, 0.28)',
            padding: '12px 14px',
            borderRadius: 12,
          }}
        >
          <div style={{ color: '#756A58', fontSize: 12 }}>累计实缴学费总额</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#14574D', marginTop: 4 }}>
            ¥ {summary.totalAmount.toLocaleString('zh-CN')}
          </div>
        </div>

        <div
          style={{
            background: '#FFFDF7',
            border: '1px solid rgba(214, 180, 91, 0.28)',
            padding: '12px 14px',
            borderRadius: 12,
          }}
        >
          <div style={{ color: '#756A58', fontSize: 12 }}>本月收款金额</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#1D9E75', marginTop: 4 }}>
            ¥ {summary.monthAmount.toLocaleString('zh-CN')}
          </div>
        </div>

        <div
          style={{
            background: unpaidCount > 0 ? '#FFFBEB' : '#FFFDF7',
            border: '1px solid rgba(214, 180, 91, 0.28)',
            padding: '12px 14px',
            borderRadius: 12,
          }}
        >
          <div style={{ color: '#756A58', fontSize: 12 }}>待补交/欠费订单</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: unpaidCount > 0 ? '#D97706' : '#14574D', marginTop: 4 }}>
            {unpaidCount} <span style={{ fontSize: 12, fontWeight: 500 }}>笔</span>
          </div>
        </div>

        <div
          style={{
            background: '#FFFDF7',
            border: '1px solid rgba(214, 180, 91, 0.28)',
            padding: '12px 14px',
            borderRadius: 12,
          }}
        >
          <div style={{ color: '#756A58', fontSize: 12 }}>涵盖消课总学时</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: '#14574D', marginTop: 4 }}>
            {summary.totalHours} <span style={{ fontSize: 12, fontWeight: 500 }}>节</span>
          </div>
        </div>
      </div>

      {/* 快捷过滤条 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          background: '#FFFFFF',
          padding: '10px 14px',
          borderRadius: 12,
          border: '1px solid rgba(58, 50, 39, 0.08)',
        }}
      >
        <Radio.Group
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          size={isMobile ? 'small' : 'middle'}
        >
          <Radio.Button value="all">全部账目 ({rows.length})</Radio.Button>
          <Radio.Button value="PAID">已缴清</Radio.Button>
          <Radio.Button value="UNPAID">待缴费 ({unpaidCount})</Radio.Button>
          <Radio.Button value="OVERDUE">已逾期</Radio.Button>
        </Radio.Group>

        <Input
          placeholder="搜索学员姓名进行精确核账..."
          prefix={<SearchOutlined style={{ color: '#A89C8A' }} />}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          allowClear
          style={{ width: isMobile ? '100%' : 240, borderRadius: 8 }}
        />
      </div>

      {/* 订单明细表格 */}
      <Card
        styles={{ body: { padding: isMobile ? 8 : 12 } }}
        style={{
          borderRadius: 14,
          border: '1px solid rgba(58, 50, 39, 0.08)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
        }}
      >
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin tip="正在载入学费账目..." />
          </div>
        ) : error ? (
          <Alert
            type="error"
            message="订单加载失败"
            description="请检查权限或稍后重试"
            showIcon
          />
        ) : (
          <Table
            columns={columns}
            dataSource={filteredRows}
            rowKey="id"
            pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 笔账单` }}
            scroll={{ x: 750 }}
            size="middle"
          />
        )}
      </Card>
    </div>
  )
}
