'use client'

import { useEffect, useState } from 'react'
import { Card, Col, Progress, Row, Skeleton, Tag, Typography } from 'antd'
import { BookOutlined, CheckCircleOutlined, MessageOutlined, RiseOutlined, TrophyOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

interface WeeklyReportData {
  weekStart: string
  reports: Array<{
    student: { id: string; name: string; grade: string | null }
    weekRange: { start: string; end: string }
    stats: {
      totalSchedules: number
      presentCount: number
      absentCount: number
      lateCount: number
      leaveCount: number
      attendanceRate: number
      notificationCount: number
    }
    grades: Array<{ subject: string; score: number; type: string }>
    comment: string
  }>
}

export function WeeklyReport() {
  const [data, setData] = useState<WeeklyReportData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/parent/weekly-report')
      .then(response => response.json())
      .then(result => {
        setData(result)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <Skeleton active paragraph={{ rows: 4 }} />
  if (!data || data.reports.length === 0) return null

  const weekStart = new Date(data.weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekRangeStr = `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <Title level={5} style={{ margin: 0, fontSize: 15 }}>本周学习简报</Title>
        <Text type="secondary" style={{ fontSize: 12 }}>{weekRangeStr}</Text>
      </div>

      {data.reports.map(report => {
        const { stats, grades, comment, student } = report
        const rateColor = stats.attendanceRate >= 90 ? '#27a644' : stats.attendanceRate >= 70 ? '#f5a623' : '#ff4d4f'

        return (
          <Card
            key={student.id}
            style={{ marginBottom: 12, borderRadius: 14 }}
            styles={{ body: { padding: 16 } }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
              <div>
                <Text strong style={{ fontSize: 15 }}>{student.name}</Text>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>{student.grade || '-'}</Text>
              </div>
              <Tag
                color={stats.attendanceRate === 100 ? 'success' : stats.attendanceRate >= 70 ? 'warning' : 'error'}
                icon={<TrophyOutlined />}
                style={{ fontSize: 12, margin: 0 }}
              >
                {stats.attendanceRate === 100 ? '全勤' : `出勤${stats.attendanceRate}%`}
              </Tag>
            </div>

            {stats.totalSchedules > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: '#5a4e3a' }}>
                    <CheckCircleOutlined style={{ marginRight: 4, color: rateColor }} />
                    出勤率
                  </Text>
                  <Text style={{ fontSize: 12, color: rateColor, fontWeight: 600 }}>
                    {stats.presentCount}/{stats.totalSchedules} 节
                  </Text>
                </div>
                <Progress
                  percent={stats.attendanceRate}
                  strokeColor={rateColor}
                  trailColor="rgba(0,0,0,.06)"
                  showInfo={false}
                  size="small"
                  style={{ margin: 0 }}
                />
              </div>
            )}

            <Row gutter={[10, 10]} style={{ marginBottom: 14 }}>
              {[
                { icon: <BookOutlined />, label: '本周课次', value: `${stats.totalSchedules} 节`, color: '#1890ff' },
                { icon: <CheckCircleOutlined />, label: '已出勤', value: `${stats.presentCount} 次`, color: '#27a644' },
                { icon: <MessageOutlined />, label: '收到通知', value: `${stats.notificationCount} 条`, color: '#E87545' },
                { icon: <RiseOutlined />, label: '本周测验', value: grades.length > 0 ? `${grades.length} 次` : '暂无', color: '#722ed1' },
              ].map((item, index) => (
                <Col span={12} key={index}>
                  <div style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    backgroundColor: `${item.color}0d`,
                    border: `1px solid ${item.color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <span style={{ color: item.color, fontSize: 16 }}>{item.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, color: '#9a8e7a', lineHeight: 1.2 }}>{item.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: item.color, lineHeight: 1.4 }}>{item.value}</div>
                    </div>
                  </div>
                </Col>
              ))}
            </Row>

            {grades.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: '#5a4e3a', display: 'block', marginBottom: 6 }}>
                  本周测验成绩
                </Text>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {grades.map((grade, index) => (
                    <div key={index} style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 13,
                      backgroundColor: grade.score >= 85 ? 'rgba(39,166,68,.1)' : grade.score >= 70 ? 'rgba(245,166,35,.1)' : 'rgba(255,77,79,.1)',
                      color: grade.score >= 85 ? '#27a644' : grade.score >= 70 ? '#d48806' : '#ff4d4f',
                      border: `1px solid ${grade.score >= 85 ? 'rgba(39,166,68,.25)' : grade.score >= 70 ? 'rgba(245,166,35,.25)' : 'rgba(255,77,79,.25)'}`,
                      fontWeight: 500,
                    }}>
                      {grade.subject} {grade.score}分
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{
              padding: '10px 14px',
              borderRadius: 10,
              backgroundColor: 'rgba(232,117,69,.05)',
              borderLeft: '3px solid #E87545',
            }}>
              <Text style={{ fontSize: 13, color: '#5a4e3a', lineHeight: 1.8 }}>{comment}</Text>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
