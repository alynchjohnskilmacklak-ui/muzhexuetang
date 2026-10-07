'use client'

import { useMemo } from 'react'
import useSWR from 'swr'
import { Row, Col, Card, Statistic, Table, Tabs, Typography, Empty } from 'antd'
import {
  TeamOutlined,
  UserOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  LoginOutlined,
  CalendarOutlined,
} from '@ant-design/icons'
import dynamic from 'next/dynamic'
import { useDivision } from '@/contexts/DivisionContext'
import { useIsMobile } from '@/hooks/useIsMobile'

const { Text } = Typography
const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false })

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error('数据加载失败')
  return r.json()
})

const axisTheme = {
  color: '#62666d',
  splitLine: { lineStyle: { color: '#EEEAE2' } },
  axisLine: { lineStyle: { color: '#E4DED2' } },
  axisLabel: { color: '#62666d', fontSize: 11 },
}

function CardSkeleton() {
  return <Card loading style={{ minHeight: 260 }} />
}

function kpiCard(icon: React.ReactNode, title: string, value: number | string, suffix?: string) {
  return (
    <Card style={{ borderRadius: 12 }}>
      <Statistic title={title} value={value as number} suffix={suffix} prefix={icon} valueStyle={{ color: '#1F2329' }} />
    </Card>
  )
}

/* ---------- 教师报表 ---------- */
function TeacherTab({ division }: { division: string }) {
  const { data, error, isLoading } = useSWR(`/api/reports/teachers?division=${division}`, fetcher)

  const barOption = useMemo(() => {
    const subjectHours = data?.subjectHours || {}
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: Object.keys(subjectHours), ...axisTheme },
      yAxis: { type: 'value', name: '课时', ...axisTheme },
      series: [{
        name: '月课时',
        type: 'bar',
        data: Object.values(subjectHours),
        itemStyle: { color: '#E8784A', borderRadius: [6, 6, 0, 0] },
        barMaxWidth: 32,
      }],
    }
  }, [data])

  if (isLoading) return <CardSkeleton />
  if (error) return <Card><Empty description="教师数据加载失败" /></Card>
  if (!data) return null

  const columns = [
    { title: '教师', dataIndex: 'name', key: 'name', fixed: 'left' as const, render: (v: string) => <Text strong>{v}</Text> },
    { title: '学科', dataIndex: 'subjects', key: 'subjects', render: (v: string[]) => v.join('、') || '未设置' },
    { title: '类型', dataIndex: 'employmentType', key: 'employmentType', render: (v: string) => (v === 'FULL_TIME' ? '全职' : '兼职') },
    { title: '月课时', dataIndex: 'monthlyHours', key: 'monthlyHours', render: (v: number) => `${v} 课时` },
    { title: '学员数', dataIndex: 'studentCount', key: 'studentCount', render: (v: number) => `${v} 人` },
    { title: '本月反馈', dataIndex: 'monthFeedback', key: 'monthFeedback', render: (v: number) => `${v} 条` },
    { title: '评分', dataIndex: 'rating', key: 'rating', render: (v: number) => '⭐'.repeat(Math.max(0, Math.round(v || 0))) || '-' },
  ]

  return (
    <>
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={12} sm={8} md={4}>{kpiCard(<TeamOutlined />, '教师总数', data.summary.total, '人')}</Col>
        <Col xs={12} sm={8} md={4}>{kpiCard(<TrophyOutlined />, '全职', data.summary.fullTime, '人')}</Col>
        <Col xs={12} sm={8} md={4}>{kpiCard(<UserOutlined />, '兼职', data.summary.partTime, '人')}</Col>
        <Col xs={12} sm={8} md={4}>{kpiCard(<TrophyOutlined />, '平均评分', Number(data.summary.avgRating.toFixed(1)), '分')}</Col>
        <Col xs={12} sm={8} md={4}>{kpiCard(<ClockCircleOutlined />, '月总课时', data.summary.totalMonthlyHours, '课时')}</Col>
        {data.summary.termName && <Col xs={24} sm={8} md={4}><Card style={{ borderRadius: 12 }}><Text type="secondary" style={{ fontSize: 12 }}>统计批次</Text><Text strong style={{ display: 'block', fontSize: 15 }}>{data.summary.termName}</Text></Card></Col>}
      </Row>
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} lg={10}>
          <Card title="各学科月课时" style={{ borderRadius: 12 }}>
            <ReactECharts option={barOption} style={{ height: 260 }} notMerge />
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="教师课时排行" style={{ borderRadius: 12 }}>
            <Table
              rowKey="id"
              size="small"
              dataSource={data.rows}
              columns={columns}
              pagination={{ pageSize: 8, hideOnSinglePage: true }}
              scroll={{ x: 640 }}
            />
          </Card>
        </Col>
      </Row>
    </>
  )
}

