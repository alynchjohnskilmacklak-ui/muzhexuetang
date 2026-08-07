'use client'

import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import { Avatar, Button, Card, Col, Empty, Row, Skeleton, Space, Tag, Typography } from 'antd'
import {
  ArrowLeftOutlined,
  BookOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  MinusOutlined,
  RightOutlined,
  RiseOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useIsMobile } from '@/hooks/useIsMobile'
import type { StudentGrowthReportDTO } from '@/lib/student-growth/report'

const { Title, Text } = Typography

async function fetcher(url: string) {
  const response = await fetch(url)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || '成长报告加载失败')
  return payload
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('zh-CN') : '-'
}

function periodText(report: StudentGrowthReportDTO) {
  if (!report.period.startDate || !report.period.endDate) return '暂无反馈周期'
  return `${formatDate(report.period.startDate)} 至 ${formatDate(report.period.endDate)}`
}

const TREND_PRESENTATION = {
  IMPROVING: { label: '↑ 持续进步', icon: <RiseOutlined />, color: 'var(--color-success)', background: 'var(--color-success-bg)' },
  STABLE: { label: '→ 保持稳定', icon: <MinusOutlined />, color: 'var(--color-primary)', background: 'var(--color-primary-bg)' },
  NEEDS_ATTENTION: { label: '△ 需要关注', icon: <WarningOutlined />, color: 'var(--color-warning-text)', background: 'var(--color-surface-3)' },
} as const

