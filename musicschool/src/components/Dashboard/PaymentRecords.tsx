'use client'

import { Card, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { PaymentRecord } from '@/lib/mock-data'

const { Title } = Typography

const columns: ColumnsType<PaymentRecord> = [
  { title: '学员', dataIndex: 'student', key: 'student', width: 80 },
  { title: '金额', dataIndex: 'amount', key: 'amount', width: 80, render: (v: number) => <span style={{ fontWeight: 600 }}>¥{v.toLocaleString()}</span> },
  { title: '类型', dataIndex: 'type', key: 'type', width: 80 },
  { title: '日期', dataIndex: 'date', key: 'date', width: 100 },
  {
    title: '状态', dataIndex: 'status', key: 'status', width: 80,
    render: (s: string) => <Tag color={s === '已付' ? 'green' : 'orange'}>{s}</Tag>,
  },
]

export function PaymentRecordsCard({ data }: { data: PaymentRecord[] }) {
  return (
    <Card bordered={false} style={{ borderRadius: 8 }} styles={{ body: { padding: '16px 20px' } }}>
      <Title level={5} style={{ marginBottom: 12 }}>最新缴费记录</Title>
      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        size="small"
        pagination={false}
        showHeader={true}
      />
    </Card>
  )
}