/* ---------- 学生报表 ---------- */
function StudentTab({ division }: { division: string }) {
  const { data, error, isLoading } = useSWR(`/api/reports/students?division=${division}`, fetcher)

  const barOption = useMemo(() => {
    const gradeDist = data?.gradeDist || {}
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
      xAxis: { type: 'category', data: Object.keys(gradeDist), ...axisTheme },
      yAxis: { type: 'value', name: '人', ...axisTheme },
      series: [{
        name: '人数',
        type: 'bar',
        data: Object.values(gradeDist),
        itemStyle: { color: '#27a644', borderRadius: [6, 6, 0, 0] },
        barMaxWidth: 36,
      }],
    }
  }, [data])

  if (isLoading) return <CardSkeleton />
  if (error) return <Card><Empty description="学生数据加载失败" /></Card>
  if (!data) return null

  const columns = [
    { title: '学员', dataIndex: 'name', key: 'name', fixed: 'left' as const, render: (v: string) => <Text strong>{v}</Text> },
    { title: '年级', dataIndex: 'grade', key: 'grade' },
    { title: '学校', dataIndex: 'school', key: 'school', render: (v: string) => v || '-' },
    { title: '家长', dataIndex: 'parentName', key: 'parentName', render: (v: string) => v || '-' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (v: string) => ({ ACTIVE: '在读', ENROLLED: '已报名', TRIAL: '体验中' }[v] || v) },
    { title: '考勤次数', dataIndex: 'attendanceCount', key: 'attendanceCount', render: (v: number) => `${v} 次` },
  ]

  return (
    <>
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={12} sm={8} md={4}>{kpiCard(<UserOutlined />, '学员总数', data.summary.total, '人')}</Col>
        <Col xs={12} sm={8} md={4}>{kpiCard(<TrophyOutlined />, '初中', data.summary.junior, '人')}</Col>
        <Col xs={12} sm={8} md={4}>{kpiCard(<TrophyOutlined />, '高中', data.summary.senior, '人')}</Col>
        <Col xs={12} sm={8} md={4}>{kpiCard(<CalendarOutlined />, '本月新增', data.summary.monthNew, '人')}</Col>
        <Col xs={12} sm={8} md={4}>{kpiCard(<ClockCircleOutlined />, '本月反馈', data.summary.monthFeedbackTotal, '条')}</Col>
        {data.summary.termName && <Col xs={24} sm={8} md={4}><Card style={{ borderRadius: 12 }}><Text type="secondary" style={{ fontSize: 12 }}>统计批次</Text><Text strong style={{ display: 'block', fontSize: 15 }}>{data.summary.termName}</Text></Card></Col>}
      </Row>
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={24} lg={10}>
          <Card title="年级分布" style={{ borderRadius: 12 }}>
            <ReactECharts option={barOption} style={{ height: 260 }} notMerge />
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="学员概览（最新报名在前）" style={{ borderRadius: 12 }}>
            <Table
              rowKey="id"
              size="small"
              dataSource={data.rows}
              columns={columns}
              pagination={{ pageSize: 8, hideOnSinglePage: true }}
              scroll={{ x: 640 }}
            />
          </Card>
        </Col>
      </Row>
    </>
  )
}

/* ---------- 家长登录报表 ---------- */
function ParentLoginTab({ division }: { division: string }) {
  const { data, error, isLoading } = useSWR(`/api/reports/parent-logins?division=${division}`, fetcher)

  const lineOption = useMemo(() => {
    const trend = data?.trend || []
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
      xAxis: { type: 'category', boundaryGap: false, data: trend.map((t: { date: string }) => t.date), ...axisTheme },
      yAxis: { type: 'value', name: '次', minInterval: 1, ...axisTheme },
      series: [{
        name: '家长登录',
        type: 'line',
        smooth: true,
        data: trend.map((t: { count: number }) => t.count),
        itemStyle: { color: '#E8784A' },
        lineStyle: { color: '#E8784A', width: 2 },
        areaStyle: { color: 'rgba(232,120,74,0.12)' },
        symbolSize: 4,
      }],
    }
  }, [data])

  if (isLoading) return <CardSkeleton />
  if (error) return <Card><Empty description="家长登录数据加载失败" /></Card>
  if (!data) return null

  const columns = [
    { title: '家长', dataIndex: 'name', key: 'name', render: (v: string) => <Text strong>{v}</Text> },
    { title: '近30天登录', dataIndex: 'count', key: 'count', render: (v: number) => `${v} 次` },
    { title: '最近登录', dataIndex: 'lastAt', key: 'lastAt', render: (v: string | null) => (v ? new Date(v).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-') },
  ]

  return (
    <>
      <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
        <Col xs={12} sm={8} md={4}>{kpiCard(<LoginOutlined />, '今日登录', data.summary.today, '次')}</Col>
        <Col xs={12} sm={8} md={4}>{kpiCard(<CalendarOutlined />, '本周登录', data.summary.week, '次')}</Col>
        <Col xs={12} sm={8} md={4}>{kpiCard(<CalendarOutlined />, '本月登录', data.summary.month, '次')}</Col>
        <Col xs={12} sm={8} md={4}>{kpiCard(<TeamOutlined />, '近30天活跃', data.summary.activeParents, '位')}</Col>
        <Col xs={24} sm={8} md={4}>{kpiCard(<UserOutlined />, '家长账号', data.parentTotal, '个')}</Col>
      </Row>
      <Row gutter={[12, 12]}>
        <Col xs={24} lg={14}>
          <Card title="近 30 天家长登录趋势" style={{ borderRadius: 12 }}>
            <ReactECharts option={lineOption} style={{ height: 280 }} notMerge />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="家长登录活跃榜 TOP10" style={{ borderRadius: 12 }}>
            <Table
              rowKey="userId"
              size="small"
              dataSource={data.ranking}
              columns={columns}
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
    </>
  )
}

/* ---------- 汇总 ---------- */
export function PeopleReports() {
  const { division } = useDivision()
  const isMobile = useIsMobile() ?? false

  return (
    <Tabs
      size={isMobile ? 'small' : 'middle'}
      items={[
        { key: 'teachers', label: '教师报表', children: <TeacherTab division={division} /> },
        { key: 'students', label: '学生报表', children: <StudentTab division={division} /> },
        { key: 'parent-logins', label: '家长登录', children: <ParentLoginTab division={division} /> },
      ]}
    />
  )
}
