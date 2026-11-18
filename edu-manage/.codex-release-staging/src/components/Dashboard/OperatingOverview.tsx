'use client'

import { Card, Progress, Typography } from 'antd'
import { AreaChartOutlined, RiseOutlined, TeamOutlined, WarningOutlined } from '@ant-design/icons'
import dynamic from 'next/dynamic'
import { useIsMobile } from '@/hooks/useIsMobile'
import { formatHours } from '@/lib/format'
import type { AdminDashboardMetrics, StudentGrowthData } from '@/types/dashboard'

const { Text } = Typography

const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3', fontSize: 13 }}>
      图表加载中...
    </div>
  ),
})

export interface OperatingOverviewProps {
  metrics: AdminDashboardMetrics
  growthData: StudentGrowthData
}

export function OperatingOverview({ metrics, growthData }: OperatingOverviewProps) {
  const isMobile = useIsMobile() ?? false
  const latestNewStudents = growthData.newStudents.length ? growthData.newStudents[growthData.newStudents.length - 1] : 0
  const latestTotalStudents = growthData.totalStudents.length ? growthData.totalStudents[growthData.totalStudents.length - 1] : metrics.activeStudents

  const hourOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis' as const,
      triggerOn: 'click' as const,
      renderMode: 'richText' as const,
      confine: true,
      textStyle: { fontSize: 11, lineHeight: 15 },
      padding: [6, 8],
    },
    grid: { left: 8, right: 8, top: 18, bottom: 6, containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: ['排课课时', '消耗课时'],
      axisLabel: { color: '#9A8E7A', fontSize: isMobile ? 10.5 : 11 },
      axisLine: { lineStyle: { color: 'rgba(0,0,0,.08)' } },
    },
    yAxis: {
      type: 'value' as const,
      name: '小时',
      nameTextStyle: { color: '#9A8E7A', fontSize: 10 },
      axisLabel: { color: '#9A8E7A', fontSize: isMobile ? 10 : 11 },
      splitLine: { lineStyle: { color: 'rgba(0,0,0,.05)' } },
      min: 0,
      splitNumber: 4,
    },
    series: [
      {
        name: '本月课时',
        type: 'bar' as const,
        barWidth: isMobile ? 22 : 28,
        barMaxWidth: 34,
        data: [
          { value: metrics.monthlyScheduledHours, itemStyle: { color: '#185FA5', borderRadius: [4, 4, 0, 0] } },
          { value: metrics.monthlyDeductedHours, itemStyle: { color: '#E8784A', borderRadius: [4, 4, 0, 0] } },
        ],
        label: { show: true, position: 'top' as const, color: '#1A1201', fontSize: isMobile ? 10.5 : 11, formatter: (params: { value: number }) => formatHours(params.value) },
      },
    ],
  }

  return (
    <Card
      bordered={false}
      style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)' }}
      styles={{ body: { padding: isMobile ? 14 : 18 } }}
      title={(
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 30, height: 30, borderRadius: 10, background: '#EAF1F9', color: '#185FA5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
            <AreaChartOutlined />
          </span>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: '#1A1201' }}>经营总览</span>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>本月实时数据</Text>
        </span>
      )}
      extra={<Text type="secondary" style={{ fontSize: 12 }}>30 秒自动刷新</Text>}
    >
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr 1fr', gap: 16, alignItems: 'stretch' }}>
        {/* 课时消耗进度 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#FAF8F5', borderRadius: 12, padding: '14px 10px', border: '1px solid #F0E7DE' }}>
          <Progress
            type="circle"
            percent={metrics.hoursProgress}
            size={isMobile ? 112 : 120}
            strokeColor={{ '0%': '#E8784A', '100%': '#1D9E75' }}
            trailColor="#F0E7DE"
            format={(percent) => (
              <span style={{ fontSize: 22, fontWeight: 800, color: '#1A1201' }}>{percent}<span style={{ fontSize: 12 }}>%</span></span>
            )}
          />
          <div style={{ fontSize: 12, color: '#9A8E7A', textAlign: 'center', lineHeight: 1.6 }}>
            本月课时完成进度
            <br />
            <Text style={{ color: '#5A4E3A', fontWeight: 600 }}>{formatHours(metrics.monthlyDeductedHours)} / {formatHours(metrics.monthlyScheduledHours)}</Text>
          </div>
        </div>

        {/* 排课 vs 消耗 */}
        <div style={{ background: '#FAF8F5', borderRadius: 12, padding: '10px 12px', border: '1px solid #F0E7DE', minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#5A4E3A', marginBottom: 6 }}>课时消耗对比</div>
          <div style={{ height: isMobile ? 200 : 220 }}>
            <ReactECharts option={hourOption} style={{ height: '100%', width: '100%' }} notMerge lazyUpdate />
          </div>
          <div style={{ fontSize: 12, color: '#9A8E7A', marginTop: 4, lineHeight: 1.6 }}>
            消耗课时 = 已实际扣减的课时，反映本月真实上课消化进度。
          </div>
        </div>

        {/* 关键运营指标 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { icon: <TeamOutlined />, color: '#E8784A', label: '在读学员', value: `${metrics.activeStudents}人` },
            { icon: <RiseOutlined />, color: '#1D9E75', label: '本月新增', value: `${latestNewStudents}人` },
            { icon: <WarningOutlined />, color: '#C77F00', label: '续费预警', value: `${metrics.renewalWarnings}人` },
            { icon: <AreaChartOutlined />, color: '#185FA5', label: '今日课次', value: `${metrics.todayLessons}节` },
          ].map((item) => (
            <div key={item.label} style={{ background: '#fff', borderRadius: 12, padding: '12px 10px', border: '1px solid #F0E7DE', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: `${item.color}14`, color: item.color, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
              <div style={{ color: item.color, fontWeight: 800, fontSize: isMobile ? 18 : 20, marginTop: 6, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{item.value}</div>
              <div style={{ fontSize: 12, color: '#9A8E7A', marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
