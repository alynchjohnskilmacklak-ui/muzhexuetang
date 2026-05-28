'use client'

import useSWR from 'swr'
import { Card, Table, Tag, Statistic, Row, Col, Button } from 'antd'
import { useRouter } from 'next/navigation'
import { UserOutlined, CheckCircleOutlined, WarningOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: 'green', label: '正常' },
  PARTIAL: { color: 'orange', label: '部分完成' },
  INACTIVE: { color: 'red', label: '无操作' },
}

const ACTION_LABELS: Record<string, string> = {
  ATTENDANCE_SUBMIT: '考勤提交', ATTENDANCE_MISSING: '漏提交', PAPER_UPLOAD: '试卷草稿', PAPER_PUBLISH: '试卷推送',
  PERFORMANCE_POST: '表现反馈', TEACHER_LOGIN: '登录', COMMENT_REPLY: '回复留言',
  MAKEUP_ARRANGE: '安排补课',
}

export default function TeacherLogsPage() {
  const router = useRouter()
  const { data, isLoading } = useSWR('/api/teacher-logs', fetcher, { refreshInterval: 120_000 })

  const columns = [
    { title: '教师', dataIndex: 'teacherName', key: 'teacherName', render: (name: string, r: any) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 16, background: 'rgba(232,120,74,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UserOutlined style={{ color: '#E8784A', fontSize: 14 }} />
        </div>
        <span>{name}</span>
      </div>
    )},
    { title: '科目', dataIndex: 'subjects', key: 'subjects', width: 120 },
    { title: '今日考勤状态', dataIndex: 'attendanceStatus', key: 'attendanceStatus', width: 110 },
    { title: '已提交', dataIndex: 'submittedCount', key: 'submittedCount', width: 70,
      render: (v: number, r: any) => <span style={{ color: v >= r.todayLessons ? '#1D9E75' : '#E8784A' }}>{v}</span> },
    { title: '试卷推送', dataIndex: 'papersToday', key: 'papersToday', width: 80 },
    { title: '表现反馈', dataIndex: 'postsToday', key: 'postsToday', width: 80 },
    { title: '留言回复', dataIndex: 'commentRepliesToday', key: 'commentRepliesToday', width: 80 },
    { title: '最后操作', dataIndex: 'lastAction', key: 'lastAction', width: 100,
      render: (v: string) => v ? <Tag>{ACTION_LABELS[v] || v}</Tag> : <span style={{ color: '#ccc' }}>-</span> },
    { title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => <Tag color={STATUS_MAP[v]?.color}>{STATUS_MAP[v]?.label}</Tag> },
    { title: '操作', key: 'actions', width: 80, render: (_: unknown, r: any) => (
      <Button size="small" type="link" onClick={() => router.push(`/teacher-logs/${r.teacherId}`)}>详情</Button>
    )},
  ]

  return (
    <PageLayout title="教师行为日志" subtitle="监控所有教师今日操作状态">
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card bordered={false}><Statistic title="今日完成考勤人数" value={data?.summary?.attendanceCompleteTeachers || 0} prefix={<CheckCircleOutlined style={{ color: '#1D9E75' }} />} suffix="人" /></Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card bordered={false}><Statistic title="待推送试卷总数" value={data?.summary?.pendingPapers || 0} prefix={<WarningOutlined style={{ color: '#f5a623' }} />} suffix="份" /></Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card bordered={false}><Statistic title="本周反馈率" value={data?.summary?.weeklyFeedbackRate || 0} prefix={<CloseCircleOutlined style={{ color: '#8892f0' }} />} suffix="%" /></Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card bordered={false}><Statistic title="异常预警" value={data?.summary?.alertCount || 0} prefix={<WarningOutlined style={{ color: '#E8784A' }} />} suffix="条" valueStyle={{ color: data?.summary?.alertCount > 0 ? '#E8784A' : '#1D9E75' }} /></Card>
        </Col>
      </Row>
      <Card bordered={false}>
        <Table columns={columns} dataSource={data?.teachers || []} rowKey="teacherId" loading={isLoading} pagination={false} scroll={{ x: 800 }} />
      </Card>
    </PageLayout>
  )
}
