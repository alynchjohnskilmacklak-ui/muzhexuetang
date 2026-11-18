'use client'

import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { Alert, Button, Card, Empty, Pagination, Segmented, Space, Table, Tag, Typography } from 'antd'
import { CheckCircleOutlined } from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { TeacherTrendCharts } from '@/components/teacher/TeacherTrendCharts'

const { Text, Title } = Typography

const fetcher = async (url: string) => {
  const response = await fetch(url)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || '薪资加载失败，请稍后重试')
  return payload
}

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
  SALARY_SETTLEMENT: { color: '#C9A45C', label: '工资结算' },
  manual_adjust: { color: '#7A6F5F', label: '月结调整' },
}

interface SalaryTransaction {
  id: string
  type: string
  salaryBucket: 'SMALL_CLASS' | 'INTENSIVE'
  typeLabel?: string
  amount: number
  description?: string | null
  lessonDate?: string | null
  settledAt?: string | null
  createdAt: string
}

interface SalaryPayload {
  total: number
  totalSmallClass: number
  totalIntensive: number
  totalLesson: number
  totalFeedback: number
  totalAdjustment: number
  settled?: { amount: number; at: string; description?: string | null } | null
  transactions: SalaryTransaction[]
}

export default function TeacherSalaryPage() {
  const isMobile = useIsMobile() ?? false
  const [period, setPeriod] = useState('month')
  const [salaryBucket, setSalaryBucket] = useState<'ALL' | 'SMALL_CLASS' | 'INTENSIVE'>('ALL')
  const [mobilePage, setMobilePage] = useState(1)
  const MOBILE_PAGE_SIZE = 4
  const { data, error, isLoading, mutate } = useSWR<SalaryPayload>(`/api/teacher/salary?period=${period}`, fetcher, { refreshInterval: 30_000, revalidateOnFocus: true, revalidateOnReconnect: true })
  // 教学与收入趋势（到课率 + 近 6 月课时/课时费），口径与教师首页一致
  const { data: trendData } = useSWR<{ attendanceWeekTrend: Array<{ label: string; rate: number }>; salaryTrend: Array<{ label: string; hours: number; pay: number }> }>('/api/teacher/trends', fetcher)
  const transactions = (data?.transactions ?? []).filter((item) => (
    item.type !== 'SALARY_SETTLEMENT' && (salaryBucket === 'ALL' || item.salaryBucket === salaryBucket)
  ))
  const todayKey = new Date().toLocaleDateString('sv-SE')
  const todayIncome = useMemo(() => (data?.transactions ?? []).reduce((sum, item) => {
    if (item.type === 'SALARY_SETTLEMENT') return sum
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

  const mobilePageGroups = useMemo(() => {
    const start = (mobilePage - 1) * MOBILE_PAGE_SIZE
    return mobileGroups.slice(start, start + MOBILE_PAGE_SIZE)
  }, [mobileGroups, mobilePage])

  useEffect(() => {
    setMobilePage(1)
  }, [transactions.length, period, salaryBucket])

  const renderAmount = (value: number, showHint = true) => (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, lineHeight: 1.35 }}>
      <Text strong style={{ color: value >= 0 ? '#1D9E75' : '#C0392B', whiteSpace: 'nowrap' }}>
        {value >= 0 ? '+' : '−'}¥{Math.abs(value).toFixed(2)}
      </Text>
      {value < 0 && showHint && (
        <Text style={{ fontSize: 10.5, color: '#C0392B', lineHeight: 1.4, whiteSpace: 'nowrap' }}>月结扣回</Text>
      )}
    </span>
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
      width: 110,
      align: 'right' as const,
      render: (value: number) => renderAmount(value, true),
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>我的薪资</Title>
      {error && <Alert type="error" showIcon message="薪资数据加载失败" description={error.message} action={<Button onClick={() => mutate()}>重试</Button>} style={{ marginBottom: 12 }} />}

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
          <Text style={{ color: 'var(--color-ink-subtle)', fontSize: 13 }}>今日产生（含已结算）</Text>
          <div style={{ marginTop: 4, color: 'var(--color-ink)', fontSize: isMobile ? 30 : 34, lineHeight: 1.2, fontWeight: 760 }}>
            ¥{todayIncome.toFixed(2)}
          </div>
          <Text style={{ display: 'block', marginTop: 7, color: 'var(--color-ink-subtle)', fontSize: 12 }}>不随上方时间和课程类型筛选变化</Text>
        </Card>

        <div className="teacher-salary-summary-strip">
          {[
             ['当前待结算余额', data?.total ?? 0],
            ['小班课', data?.totalSmallClass ?? 0],
            ['一对一/二/三', data?.totalIntensive ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <Text>{label}</Text>
              <strong style={{ color: Number(value) < 0 ? '#C0392B' : undefined }}>
                {Number(value) < 0 ? `−¥${Math.abs(Number(value)).toFixed(2)}` : `¥${Number(value).toFixed(2)}`}
              </strong>
            </div>
          ))}
        </div>
        {(data?.total ?? 0) < 0 && (
          <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
            当前待结算余额为负数，请在薪资明细中核对调整记录，并联系管理员确认原因。
          </Text>
        )}

        {data?.settled ? (
          <div style={{ borderRadius: 12, padding: '11px 14px', background: 'rgba(201,164,92,.1)', border: '1px solid rgba(201,164,92,.4)', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <CheckCircleOutlined style={{ color: '#B98A2F', fontSize: 17, marginTop: 1 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 750, color: '#8A6B2F' }}>最近结算 ¥{data.settled.amount.toFixed(2)}</div>
              <div style={{ fontSize: 11.5, color: '#A08A5C', marginTop: 2 }}>
                {new Date(data.settled.at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })} · {data.settled.description || '工资结算'}
              </div>
            </div>
          </div>
        ) : null}

        <TeacherTrendCharts attendanceWeekTrend={trendData?.attendanceWeekTrend} salaryTrend={trendData?.salaryTrend} />

        <Card className="teacher-salary-detail-card" title="薪资明细" bordered={false} style={{ borderRadius: 8, minWidth: 0 }} extra={<Text type="secondary" style={{ fontSize: 12 }}>考勤和课堂反馈自动结算</Text>}>
          {isMobile ? (
            isLoading ? <CardSkeleton rows={3} /> : (
              <div style={{ display: 'grid', gap: 16 }}>
                {mobilePageGroups.map(([dateKey, dayTransactions]) => (
                  <section key={dateKey} style={{ minWidth: 0 }}>
                    <div className="teacher-salary-date-heading">
                      <strong>{new Date(`${dateKey}T00:00:00`).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}</strong>
                      <span style={{ color: dayTransactions.reduce((sum, item) => sum + item.amount, 0) < 0 ? '#C0392B' : undefined }}>
                        ¥{dayTransactions.reduce((sum, item) => sum + item.amount, 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="teacher-salary-mobile-list">
                      {dayTransactions.map((transaction) => (
                        <div key={transaction.id}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <Text strong>{TYPE_META[transaction.type]?.label ?? transaction.typeLabel ?? '其他调整'}</Text>
                            <Text type="secondary" ellipsis style={{ display: 'block', fontSize: 12 }}>
                              {transaction.description || (transaction.amount < 0 ? '本月结算扣回，冲抵上月多发部分' : '-')}
                            </Text>
                          </div>
                          {renderAmount(transaction.amount)}
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
                {!transactions.length && <Empty description="暂无薪资记录" />}
                {transactions.length > 0 && mobileGroups.length > MOBILE_PAGE_SIZE && (
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Pagination
                      simple
                      size="small"
                      current={mobilePage}
                      pageSize={MOBILE_PAGE_SIZE}
                      total={mobileGroups.length}
                      onChange={setMobilePage}
                    />
                  </div>
                )}
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
              scroll={{ x: 860 }}
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
