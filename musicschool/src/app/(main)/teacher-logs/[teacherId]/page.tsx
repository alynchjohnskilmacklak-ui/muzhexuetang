'use client'

import useSWR from 'swr'
import { useParams } from 'next/navigation'
import { Card, Descriptions, Tag, Timeline, Statistic, Row, Col, List, Button, message, Typography } from 'antd'
import { ClockCircleOutlined, CheckCircleOutlined, FileTextOutlined, StarOutlined, LoginOutlined } from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'

const { Text } = Typography

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const ACTION_COLORS: Record<string, string> = {
  ATTENDANCE_SUBMIT: '#1D9E75', ATTENDANCE_MISSING: '#D4537E', PAPER_UPLOAD: '#f5a623', PAPER_PUBLISH: '#E8784A',
  PERFORMANCE_POST: '#8892f0', TEACHER_LOGIN: '#185FA5', COMMENT_REPLY: '#f5a623',
  MAKEUP_ARRANGE: '#534AB7',
}
const ACTION_LABELS: Record<string, string> = {
  ATTENDANCE_SUBMIT: '考勤提交', ATTENDANCE_MISSING: '漏提交', PAPER_UPLOAD: '试卷草稿', PAPER_PUBLISH: '试卷推送',
  PERFORMANCE_POST: '表现反馈', TEACHER_LOGIN: '登录', COMMENT_REPLY: '回复留言',
  MAKEUP_ARRANGE: '安排补课',
}

export default function TeacherLogDetailPage() {
  const { teacherId } = useParams()
  const { data, isLoading } = useSWR(`/api/teacher-logs/${teacherId}?period=month`, fetcher)

  const handleResolve = async (alertId: string) => {
    await fetch('/api/teacher-logs/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId }),
    })
    message.success('预警已处理')
  }

  if (isLoading || !data) return <PageLayout title="加载中..."><div /></PageLayout>

  return (
    <PageLayout title={`${data.teacher?.name} - 操作日志`} subtitle={data.teacher?.subjects}>
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={4}><Card bordered={false}><Statistic title="本月操作" value={data.stats?.totalLogs || 0} suffix="条" /></Card></Col>
        <Col xs={12} lg={4}><Card bordered={false}><Statistic title="考勤完成率" value={data.stats?.attendanceRate || 0} suffix="%" prefix={<CheckCircleOutlined style={{ color: '#1D9E75' }} />} /></Card></Col>
        <Col xs={12} lg={4}><Card bordered={false}><Statistic title="试卷推送" value={data.stats?.papersPublished || 0} prefix={<FileTextOutlined style={{ color: '#E8784A' }} />} /></Card></Col>
        <Col xs={12} lg={4}><Card bordered={false}><Statistic title="表现反馈" value={data.stats?.performancePosts || 0} prefix={<StarOutlined style={{ color: '#8892f0' }} />} /></Card></Col>
        <Col xs={12} lg={4}><Card bordered={false}><Statistic title="留言回复率" value={data.stats?.commentReplyRate || 0} suffix="%" prefix={<LoginOutlined style={{ color: '#185FA5' }} />} /></Card></Col>
        <Col xs={12} lg={4}><Card bordered={false}><Statistic title="未处理预警" value={data.alerts?.filter((a: any) => !a.isResolved).length || 0} valueStyle={{ color: '#D4537E' }} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card bordered={false} title="操作时间线" style={{ borderRadius: 10 }}>
            <Timeline items={(data.logs || []).slice(0, 50).map((l: any) => ({
              color: ACTION_COLORS[l.action] || '#ccc',
              children: (
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Tag color={ACTION_COLORS[l.action]}>{ACTION_LABELS[l.action] || l.action}</Tag>
                    <Text style={{ fontSize: 12, color: '#9a8e7a' }}>{new Date(l.createdAt).toLocaleString('zh-CN')}</Text>
                  </div>
                  {l.detail && <Text style={{ fontSize: 13, display: 'block', marginTop: 2 }}>{l.detail}</Text>}
                </div>
              ),
            }))} />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card bordered={false} title="预警记录" style={{ borderRadius: 10 }}>
            <List dataSource={data.alerts || []}
              renderItem={(a: any) => (
                <List.Item actions={!a.isResolved ? [<Button size="small" type="link" onClick={() => handleResolve(a.id)}>已处理</Button>] : undefined}>
                  <div>
                    <Tag color={a.isResolved ? 'default' : 'red'}>{a.type}</Tag>
                    <Text>{a.message}</Text>
                    <div style={{ fontSize: 11, color: '#9a8e7a' }}>{new Date(a.createdAt).toLocaleString('zh-CN')}</div>
                  </div>
                </List.Item>
              )}
              locale={{ emptyText: '暂无预警' }} />
          </Card>
        </Col>
      </Row>
    </PageLayout>
  )
}
