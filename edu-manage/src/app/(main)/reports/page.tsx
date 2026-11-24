'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { Alert, Row, Col, Card, Segmented, DatePicker, Statistic, Button, Input, InputNumber, Select, Space, Table, Tag, Typography, Popconfirm, message } from 'antd'
import { DownloadOutlined, TeamOutlined, FileTextOutlined, TrophyOutlined, InteractionOutlined, ReloadOutlined } from '@ant-design/icons'
import dynamic from 'next/dynamic'
import { PageLayout } from '@/components/Layout/PageLayout'
import {
  buildFunnelOption,
  buildPaperMasteryOption,
  buildRetentionHeatmapOption,
  buildParentEngagementOption,
  buildFinanceOption,
  buildAttendanceDonutOption,
  buildGuideUsageOption,
} from './chartBuilders'
import { useIsMobile } from '@/hooks/useIsMobile'
import { useDivision } from '@/contexts/DivisionContext'
import { CardSkeleton } from '@/components/Parent/CardSkeleton'
import { OperatingOverview } from '@/components/Dashboard/OperatingOverview'
import { PeopleReports } from '@/components/Reports/PeopleReports'
import type { AdminDashboardData } from '@/types/dashboard'

const { RangePicker } = DatePicker
const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3', fontSize: 13 }}>
      图表加载中...
    </div>
  ),
})

interface ReportsData {
  kpi: { totalStudents: number; monthPapers: number; masteredRate: number; parentInteract: number }
  funnel: { status: string; count: number }[]
  paperMastery: { MASTERED: number; NEEDS_REVIEW: number; NEEDS_PRACTICE: number }
  weakTopics: { topic: string; count: number }[]
  retention: { month: string; rate: number }[]
  parentEngagement: { readRate: number; reactionRate: number; commentRate: number; replyRate: number }
  finance: { month: string; income: number; expense: number | null; profit: number | null }[]
  attendance: { attendanceRate: number; makeupCompleteRate: number }
  guideUsage: { action: string; count: number }[]
}
type ExpenseRow = { id: string; division: string; category: string; description: string; amount: number; occurredAt: string; notes: string | null }
type ExpenseData = { expenses: ExpenseRow[]; monthly: Array<{ month: string; amount: number }> }
type AttendanceAnalysisData = { trend: Array<{ week: string; present: number; absent: number; leave: number; total: number; attendanceRate: number }>; consecutiveAbsences: Array<{ studentId: string; studentName: string; groupName: string; division: string; streak: number; lastAbsentAt: string }> }
function todayDateInput() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }

async function fetcher(url: string): Promise<ReportsData> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('数据加载失败')
  return res.json()
}

const dashboardFetcher = async (url: string): Promise<AdminDashboardData> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('经营数据加载失败')
  return res.json()
}

