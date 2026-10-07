'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { Card, Empty, Segmented, Space, Table, Tag, Typography } from 'antd'
import { useIsMobile } from '@/hooks/useIsMobile'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { TeacherTrendCharts } from '@/components/teacher/TeacherTrendCharts'

const { Text, Title } = Typography

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const PERIOD_OPTIONS = [
  { label: '本月', value: 'month' },
  { label: '本周', value: 'week' },
  { label: '全部', value: 'all' },
]

const TYPE_META: Record<string, { color: string; label: string }> = {
  LESSON_PAY: { color: '#1D9E75', label: '课时费' },
  LESSON_PAY_ADJUSTMENT: { color: '#C77F00', label: '课时费结算调整' },
  FEEDBACK_BONUS: { color: '#E8784A', label: '反馈奖励' },
  STUDY_HALL_BONUS: { color: '#C6821E', label: '作业登记奖励' },
  STUDY_HALL_ATTENDANCE: { color: '#1D9E75', label: '晚托考勤奖励' },
  manual_adjust: { color: '#7A6F5F', label: '薪资调整' },
}

interface SalaryTransaction {
  id: string
  type: string
  salaryBucket: 'SMALL_CLASS' | 'INTENSIVE'
  typeLabel?: string
  amount: number
  description?: string | null
  lessonDate?: string | null
  createdAt: string
}

interface SalaryPayload {
  total: number
  totalSmallClass: number
  totalIntensive: number
  totalLesson: number
  totalFeedback: number
  totalAdjustment: number
  transactions: SalaryTransaction[]
}

export default function TeacherSalaryPage() {
  const isMobile = useIsMobile() ?? false
  const [period, setPeriod] = useState('month')
  const [salaryBucket, setSalaryBucket] = useState<'ALL' | 'SMALL_CLASS' | 'INTENSIVE'>('ALL')
  const { data, isLoading } = useSWR<SalaryPayload>(`/api/teacher/salary?period=${period}`, fetcher)
  // 教学与收入趋势（到课率 + 近 6 月课时/课时费），口径与教师首页一致
  const { data: trendData } = useSWR<{ attendanceWeekTrend: Array<{ label: string; rate: number }>; salaryTrend: Array<{ label: string; hours: number; pay: number }> }>('/api/teacher/trends', fetcher)
  const transactions = (data?.transactions ?? []).filter((item) => (
    salaryBucket === 'ALL' || item.salaryBucket === salaryBucket
  ))
  const todayKey = new Date().toLocaleDateString('sv-SE')
  const todayIncome = useMemo(() => (data?.transactions ?? []).reduce((sum, item) => {
    const source = item.lessonDate || item.createdAt
    return new Date(source).toLocaleDateString('sv-SE') === todayKey ? sum + item.amount : sum
  }, 0), [data?.transactions, todayKey])
  const mobileGroups = useMemo(() => {
    const groups = new Map<string, SalaryTransaction[]>()
    for (const transaction of transactions) {
      const key = new Date(transaction.lessonDate || transaction.createdAt).toLocaleDateString('sv-SE')
      groups.set(key, [...(groups.get(key) || []), transaction])
    }
    return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a))
  }, [transactions])

  const renderAmount = (value: number) => (
    <Text strong style={{ color: value >= 0 ? '#1D9E75' : '#C0392B', whiteSpace: 'nowrap', flexShrink: 0, display: 'inline-block' }}>
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
      title: '归属',
      dataIndex: 'salaryBucket',
      key: 'salaryBucket',
      width: 120,
      render: (value: SalaryTransaction['salaryBucket']) => (
        <Tag color={value === 'INTENSIVE' ? 'purple' : 'green'} style={{ borderRadius: 999 }}>
          {value === 'INTENSIVE' ? '一对一/二/三' : '小班课'}
        </Tag>
      ),
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
        <Space wrap>
          <Segmented options={PERIOD_OPTIONS} value={period} onChange={(value) => setPeriod(value as string)} />
          <Segmented
            value={salaryBucket}
            onChange={(value) => setSalaryBucket(value as typeof salaryBucket)}
            options={[
              { label: '全部', value: 'ALL' },
              { label: '小班课', value: 'SMALL_CLASS' },
              { label: '一对一/二/三', value: 'INTENSIVE' },
            ]}
          />
        </Space>

        <Card className="teacher-salary-today" styles={{ body: { padding: isMobile ? 18 : 22 } }}>
          <Text style={{ color: 'var(--color-ink-subtle)', fontSize: 13 }}>今日收入</Text>
          <div style={{ marginTop: 4, color: 'var(--color-ink)', fontSize: isMobile ? 30 : 34, lineHeight: 1.2, fontWeight: 760 }}>
            ¥{todayIncome.toFixed(2)}
          </div>
          <Text style={{ display: 'block', marginTop: 7, color: 'var(--color-ink-subtle)', fontSize: 12 }}>不随上方时间和课程类型筛选变化</Text>
        </Card>

        <div className="teacher-salary-summary-strip">
          {[
            ['当前筛选合计', data?.total ?? 0],
            ['小班课', data?.totalSmallClass ?? 0],
            ['一对一/二/三', data?.totalIntensive ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <Text>{label}</Text>
              <strong>¥{Number(value).toFixed(2)}</strong>
            </div>
          ))}
        </div>

        <TeacherTrendCharts attendanceWeekTrend={trendData?.attendanceWeekTrend} salaryTrend={trendData?.salaryTrend} />

        <Card title="薪资明细" bordered={false} style={{ borderRadius: 8 }} extra={<Text type="secondary" style={{ fontSize: 12 }}>考勤和课堂反馈自动结算</Text>}>
          {isMobile ? (
            isLoading ? <CardSkeleton rows={3} /> : (
              <div style={{ display: 'grid', gap: 16 }}>
                {mobileGroups.map(([dateKey, dayTransactions]) => (
                  <section key={dateKey}>
                    <div className="teacher-salary-date-heading">
                      <strong>{new Date(`${dateKey}T00:00:00`).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}</strong>
                      <span>¥{dayTransactions.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}</span>
                    </div>
                    <div className="teacher-salary-mobile-list">
                      {dayTransactions.map((transaction) => (
                        <div key={transaction.id}>
                          <div style={{ minWidth: 0 }}>
                            <Text strong>{TYPE_META[transaction.type]?.label ?? transaction.typeLabel ?? '其他调整'}</Text>
                            <Text type="secondary" ellipsis style={{ display: 'block', fontSize: 12 }}>{transaction.description || '-'}</Text>
                          </div>
                          {renderAmount(transaction.amount)}
                        </div>
                      ))}
                    </div>
                  </section>
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
