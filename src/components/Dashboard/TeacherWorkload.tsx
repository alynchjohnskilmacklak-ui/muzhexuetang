'use client'

import { Card, Typography } from 'antd'
import ReactECharts from 'echarts-for-react'
import type { TeacherWorkload } from '@/lib/mock-data'

const { Title } = Typography

export function TeacherWorkloadCard({ data }: { data: TeacherWorkload[] }) {
  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 10, right: 40, bottom: 10, left: 100 },
    xAxis: { type: 'value', name: '课时' },
    yAxis: { type: 'category', data: data.map(d => d.name).reverse(), axisLabel: { fontSize: 12 } },
    series: [{
      type: 'bar',
      data: data.map(d => d.hours).reverse(),
      barWidth: 16,
      itemStyle: {
        borderRadius: [0, 4, 4, 0],
        color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#1677ff' }, { offset: 1, color: '#69b1ff' }] },
      },
      label: { show: true, position: 'right', fontSize: 12, color: '#595959' },
    }],
    animationDuration: 1200,
  }

  return (
    <Card bordered={false} style={{ borderRadius: 8, height: '100%' }}>
      <Title level={5} style={{ marginBottom: 16 }}>教师工作量排行</Title>
      <ReactECharts option={option} style={{ height: 280 }} />
    </Card>
  )
}
