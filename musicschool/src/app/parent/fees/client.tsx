'use client'

import { useState } from 'react'
import { Card, Typography, Table, Tag, Select, Statistic, Row, Col, Button, message } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Title, Text } = Typography

interface FeeRow { key: string; id: string; student: string; course: string; amount: number; type: string; status: string; date: string; paidAt: string | null }

export function ParentFeesClient({
  feeData, studentNames, totalPaid, totalPending
}: {
  feeData: FeeRow[]
  studentNames: string[]
  totalPaid: number
  totalPending: number
}) {
  const isMobile = useIsMobile()
  const [selectedChild, setSelectedChild] = useState<string>('all')

  const filtered = selectedChild === 'all' ? feeData : feeData.filter(f => f.student === selectedChild)

  const handlePay = (record: FeeRow) => {
    message.info('模拟支付：' + record.student + ' - ' + record.course + ' - ¥' + record.amount)
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>缴费记录</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={8}><Card bordered={false}><Statistic title="已缴总额" value={totalPaid} prefix="¥" valueStyle={{ color: '#27a644' }} suffix={<CheckCircleOutlined />} /></Card></Col>
        <Col xs={12} sm={8}><Card bordered={false}><Statistic title="待缴总额" value={totalPending} prefix="¥" valueStyle={{ color: '#e03e2d' }} suffix={<ClockCircleOutlined />} /></Card></Col>
        <Col xs={24} sm={8}><Card bordered={false}><Statistic title="合计" value={totalPaid + totalPending} prefix="¥" /></Card></Col>
      </Row>

      <Card bordered={false} style={{ borderRadius: 8, marginBottom: 16 }}>
        <Select defaultValue="all" style={{ width: 180 }} onChange={v => setSelectedChild(v)}
          options={[{ value: 'all', label: '全部子女' }, ...studentNames.map(c => ({ value: c, label: c }))]} />
      </Card>

      <Card bordered={false} style={{ borderRadius: 8 }}>
        {isMobile ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {filtered.map(record => (
              <div key={record.key} style={{ border: '1px solid #EEE7E1', borderRadius: 10, padding: 12, background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div><Tag color="blue">{record.student}</Tag><Text strong>{record.course}</Text></div>
                  {record.status === 'paid' ? <Tag color="green">已缴费</Tag> : <Tag color="orange">待缴费</Tag>}
                </div>
                <div style={{ marginTop: 8, display: 'grid', gap: 4, color: '#5a4e3a', fontSize: 13 }}>
                  <Text strong style={{ fontSize: 18 }}>¥{record.amount.toLocaleString()}</Text>
                  <span>{record.type} · {record.date}</span>
                  <span>{record.paidAt || '未缴费'}</span>
                </div>
                {record.status === 'pending' && <Button type="primary" block style={{ marginTop: 10 }} onClick={() => handlePay(record)}>立即缴费</Button>}
              </div>
            ))}
            {!filtered.length && <div style={{ textAlign: 'center', padding: 20 }}><Text type="secondary">暂无缴费记录</Text></div>}
          </div>
        ) : <Table dataSource={filtered} rowKey="key" pagination={false} size="small"
          locale={{ emptyText: '暂无缴费记录' }}
          columns={[
            { title: '学员', dataIndex: 'student', key: 'student', render: (v: string) => <Tag color="blue">{v}</Tag> },
            { title: '课程', dataIndex: 'course', key: 'course' },
            { title: '金额', dataIndex: 'amount', key: 'amount', render: (v: number) => <Text strong style={{ fontSize: 16 }}>¥{v.toLocaleString()}</Text> },
            { title: '类型', dataIndex: 'type', key: 'type' },
            { title: '账单日期', dataIndex: 'date', key: 'date' },
            { title: '状态', dataIndex: 'status', key: 'status', render: (s: string) => s === 'paid' ? <Tag color="green">已缴费</Tag> : <Tag color="orange">待缴费</Tag> },
            { title: '缴费时间', dataIndex: 'paidAt', key: 'paidAt', render: (d: string | null) => d || '-' },
            { title: '操作', key: 'action', render: (_: unknown, r: FeeRow) => r.status === 'pending' ? <Button type="primary" size="small" onClick={() => handlePay(r)}>立即缴费</Button> : null },
          ]} />}
      </Card>
    </div>
  )
}
