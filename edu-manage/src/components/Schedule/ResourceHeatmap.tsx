'use client'

import { Card, Typography } from 'antd'
import dynamic from 'next/dynamic'

const { Title } = Typography
const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3', fontSize: 13 }}>
      图表加载中...
    </div>
  ),
})

export function ResourceHeatmap() {
  const rooms = ['琴房A', '教室201', '教室302', '机房B', '画室', '教室101']
  const hours = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']
  const data = [
    [0, 0, 5], [0, 1, 8], [0, 2, 2], [0, 6, 6], [0, 7, 9],
    [1, 1, 6], [1, 2, 8], [1, 3, 5], [1, 7, 7], [1, 8, 3],
    [2, 0, 4], [2, 1, 7], [2, 4, 8], [2, 5, 6], [2, 9, 5],
    [3, 2, 5], [3, 3, 9], [3, 4, 7], [3, 8, 6], [3, 9, 8],
    [4, 0, 3], [4, 5, 5], [4, 6, 8], [4, 7, 7], [4, 10, 4],
    [5, 1, 4], [5, 2, 6], [5, 3, 5], [5, 8, 9], [5, 9, 7],
  ]

  const option = {
    tooltip: { position: 'top' },
    grid: { top: 10, right: 20, bottom: 30, left: 70 },
    xAxis: { type: 'category', data: hours, splitArea: { show: true }, axisLabel: { fontSize: 11 } },
    yAxis: { type: 'category', data: rooms, splitArea: { show: true }, axisLabel: { fontSize: 11 } },
    visualMap: { min: 0, max: 10, calculable: true, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#1a1a2e', '#2d2d5e', '#E8784A', '#828fff', '#bae0ff'] } },
    series: [{
      type: 'heatmap',
      data: data,
      label: { show: true, fontSize: 11 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
    }],
  }

  return (
    <Card bordered={false} style={{ borderRadius: 8 }}>
      <Title level={5} style={{ marginBottom: 16 }}>教室资源热力图（繁忙度）</Title>
      <ReactECharts option={option} style={{ height: 250 }} />
    </Card>
  )
}
