'use client'

import { Card, Empty, List, Typography } from 'antd'
import dynamic from 'next/dynamic'
import { useIsMobile } from '@/hooks/useIsMobile'
import { formatHours } from '@/lib/format'
import type { TeacherWorkload } from '@/types/dashboard'

const { Title, Text } = Typography
const ReactECharts = dynamic(() => import('echarts-for-react'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3', fontSize: 13 }}>
      图表加载中...
    </div>
  ),
})

export function TeacherWorkloadCard({ data }: { data: TeacherWorkload[] }) {
  const isMobile = useIsMobile() ?? false

  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 10, right: 40, bottom: 10, left: 100 },
    xAxis: { type: 'value', name: '课时' },
    yAxis: { type: 'category', data: data.map(d => d.name).reverse(), axisLabel: { fontSize: 12 } },
    series: [{
      type: 'bar',
      data: data.map(d => formatHours(d.hours)).reverse(),
      barWidth: 16,
      itemStyle: {
        borderRadius: [0, 4, 4, 0],
        color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#5e6ad2' }, { offset: 1, color: '#828fff' }] },
      },
      label: { show: true, position: 'right', fontSize: 12, color: '#d0d6e0' },
    }],
    animationDuration: 1200,
  }

  return (
    <Card bordered={false} style={{ borderRadius: 16, height: '100%' }}>
      <Title level={5} style={{ marginBottom: 16 }}>本月教师课时排行</Title>
      {data.length === 0 ? (
        <Empty description="本月暂无已结算课时数据" />
      ) : isMobile ? (
        <List
          dataSource={data}
          renderItem={(item, index) => (
            <List.Item style={{ padding: '10px 0' }}>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <Text strong>{index + 1}. {item.name}</Text>
                  <div style={{ fontSize: 12, color: '#8a7a68', marginTop: 2 }}>参与学生 {item.students} 人</div>
                </div>
                <Text style={{ color: '#E87545', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {formatHours(item.hours)} 课时
                </Text>
              </div>
            </List.Item>
          )}
        />
      ) : (
        <ReactECharts option={option} style={{ height: 280 }} />
      )}
    </Card>
  )
}
