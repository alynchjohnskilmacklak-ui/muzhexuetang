'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, Col, Empty, Row, Segmented, Space, Statistic, Table, Tag, Typography } from 'antd'
import { DollarOutlined } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'

const { Text, Title } = Typography

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const PERIOD_OPTIONS = [
  { label: '本月', value: 'month' },
  { label: '本周', value: 'week' },
  { label: '全部', value: 'all' },
]

const TYPE_META: Record<string, { color: string; label: string }> = {
  LESSON_PAY: { color: '#1D9E75', label: '课时费' },
  FEEDBACK_BONUS: { color: '#E8784A', label: '反馈奖励' },
  manual_adjust: { color: '#7A6F5F', label: '薪资调整' },
}

interface SalaryTransaction {
  id: string
  type: string
  typeLabel?: string
  amount: number
  description?: string | null
  lessonDate?: string | null
  createdAt: string
}

interface SalaryPayload {
  total: number
  totalLesson: number
  totalFeedback: number
  totalAdjustment: number
  transactions: SalaryTransaction[]
}

export default function TeacherSalaryPage() {
  const isMobile = useIsMobile() ?? false
  const [period, setPeriod] = useState('month')
  const { data, isLoading } = useSWR<SalaryPayload>(`/api/teacher/salary?period=${period}`, fetcher)
  const transactions = data?.transactions ?? []

  const renderAmount = (value: number) => (
    <Text strong style={{ color: value >= 0 ? '#1D9E75' : '#C0392B' }}>
      {value >= 0 ? '+' : ''}¥{value.toFixed(2)}
    </Text>
  )

  const columns = [
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 140,
      render: (value: string) => new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (value: string, record: SalaryTransaction) => (
        <Tag color={TYPE_META[value]?.color ?? 'default'} style={{ borderRadius: 999 }}>
          {TYPE_META[value]?.label ?? record.typeLabel ?? '其他调整'}
        </Tag>
      ),
    },
    {
      title: '说明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (value?: string | null) => value || '-',
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      align: 'right' as const,
      render: renderAmount,
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>我的薪资</Title>

      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Segmented options={PERIOD_OPTIONS} value={period} onChange={(value) => setPeriod(value as string)} />

        <Row gutter={[12, 12]}>
          <Col xs={24} sm={6}>
            <Card bordered={false} style={{ borderRadius: 8, background: 'linear-gradient(135deg,#1D9E75,#27B885)' }}>
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,.82)', fontSize: 13 }}>合计薪资</span>}
                value={data?.total ?? 0}
                precision={2}
                prefix={<DollarOutlined />}
                suffix="元"
                valueStyle={{ color: '#fff', fontWeight: 700, fontSize: isMobile ? 22 : 26 }}
                loading={isLoading}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card bordered={false} style={{ borderRadius: 8 }}>
              <Statistic title="课时薪资" value={data?.totalLesson ?? 0} precision={2} suffix="元" valueStyle={{ color: '#1D9E75' }} loading={isLoading} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card bordered={false} style={{ borderRadius: 8 }}>
              <Statistic title="反馈奖励" value={data?.totalFeedback ?? 0} precision={2} suffix="元" valueStyle={{ color: '#E8784A' }} loading={isLoading} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card bordered={false} style={{ borderRadius: 8 }}>
              <Statistic title="其他调整" value={data?.totalAdjustment ?? 0} precision={2} suffix="元" valueStyle={{ color: '#7A6F5F' }} loading={isLoading} />
            </Card>
          </Col>
        </Row>

        <Card title="薪资明细" bordered={false} style={{ borderRadius: 8 }} extra={<Text type="secondary" style={{ fontSize: 12 }}>考勤和课堂反馈自动结算</Text>}>
          {isMobile ? (
            isLoading ? <CardSkeleton rows={3} /> : (
              <div style={{ display: 'grid', gap: 10 }}>
                {transactions.map((transaction) => (
                  <div key={transaction.id} style={{ padding: 12, borderRadius: 10, border: '1px solid rgba(0,0,0,.06)', background: '#faf8f5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <Tag color={TYPE_META[transaction.type]?.color ?? 'default'} style={{ margin: 0, borderRadius: 999 }}>
                        {TYPE_META[transaction.type]?.label ?? transaction.typeLabel ?? '其他调整'}
                      </Tag>
                      {renderAmount(transaction.amount)}
                    </div>
                    <Text style={{ display: 'block', marginTop: 8, color: '#1a1201' }}>{transaction.description || '-'}</Text>
                    <Text type="secondary" style={{ display: 'block', marginTop: 5, fontSize: 12 }}>
                      {new Date(transaction.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </div>
                ))}
                {!transactions.length && <Empty description="暂无薪资记录" />}
              </div>
            )
          ) : (
            <Table
              dataSource={transactions}
              columns={columns}
              rowKey="id"
              loading={isLoading}
              pagination={{ pageSize: 20, hideOnSinglePage: true }}
              size="small"
              locale={{ emptyText: '暂无薪资记录' }}
            />
          )}
        </Card>

        <Card title="薪资规则说明" bordered={false} style={{ borderRadius: 8 }}>
          <Space direction="vertical" size={6}>
            <Text type="secondary" style={{ fontSize: 12 }}>课时费：完成考勤提交后自动发放，每节课仅计一次。</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>反馈奖励：发布课堂反馈后按学员人数发放，同一学生当天同课程类型只奖励一次。</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>默认初中班课 22 元/小时，高中班课 26 元/小时；一对一按年级独立定价。</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>默认班课反馈奖励 0.5 元/人，一对一反馈奖励 1 元/人。</Text>
          </Space>
        </Card>
      </Space>
    </div>
  )
}
