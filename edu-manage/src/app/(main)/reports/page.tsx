'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { Row, Col, Card, Segmented, DatePicker, Statistic, Button, Spin, message } from 'antd'
import { DownloadOutlined, TeamOutlined, FileTextOutlined, TrophyOutlined, InteractionOutlined } from '@ant-design/icons'
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
  finance: { month: string; income: number; expense: number; profit: number }[]
  attendance: { attendanceRate: number; makeupCompleteRate: number }
  guideUsage: { action: string; count: number }[]
}

async function fetcher(url: string): Promise<ReportsData> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('数据加载失败')
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
  a.download = `${chartKey}-${new Date().toISOString().slice(0, 10)}.xlsx`
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
  const [period, setPeriod] = useState<string>('month')
  const [customRange, setCustomRange] = useState<[string, string] | null>(null)

  const queryParams = new URLSearchParams({ period })
  if (period === 'custom' && customRange) {
    queryParams.set('from', customRange[0])
    queryParams.set('to', customRange[1])
  }

  const { data, isLoading } = useSWR(`/api/reports/summary?${queryParams}`, fetcher, { refreshInterval: 600_000 })

  const funnelOption = useMemo(() => data ? buildFunnelOption(data.funnel) : {}, [data])
  const masteryOption = useMemo(() => data ? buildPaperMasteryOption(data.paperMastery) : {}, [data])
  const retentionOption = useMemo(() => data ? buildRetentionHeatmapOption(data.retention) : {}, [data])
  const engagementOption = useMemo(() => data ? buildParentEngagementOption(data.parentEngagement) : {}, [data])
  const financeOption = useMemo(() => data ? buildFinanceOption(data.finance) : {}, [data])
  const attendanceOption = useMemo(() => data ? buildAttendanceDonutOption(data.attendance) : {}, [data])
  const guideOption = useMemo(() => data ? buildGuideUsageOption(data.guideUsage) : {}, [data])

  if (isLoading) {
    return (
      <PageLayout title="数据报表" subtitle="学员分析、教学质量与财务统计">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 120 }}><Spin size="large" /></div>
      </PageLayout>
    )
  }

  return (
    <PageLayout title="数据报表" subtitle="学员分析、教学质量与财务统计">
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
            <ChartCard title="财务收支分析" chartKey="finance" period={period} from={customRange?.[0]} to={customRange?.[1]}>
              <ReactECharts option={financeOption} style={{ height: isMobile ? 220 : 320 }} />
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
        </>
      )}
    </PageLayout>
  )
}
