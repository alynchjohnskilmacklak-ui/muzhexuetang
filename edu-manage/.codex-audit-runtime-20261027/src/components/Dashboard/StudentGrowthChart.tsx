'use client'

import { Card, Typography } from 'antd'
import dynamic from 'next/dynamic'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { StudentGrowthData } from '@/types/dashboard'

const { Title, Text } = Typography
const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3', fontSize: 13 }}>
      图表加载中...
    </div>
  ),
})

const CHART_COLORS = {
  students: '#E8784A',
  newStudents: '#1D9E75',
  hours: '#f5a623',
}

export function StudentGrowthChart({ data }: { data: StudentGrowthData }) {
  const isMobile = useIsMobile() ?? false
  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: {
      data: ['学员总数', '新增学员', '排课课时'],
      bottom: 0,
      textStyle: { color: '#5a4e3a' },
    },
    grid: { top: 24, right: isMobile ? 18 : 48, bottom: 42, left: isMobile ? 36 : 54 },
    xAxis: { type: 'category', data: data.months, axisLabel: { rotate: isMobile ? 30 : 0, color: '#5a4e3a', fontSize: 11 } },
    yAxis: [
      { type: 'value', name: '人数', min: 0, nameTextStyle: { color: '#5a4e3a' }, axisLabel: { color: '#5a4e3a' } },
      { type: 'value', name: '课时', min: 0, nameTextStyle: { color: '#5a4e3a' }, axisLabel: { color: '#5a4e3a' } },
    ],
    color: [CHART_COLORS.students, CHART_COLORS.newStudents, CHART_COLORS.hours],
    series: [
      {
        name: '学员总数',
        type: 'line',
        data: data.totalStudents,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: CHART_COLORS.students, width: 3 },
        itemStyle: { color: CHART_COLORS.students },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(232,120,74,0.12)' }, { offset: 1, color: 'rgba(232,120,74,0)' }] } },
      },
      {
        name: '新增学员',
        type: 'bar',
        data: data.newStudents,
        barWidth: 20,
        itemStyle: { color: CHART_COLORS.newStudents, borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '排课课时',
        type: 'line',
        yAxisIndex: 1,
        data: data.classHours,
        smooth: true,
        symbol: 'diamond',
        symbolSize: 8,
        lineStyle: { color: CHART_COLORS.hours, width: 2, type: 'dashed' },
        itemStyle: { color: CHART_COLORS.hours },
      },
    ],
    animationDuration: 900,
    animationEasing: 'cubicOut',
  }

  return (
    <Card bordered={false} style={{ borderRadius: 16, height: '100%' }}>
      <Title level={5} style={{ marginBottom: 4 }}>学员增长与课时趋势</Title>
      <Text type="secondary" style={{ fontSize: 12 }}>近 6 个月学员规模与课程安排变化</Text>
      <ReactECharts option={option} style={{ height: isMobile ? 260 : 320, marginTop: 8 }} />
    </Card>
  )
}