async function downloadExcel(chartKey: string, period: string, from?: string, to?: string) {
  const params = new URLSearchParams({ period })
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const res = await fetch(`/api/reports/export/${chartKey}?${params}`)
  if (!res.ok) { message.error('导出失败'); return }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `牧哲学堂_${chartKey}-${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
  message.success('导出成功')
}

function ChartCard({ title, chartKey, period, from, to, children }: {
  title: string; chartKey: string; period: string; from?: string; to?: string; children: React.ReactNode
}) {
  const [exporting, setExporting] = useState(false)
  return (
    <Card
      bordered={false}
      style={{ borderRadius: 10, height: '100%' }}
      title={title}
      extra={
        <Button
          size="small"
          icon={<DownloadOutlined />}
          loading={exporting}
          onClick={async () => { setExporting(true); await downloadExcel(chartKey, period, from, to); setExporting(false) }}
        >
          导出Excel
        </Button>
      }
    >
      {children}
    </Card>
  )
}

export default function ReportsPage() {
  const isMobile = useIsMobile() ?? false
  const { division } = useDivision()
  const [period, setPeriod] = useState<string>('month')
  const [view, setView] = useState('overview')
  const [customRange, setCustomRange] = useState<[string, string] | null>(null)
  const [expenseCategory, setExpenseCategory] = useState('RENT')
  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseAmount, setExpenseAmount] = useState<number | null>(null)
  const [expenseDate, setExpenseDate] = useState(todayDateInput)
  const [expenseNotes, setExpenseNotes] = useState('')
  const [savingExpense, setSavingExpense] = useState(false)

  const queryParams = new URLSearchParams({ period })
  queryParams.set('division', division)
  if (period === 'custom' && customRange) {
    queryParams.set('from', customRange[0])
    queryParams.set('to', customRange[1])
  }

  const [refreshing, setRefreshing] = useState(false)
  const { data, isLoading, mutate: refreshReports } = useSWR(`/api/reports/summary?${queryParams}`, fetcher, { refreshInterval: 600_000 })
  const { data: expenseData, mutate: refreshExpenses } = useSWR<ExpenseData>(`/api/operating-expenses?division=${division}`, async (url: string) => { const r = await fetch(url); const d = await r.json(); if (!r.ok) throw new Error(d.error || '成本加载失败'); return d })
  const { data: attendanceAnalysis, mutate: refreshAttendance } = useSWR<AttendanceAnalysisData>(`/api/reports/attendance-analysis?division=${division}`, async (url: string) => { const r = await fetch(url); const d = await r.json(); if (!r.ok) throw new Error(d.error || '考勤趋势加载失败'); return d }, { refreshInterval: 600_000 })

  // 经营总览（原管理端首页组件，迁入数据报表页）：复用 /api/dashboard 实时口径
  const { data: adminData, mutate: refreshDashboard } = useSWR('/api/dashboard', dashboardFetcher, {
    refreshInterval: 600_000,
    revalidateOnFocus: true,
  })

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([
        refreshReports(),
        refreshExpenses(),
        refreshAttendance(),
        refreshDashboard(),
      ])
      message.success('报表数据已刷新')
    } finally {
      setRefreshing(false)
    }
  }

  const funnelOption = useMemo(() => data ? buildFunnelOption(data.funnel) : {}, [data])
  const masteryOption = useMemo(() => data ? buildPaperMasteryOption(data.paperMastery) : {}, [data])
  const retentionOption = useMemo(() => data ? buildRetentionHeatmapOption(data.retention) : {}, [data])
  const engagementOption = useMemo(() => data ? buildParentEngagementOption(data.parentEngagement) : {}, [data])
  const financeOption = useMemo(() => data ? buildFinanceOption(data.finance) : {}, [data])
  const attendanceOption = useMemo(() => data ? buildAttendanceDonutOption(data.attendance) : {}, [data])
  const guideOption = useMemo(() => data ? buildGuideUsageOption(data.guideUsage) : {}, [data])
  const attendanceTrendOption = useMemo(() => ({
    tooltip: { trigger: 'axis' },
    grid: { top: 18, right: 24, bottom: 36, left: 48 },
    xAxis: { type: 'category', data: (attendanceAnalysis?.trend || []).map(item => item.week), axisLabel: { color: '#5a4e3a' } },
    yAxis: { type: 'value', min: 0, max: 100, name: '出勤率 %', axisLabel: { color: '#5a4e3a' } },
    series: [{ name: '出勤率', type: 'line', smooth: true, data: (attendanceAnalysis?.trend || []).map(item => item.attendanceRate), itemStyle: { color: '#1D9E75' }, lineStyle: { color: '#1D9E75', width: 3 }, areaStyle: { color: 'rgba(29,158,117,.12)' } }],
  }), [attendanceAnalysis])

  const addExpense = async () => {
    if (!expenseDescription.trim() || !expenseAmount || expenseAmount <= 0 || !expenseDate) { message.error('请填写支出用途、金额和日期'); return }
    setSavingExpense(true)
    try {
      const r = await fetch(`/api/operating-expenses?division=${division}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: expenseCategory, description: expenseDescription.trim(), amount: expenseAmount, occurredAt: expenseDate, notes: expenseNotes }) })
      const d = await r.json(); if (!r.ok) throw new Error(d.error || '登记失败')
      setExpenseDescription(''); setExpenseAmount(null); setExpenseNotes(''); await refreshExpenses(); message.success('支出已登记')
    } catch (e) { message.error(e instanceof Error ? e.message : '登记失败') } finally { setSavingExpense(false) }
  }
  const removeExpense = async (id: string) => {
    try { const r = await fetch(`/api/operating-expenses?id=${encodeURIComponent(id)}&division=${division}`, { method: 'DELETE' }); const d = await r.json(); if (!r.ok) throw new Error(d.error || '删除失败'); await refreshExpenses(); message.success('记录已删除') }
    catch (e) { message.error(e instanceof Error ? e.message : '删除失败') }
  }

  if (isLoading) {
    return (
      <PageLayout
        title="数据报表"
        subtitle="学员分析、教学质量与财务统计"
        actions={<Button icon={<ReloadOutlined />} loading={refreshing} onClick={handleRefresh}>刷新</Button>}
      >
        <CardSkeleton rows={3} />
      </PageLayout>
    )
  }

  return (
    <PageLayout
      title="数据报表"
      subtitle="学员分析、教学质量与财务统计"
      actions={<Button icon={<ReloadOutlined />} loading={refreshing} onClick={handleRefresh}>刷新</Button>}
    >
      <Segmented
        options={[
          { label: '经营数据', value: 'overview' },
          { label: '教师 · 学生 · 家长登录', value: 'people' },
        ]}
        value={view}
        onChange={(val) => setView(val as string)}
        style={{ marginBottom: 16 }}
      />
      {view === 'people' ? (
        <PeopleReports />
      ) : (
        <>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <Segmented
          options={[
            { label: '本周', value: 'week' },
            { label: '本月', value: 'month' },
            { label: '本季度', value: 'quarter' },
            { label: '自定义', value: 'custom' },
          ]}
          value={period}
          onChange={(val) => setPeriod(val as string)}
        />
        {period === 'custom' && (
          <RangePicker
            onChange={(_, dateStrings) => setCustomRange(dateStrings as [string, string])}
          />
        )}
      </div>

      {data && (
        <>
          <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
            <Col xs={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 8 }}>
                <Statistic title="在读学员" value={data.kpi.totalStudents} prefix={<TeamOutlined />} suffix="人" />
              </Card>
            </Col>
            <Col xs={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 8 }}>
                <Statistic title="本月试卷" value={data.kpi.monthPapers} prefix={<FileTextOutlined />} suffix="份" />
              </Card>
            </Col>
            <Col xs={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 8 }}>
                <Statistic title="掌握率" value={data.kpi.masteredRate} prefix={<TrophyOutlined />} suffix="%" valueStyle={{ color: '#1D9E75' }} />
              </Card>
            </Col>
            <Col xs={12} lg={6}>
              <Card bordered={false} style={{ borderRadius: 8 }}>
                <Statistic title="家长互动率" value={data.kpi.parentInteract} prefix={<InteractionOutlined />} suffix="%" valueStyle={{ color: '#E8784A' }} />
              </Card>
            </Col>
          </Row>

          {adminData && (
            <div style={{ marginBottom: 12 }}>
              <OperatingOverview metrics={adminData.metrics} growthData={adminData.growthData} />
            </div>
          )}

          <Row gutter={[12, 12]}>
            <Col xs={24} lg={12}>
              <ChartCard title="学员入学转化漏斗" chartKey="funnel" period={period} from={customRange?.[0]} to={customRange?.[1]}>
                <ReactECharts option={funnelOption} style={{ height: isMobile ? 220 : 340 }} />
              </ChartCard>
            </Col>
            <Col xs={24} lg={12}>
              <ChartCard title="试卷掌握分布" chartKey="paper-mastery" period={period} from={customRange?.[0]} to={customRange?.[1]}>
                <ReactECharts option={masteryOption} style={{ height: isMobile ? 220 : 280 }} />
                {data.weakTopics.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#5a4e3a', marginBottom: 4 }}>薄弱知识点 TOP{data.weakTopics.length}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {data.weakTopics.map((w) => (
                        <span key={w.topic} style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(232,120,74,0.08)', color: '#E8784A', fontSize: 12 }}>
                          {w.topic} ({w.count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </ChartCard>
            </Col>
          </Row>

          <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
            <Col xs={24} lg={12}>
              <ChartCard title="月度留存率" chartKey="retention" period={period} from={customRange?.[0]} to={customRange?.[1]}>
                <ReactECharts option={retentionOption} style={{ height: 200 }} />
              </ChartCard>
            </Col>
            <Col xs={24} lg={12}>
              <ChartCard title="家长互动数据" chartKey="parent-engagement" period={period} from={customRange?.[0]} to={customRange?.[1]}>
                <ReactECharts option={engagementOption} style={{ height: isMobile ? 220 : 280 }} />
              </ChartCard>
            </Col>
          </Row>

          <div style={{ marginTop: 12 }}>
            <ChartCard title="收费收入趋势" chartKey="finance" period={period} from={customRange?.[0]} to={customRange?.[1]}>
              <Alert
                type="info"
                showIcon
                message="收入按已收费用统计；支出显示人工登记金额。成本录入可能不完整，因此暂不计算利润。"
                style={{ marginBottom: 12 }}
              />
              <ReactECharts option={financeOption} style={{ height: isMobile ? 220 : 320 }} />
              <Row gutter={[12, 12]} style={{ marginTop: 16 }}>
                <Col xs={24} xl={10}>
                  <Card size="small" title="登记经营支出" style={{ borderRadius: 10 }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Select value={expenseCategory} onChange={setExpenseCategory} options={[['RENT','房租'],['SALARY','工资'],['SUPPLIES','耗材'],['UTILITIES','水电'],['OTHER','其他']].map(([value,label])=>({value,label}))} />
                      <Input value={expenseDescription} onChange={e=>setExpenseDescription(e.target.value)} maxLength={120} placeholder="用途，例如：11月教室租金" />
                      <Space wrap>
                        <InputNumber min={0.01} max={100000000} precision={2} value={expenseAmount} onChange={setExpenseAmount} addonAfter="元" />
                        <Input type="date" value={expenseDate} onChange={e=>setExpenseDate(e.target.value)} />
                      </Space>
                      <Input.TextArea value={expenseNotes} onChange={e=>setExpenseNotes(e.target.value)} rows={2} maxLength={1000} placeholder="备注（选填）" />
                      <Button type="primary" loading={savingExpense} onClick={()=>void addExpense()}>保存支出</Button>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} xl={14}>
                  <Card size="small" title="近 12 个月已登记支出" style={{ borderRadius: 10 }}>
                    <Table size="small" rowKey="month" pagination={false} dataSource={expenseData?.monthly || []} columns={[{title:'月份',dataIndex:'month'},{title:'登记金额',dataIndex:'amount',render:(value:number)=>`¥${value.toLocaleString('zh-CN',{minimumFractionDigits:2})}`}]} locale={{emptyText:'暂无支出记录'}} />
                    <Typography.Text type="secondary">请持续登记房租、工资、耗材等；该汇总代表已录数据，不等同于完整成本。</Typography.Text>
                  </Card>
                </Col>
              </Row>
              {!!expenseData?.expenses.length && <Card size="small" title="最近支出记录" style={{ marginTop: 12, borderRadius: 10 }}>
                <Table size="small" rowKey="id" pagination={{pageSize:5}} dataSource={expenseData.expenses.slice(0,30)} columns={[
                  {title:'日期',dataIndex:'occurredAt',render:(value:string)=>value.slice(0,10)},
                  {title:'类别',dataIndex:'category',render:(value:string)=><Tag>{({RENT:'房租',SALARY:'工资',SUPPLIES:'耗材',UTILITIES:'水电',OTHER:'其他'} as Record<string,string>)[value] || value}</Tag>},
                  {title:'用途',dataIndex:'description'}, {title:'金额',dataIndex:'amount',render:(value:number)=>`¥${value.toLocaleString('zh-CN',{minimumFractionDigits:2})}`},
                  {title:'操作',key:'action',render:(_:unknown,row:ExpenseRow)=><Popconfirm title="删除这条支出记录？" onConfirm={()=>void removeExpense(row.id)}><Button danger size="small">删除</Button></Popconfirm>},
                ]} scroll={{x:620}} />
              </Card>}
            </ChartCard>
          </div>

          <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
            <Col xs={24} lg={12}>
              <ChartCard title="考勤与补课统计" chartKey="attendance" period={period} from={customRange?.[0]} to={customRange?.[1]}>
                <ReactECharts option={attendanceOption} style={{ height: isMobile ? 220 : 280 }} />
              </ChartCard>
            </Col>
            <Col xs={24} lg={12}>
              <ChartCard title="志愿填报服务使用" chartKey="guide-usage" period={period} from={customRange?.[0]} to={customRange?.[1]}>
                <ReactECharts option={guideOption} style={{ height: isMobile ? 220 : 280 }} />
              </ChartCard>
            </Col>
          </Row>
          <div style={{ marginTop: 12 }}>
            <Card title="出勤趋势与连续缺勤" bordered={false} style={{ borderRadius: 10 }}>
              <Alert type="info" showIcon message="按最近已登记考勤计算；连续缺勤按学生最近课次的考勤记录判断。" style={{ marginBottom: 12 }} />
              <ReactECharts option={attendanceTrendOption} style={{ height: isMobile ? 220 : 280 }} />
              {!!attendanceAnalysis?.consecutiveAbsences.length && <>
                <Alert type="warning" showIcon message={`有 ${attendanceAnalysis.consecutiveAbsences.length} 名学员连续缺勤达到 2 次，请及时联系家长。`} style={{ margin: '8px 0 12px' }} />
                <Table size="small" rowKey="studentId" pagination={{pageSize:5}} dataSource={attendanceAnalysis.consecutiveAbsences} columns={[
                  {title:'学员',dataIndex:'studentName'}, {title:'学部',dataIndex:'division',render:(value:string)=>value==='SENIOR'?'高中部':'初中部'}, {title:'班级',dataIndex:'groupName'}, {title:'连续缺勤',dataIndex:'streak',render:(value:number)=><Tag color="red">{value} 次</Tag>}, {title:'最近缺勤',dataIndex:'lastAbsentAt',render:(value:string)=>new Date(value).toLocaleDateString('zh-CN')},
                ]} />
              </>}
            </Card>
          </div>
        </>
      )}
        </>
      )}
    </PageLayout>
  )
}
