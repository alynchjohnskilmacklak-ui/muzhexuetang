'use client'

import { useState } from 'react'
import { Card, Col, Row, Statistic, Table, Tag, Typography, Empty, Tabs } from 'antd'
import { FileTextOutlined, TrophyOutlined, CheckCircleOutlined, BookOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const { Title, Text } = Typography

const ASSESS_TYPE_LABELS: Record<string, string> = {
  DIAGNOSTIC: '诊断', STAGE: '阶段', FINAL: '期末', MOCK: '模拟',
}

const MASTERY_LABELS: Record<string, { text: string; color: string }> = {
  MASTERED: { text: '已掌握', color: 'green' },
  NEEDS_REVIEW: { text: '需复习', color: 'orange' },
  NEEDS_PRACTICE: { text: '需练习', color: 'red' },
}

export function ParentArchiveClient({
  gradeRecords, examPapers, attendanceSummary,
}: {
  gradeRecords: any[]
  examPapers: any[]
  attendanceSummary: any[]
}) {
  const router = useRouter()
  return (
    <div>
      <Title level={4} style={{ marginBottom: 4 }}>学习档案</Title>
      <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 20 }}>
        记录孩子每一次成长的足迹
      </Text>

      <Tabs
        defaultActiveKey="papers"
        items={[
          {
            key: 'papers',
            label: <span><FileTextOutlined /> 试卷信息</span>,
            children: examPapers.length === 0 ? (
              <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description="暂无学习档案，老师会在课后持续更新孩子的成长记录。" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </Card>
            ) : (
              <Table
                dataSource={examPapers}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 10 }}
                style={{ background: '#fff', borderRadius: 12 }}
                onRow={(record) => ({
                  onClick: () => router.push(`/parent/archive/${record.id}`),
                  style: { cursor: 'pointer' },
                })}
                columns={[
                  { title: '标题', dataIndex: 'title', key: 'title', render: (v: string) => <Text strong style={{ color: '#E8784A' }}>{v}</Text> },
                  { title: '学生', dataIndex: ['student', 'name'], key: 'student', width: 80 },
                  { title: '科目', dataIndex: 'subject', key: 'subject', width: 80, render: (v: string) => <Tag>{v}</Tag> },
                  { title: '教师', dataIndex: ['teacher', 'name'], key: 'teacher', width: 80 },
                  {
                    title: '日期', dataIndex: 'paperDate', key: 'paperDate', width: 110,
                    render: (v: string) => format(new Date(v), 'yyyy-MM-dd'),
                  },
                  {
                    title: '状态', dataIndex: 'status', key: 'status', width: 80,
                    render: (v: string, r: any) => {
                      if (r.questions?.length > 0) {
                        const mastered = r.questions.filter((q: any) => q.mastery === 'MASTERED').length
                        return <Tag color="green">已批改 {mastered}/{r.questions.length}</Tag>
                      }
                      return <Tag>{v}</Tag>
                    },
                  },
                ]}
              />
            ),
          },
          {
            key: 'grades',
            label: <span><TrophyOutlined /> 成绩记录</span>,
            children: gradeRecords.length === 0 ? (
              <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description="暂无成绩记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </Card>
            ) : (
              <Table
                dataSource={gradeRecords}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 10 }}
                style={{ background: '#fff', borderRadius: 12 }}
                columns={[
                  { title: '考试', dataIndex: ['assessment', 'name'], key: 'assessment' },
                  { title: '学生', dataIndex: ['student', 'name'], key: 'student', width: 80 },
                  { title: '科目', dataIndex: ['assessment', 'subject'], key: 'subject', width: 80, render: (_v: string) => <Tag>-</Tag> },
                  {
                    title: '类型', dataIndex: ['assessment', 'type'], key: 'type', width: 80,
                    render: (v: string) => ASSESS_TYPE_LABELS[v] || v,
                  },
                  {
                    title: '成绩', dataIndex: 'score', key: 'score', width: 80,
                    render: (v: number) => <Text strong style={{ color: v >= 90 ? '#1D9E75' : v >= 60 ? '#E8784A' : '#E24B4A', fontSize: 15 }}>{v}</Text>,
                  },
                  { title: '日期', dataIndex: 'createdAt', key: 'createdAt', width: 110, render: (v: string) => format(new Date(v), 'yyyy-MM-dd') },
                ]}
              />
            ),
          },
          {
            key: 'attendance',
            label: <span><CheckCircleOutlined /> 出勤概况</span>,
            children: attendanceSummary.length === 0 ? (
              <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', minHeight: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty description="暂无出勤数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </Card>
            ) : (
              <Row gutter={[16, 16]}>
                {attendanceSummary.map((s: any) => (
                  <Col xs={24} sm={8} key={s.studentId}>
                    <Card bordered={false} style={{ borderRadius: 12, background: '#fff', border: '1px solid #F0DDD2', textAlign: 'center' }}>
                      <Statistic title="出勤率" value={s.rate} suffix="%" valueStyle={{ color: s.rate >= 90 ? '#1D9E75' : '#E8784A' }} />
                      <Text type="secondary" style={{ fontSize: 11 }}>本月 {s.present}/{s.total} 次出勤</Text>
                    </Card>
                  </Col>
                ))}
              </Row>
            ),
          },
        ]}
      />
    </div>
  )
}
