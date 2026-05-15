'use client'

import { Card, Row, Col, Statistic, Badge, Progress } from 'antd'
import { UserOutlined, BookOutlined, DollarOutlined, ExclamationCircleOutlined, ArrowUpOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import type { DashboardMetrics } from '@/lib/mock-data'

export function MetricsCards({ data }: { data: DashboardMetrics }) {
  const trendOption = {
    grid: { top: 5, right: 5, bottom: 5, left: 5 },
    xAxis: { show: false, data: ['', '', '', '', '', ''] },
    yAxis: { show: false, min: 'dataMin' },
    series: [{
      type: 'line',
      data: data.revenueTrend,
      smooth: true,
      showSymbol: false,
      lineStyle: { color: '#52c41a', width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(82,196,26,0.2)' }, { offset: 1, color: 'rgba(82,196,26,0)' }] } },
    }],
  }

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card bordered={false} style={{ borderRadius: 8 }}>
          <Statistic
            title="在读学员数"
            value={data.activeStudents}
            prefix={<UserOutlined />}
            suffix={
              <span style={{ fontSize: 14, color: '#52c41a' }}>
                <ArrowUpOutlined /> {data.studentGrowth}%
              </span>
            }
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card bordered={false} style={{ borderRadius: 8 }}>
          <Statistic
            title="本月课耗"
            value={data.monthlyHours}
            prefix={<BookOutlined />}
            suffix="课时"
          />
          <Progress percent={data.hoursProgress} size="small" strokeColor="#1677ff" style={{ marginTop: 8 }} />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card bordered={false} style={{ borderRadius: 8 }}>
          <Statistic
            title="本月收入"
            value={data.monthlyRevenue}
            prefix={<DollarOutlined />}
            suffix="元"
          />
          <div style={{ height: 40, marginTop: 4 }}>
            <ReactECharts option={trendOption} style={{ height: '100%' }} />
          </div>
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card bordered={false} style={{ borderRadius: 8 }}>
          <Statistic
            title="待处理事项"
            value={data.pendingTasks}
            prefix={<ExclamationCircleOutlined />}
            suffix={
              data.pendingTasksUrgent > 0 ? (
                <Badge count={`${data.pendingTasksUrgent}项紧急`} style={{ backgroundColor: '#ff4d4f' }} />
              ) : undefined
            }
          />
        </Card>
      </Col>
    </Row>
  )
}