export function GrowthReportClient({ studentId }: { studentId: string }) {
  const router = useRouter()
  const isMobile = useIsMobile() ?? false
  const { data: report, error, isLoading } = useSWR<StudentGrowthReportDTO>(
    `/api/parent/students/${studentId}/growth-report`,
    fetcher,
  )

  if (isLoading) {
    return <Card bordered={false} style={{ borderRadius: 14 }}><Skeleton active paragraph={{ rows: 10 }} /></Card>
  }

  if (error || !report) {
    return (
      <Card bordered={false} style={{ borderRadius: 14 }}>
        <Empty description={error?.message || '成长报告暂时无法加载'}>
          <Button onClick={() => router.back()}>返回</Button>
        </Empty>
      </Card>
    )
  }

  const overview = [
    { label: '累计课堂反馈', value: `${report.overview.feedbackCount} 次`, icon: <BookOutlined /> },
    { label: '出勤率', value: report.overview.attendanceRate === null ? '暂无记录' : `${report.overview.attendanceRate}%`, icon: <CheckCircleOutlined /> },
    { label: '剩余课时', value: `${report.overview.remainingHours} 小时`, icon: <ClockCircleOutlined /> },
    { label: '学习周期', value: periodText(report), icon: <ClockCircleOutlined /> },
  ]
  const trend = TREND_PRESENTATION[report.trend.type]

  return (
    <main style={{ width: '100%', maxWidth: 960, margin: '0 auto', paddingBottom: 28 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ marginBottom: 12 }}>
        返回
      </Button>

      <Card
        bordered={false}
        style={{
          marginBottom: 14,
          borderRadius: 18,
          border: '1px solid var(--color-hairline)',
          background: 'linear-gradient(145deg, var(--color-primary-bg), var(--color-surface-1))',
        }}
        styles={{ body: { padding: isMobile ? 18 : 24 } }}
      >
        <Space align="center" size={14}>
          <Avatar size={isMobile ? 54 : 66} style={{ background: 'var(--color-primary)', fontWeight: 800 }}>
            {report.student.name.slice(0, 1)}
          </Avatar>
          <div>
            <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>学生成长档案</Title>
            <Text style={{ display: 'block', marginTop: 5, color: 'var(--color-ink-muted)' }}>
              {report.student.name} · {report.student.grade || '未设置年级'}
            </Text>
            <Text style={{ fontSize: 12, color: 'var(--color-ink-subtle)' }}>{periodText(report)}</Text>
          </div>
        </Space>
      </Card>

      <Card
        bordered={false}
        style={{ marginBottom: 14, borderRadius: 14, border: '1px solid var(--color-hairline)', background: trend.background }}
        styles={{ body: { padding: isMobile ? 14 : 18 } }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ color: trend.color, fontSize: 22, lineHeight: 1 }}>{trend.icon}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'var(--color-ink-subtle)', fontSize: 12 }}>学习趋势</div>
            <div style={{ color: trend.color, fontSize: isMobile ? 18 : 20, fontWeight: 750, marginTop: 2 }}>{trend.label}</div>
            <div style={{ color: 'var(--color-ink-muted)', lineHeight: 1.7, marginTop: 5 }}>{report.trend.description}</div>
          </div>
        </div>
      </Card>

      <Title level={5}>学习概况</Title>
      <Row gutter={[10, 10]} style={{ marginBottom: 18 }}>
        {overview.map((item) => (
          <Col xs={12} md={6} key={item.label}>
            <Card bordered={false} style={{ height: '100%', borderRadius: 14, border: '1px solid var(--color-hairline)' }} styles={{ body: { padding: isMobile ? 12 : 16 } }}>
              <div style={{ color: 'var(--color-primary)', fontSize: 18 }}>{item.icon}</div>
              <div style={{ color: 'var(--color-ink-subtle)', fontSize: 12, marginTop: 7 }}>{item.label}</div>
              <div style={{ color: 'var(--color-ink)', fontWeight: 750, marginTop: 3, lineHeight: 1.45, overflowWrap: 'anywhere' }}>{item.value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {!report.availability.hasFeedback && (
        <Card bordered={false} style={{ marginBottom: 14, borderRadius: 14, border: '1px solid var(--color-hairline)' }}>
          <Empty description="孩子暂未产生课堂反馈。" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </Card>
      )}

      <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
        <Col xs={24} md={report.focusAreas.length ? 15 : 24}>
          <Card title="阶段总结" bordered={false} style={{ height: '100%', borderRadius: 14, border: '1px solid var(--color-hairline)' }}>
            <Text style={{ color: 'var(--color-ink-muted)', lineHeight: 1.9 }}>{report.stageSummary}</Text>
          </Card>
        </Col>
        {report.focusAreas.length > 0 && (
          <Col xs={24} md={9}>
            <Card title="重点关注" bordered={false} style={{ height: '100%', borderRadius: 14, border: '1px solid var(--color-hairline)' }}>
              {report.focusAreas.map((item) => (
                <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
                  <WarningOutlined style={{ color: 'var(--color-warning-text)', marginTop: 4 }} />
                  <Text>{item}</Text>
                </div>
              ))}
            </Card>
          </Col>
        )}
      </Row>

      <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
        <Col xs={24} md={12}>
          <Card title="近期成长表现" bordered={false} style={{ height: '100%', borderRadius: 14, border: '1px solid var(--color-hairline)' }}>
            {report.learningStrengths.length ? report.learningStrengths.map((item) => (
              <div key={item} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 12 }}>
                <CheckCircleOutlined style={{ color: 'var(--color-success)', marginTop: 4 }} />
                <Text>{item}</Text>
              </div>
            )) : <Empty description="暂无足够的正向课堂记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="需要提升" bordered={false} style={{ height: '100%', borderRadius: 14, border: '1px solid var(--color-hairline)' }}>
            {report.improvements.map((item) => (
              <div key={item} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', marginBottom: 12 }}>
                <ExclamationCircleOutlined style={{ color: 'var(--color-warning)', marginTop: 4 }} />
                <Text>{item}</Text>
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      <Card title="教师反馈精选" bordered={false} style={{ marginBottom: 14, borderRadius: 14, border: '1px solid var(--color-hairline)' }}>
        {report.recentFeedback.length ? report.recentFeedback.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => router.push(`/parent/class-feedback/${item.id}`)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '13px 0', border: 0, borderBottom: '1px solid var(--color-hairline)',
              background: 'transparent', textAlign: 'left', cursor: 'pointer', color: 'inherit',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <Space size={6} wrap>
                <Tag color="orange">{item.subject}</Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>{formatDate(item.date)} · {item.teacher}</Text>
              </Space>
              <div style={{ marginTop: 6, lineHeight: 1.7, color: 'var(--color-ink-muted)', overflowWrap: 'anywhere' }}>{item.summary}</div>
            </div>
            <RightOutlined style={{ color: 'var(--color-ink-subtle)', flexShrink: 0 }} />
          </button>
        )) : <Empty description="暂无课堂反馈" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </Card>

      <Card title="教师建议" bordered={false} style={{ borderRadius: 14, border: '1px solid var(--color-hairline)' }}>
        {report.teacherSuggestions.length ? report.teacherSuggestions.map((item, index) => (
          <div key={`${item}-${index}`} style={{ padding: '11px 13px', marginBottom: 9, borderRadius: 10, background: 'var(--color-primary-bg)', lineHeight: 1.8 }}>
            {item}
          </div>
        )) : <Empty description="暂无教师建议" image={Empty.PRESENTED_IMAGE_SIMPLE} />}

        <div style={{ marginTop: 12, display: 'grid', gap: 6 }}>
          {!report.availability.hasGrades && <Text type="secondary">暂无成绩数据。</Text>}
          {!report.availability.hasAttendance && <Text type="secondary">暂无考勤记录。</Text>}
        </div>
      </Card>
    </main>
  )
}
