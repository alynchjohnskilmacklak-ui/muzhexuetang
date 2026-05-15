'use client'

import { useState, useEffect } from 'react'
import { Row, Col, Card, Typography, Button, Segmented, Spin, message } from 'antd'
import { DownloadOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { funnelOption, retentionOption, pieOption, teacherBarOption, financeOption, payDistOption } from './chartOptions'

const { Title } = Typography

type TimeRange = 'week' | 'month' | 'quarter' | 'custom'

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  const handleExport = (name: string) => {
    message.success(name + '数据已导出为Excel')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>数据分析 BI 看板</Title>
        <Segmented
          options={[
            { value: 'week', label: '本周' },
            { value: 'month', label: '本月' },
            { value: 'quarter', label: '本季度' },
            { value: 'custom', label: '自定义' },
          ]}
          value={timeRange}
          onChange={(v) => setTimeRange(v as TimeRange)}
        />
      </div>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card bordered={false} style={{ borderRadius: 8 }} title="学员入学漏斗" extra={<Button size="small" icon={<DownloadOutlined />} onClick={() => handleExport('漏斗图')}>导出Excel</Button>}>
            <ReactECharts option={funnelOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card bordered={false} style={{ borderRadius: 8 }} title="月度留存率热力图" extra={<Button size="small" icon={<DownloadOutlined />} onClick={() => handleExport('留存率')}>导出Excel</Button>}>
            <ReactECharts option={retentionOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card bordered={false} style={{ borderRadius: 8 }} title="各科目课时占比" extra={<Button size="small" icon={<DownloadOutlined />} onClick={() => handleExport('课时占比')}>导出Excel</Button>}>
            <ReactECharts option={pieOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card bordered={false} style={{ borderRadius: 8 }} title="各教师课时量排行" extra={<Button size="small" icon={<DownloadOutlined />} onClick={() => handleExport('教师排行')}>导出Excel</Button>}>
            <ReactECharts option={teacherBarOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col span={24}>
          <Card bordered={false} style={{ borderRadius: 8 }} title="财务分析" extra={<Button size="small" icon={<DownloadOutlined />} onClick={() => handleExport('财务分析')}>导出Excel</Button>}>
            <ReactECharts option={financeOption} style={{ height: 360 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card bordered={false} style={{ borderRadius: 8 }} title="收费方式分布" extra={<Button size="small" icon={<DownloadOutlined />} onClick={() => handleExport('收费方式')}>导出Excel</Button>}>
            <ReactECharts option={payDistOption} style={{ height: 280 }} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
