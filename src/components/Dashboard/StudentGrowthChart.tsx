'use client'

import { Card, Typography } from 'antd'
import ReactECharts from 'echarts-for-react'
import type { StudentGrowthData } from '@/lib/mock-data'

const { Title } = Typography

export function StudentGrowthChart({ data }: { data: StudentGrowthData }) {
  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    legend: { data: ['学员总数', '新增学员', '课时消耗'], bottom: 0 },
    grid: { top: 20, right: 60, bottom: 40, left: 60 },
    xAxis: { type: 'category', data: data.months, axisLabel: { rotate: 0 } },
    yAxis: [
      { type: 'value', name: '人数', min: 0 },
      { type: 'value', name: '课时', min: 0 },
    ],
    series: [
      {
        name: '学员总数',
        type: 'line',
        data: data.totalStudents,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { color: '#1677ff', width: 3 },
        itemStyle: { color: '#1677ff' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(22,119,255,0.15)' }, { offset: 1, color: 'rgba(22,119,255,0)' }] } },
      },
      {
        name: '新增学员',
        type: 'bar',
        data: data.newStudents,
        barWidth: 20,
        itemStyle: { color: '#91caff', borderRadius: [4, 4, 0, 0] },
      },
      {
        name: '课时消耗',
        type: 'line',
        yAxisIndex: 1,
        data: data.classHours,
        smooth: true,
        symbol: 'diamond',
        symbolSize: 8,
        lineStyle: { color: '#ff7a45', width: 2, type: 'dashed' },
        itemStyle: { color: '#ff7a45' },
      },
    ],
    animationDuration: 1500,
    animationEasing: 'cubicOut',
  }

  return (
    <Card bordered={false} style={{ borderRadius: 8, height: '100%' }}>
      <Title level={5} style={{ marginBottom: 16 }}>学员增长与课时趋势</Title>
      <ReactECharts option={option} style={{ height: 320 }} />
    </Card>
  )
}
