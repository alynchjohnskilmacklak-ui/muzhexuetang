'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Alert, Button, Skeleton, Typography } from 'antd'
import {
  BellOutlined,
  BookOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  RightOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { AnimatedNumber } from '@/components/Common/AnimatedNumber'

const { Text } = Typography

interface WeeklyReportData {
  weekStart: string
  reports: Array<{
    student: { id: string; name: string; grade: string | null }
    stats: { totalSchedules: number; attendanceRate: number | null; notificationCount: number }
    grades: Array<{ subject: string; score: number; type: string }>
    feedbacks: Array<{
      id: string
      subject: string | null
      teacherName: string
      content: string
      knowledgePoints: string[]
      createdAt: string
    }>
  }>
}

export function WeeklyReport({ activeChildId }: { activeChildId?: string }) {
  const [data, setData] = useState<WeeklyReportData | null>(null)
  const [error, setError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [loading, setLoading] = useState(Boolean(activeChildId))

  useEffect(() => {
    if (!activeChildId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(false)
    let active = true
    fetch(`/api/parent/weekly-report?childId=${encodeURIComponent(activeChildId)}`)
      .then(async (response) => {
        const result = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : '周报读取失败')
        return result as WeeklyReportData
      })
      .then(result => { if (active) setData(result) })
      .catch((requestError) => {
        if (active) {
          console.warn('周报加载失败', requestError)
          setError(true)
        }
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [activeChildId, retryCount])

  if (loading) return <div className="parent-dashboard-section"><Skeleton active paragraph={{ rows: 2 }} /></div>
  if (error) return (
    <section className="parent-dashboard-section" aria-label="本周简报">
      <Alert type="error" showIcon message="本周简报暂时加载失败" action={<Button size="small" onClick={() => setRetryCount((value) => value + 1)}>重试</Button>} />
    </section>
  )
  if (!data || data.reports.length === 0) return null

  const report = data.reports.find(item => item.student.id === activeChildId) || data.reports[0]
  const weekStart = new Date(data.weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekRange = `${weekStart.getMonth() + 1}/${weekStart.getDate()} – ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`
  const averageScore = report.grades.length
    ? Math.round(report.grades.reduce((total, grade) => total + grade.score, 0) / report.grades.length)
    : null
  const latestFeedback = report.feedbacks?.[0]
  const topic = latestFeedback?.knowledgePoints?.[0]
  const practiceUrl = latestFeedback
    ? `/parent/practice?${new URLSearchParams({ childId: report.student.id, source: 'feedback', subject: latestFeedback.subject || '', ...(topic ? { point: topic } : {}) }).toString()}`
    : null

  const metrics: Array<{
    label: string
    value: number | null
    suffix?: string
    isHighlight?: boolean
    icon: React.ReactNode
    emptyText: string
  }> = [
    {
      label: '本周课次',
      value: report.stats.totalSchedules,
      suffix: '节',
      isHighlight: report.stats.totalSchedules > 0,
      icon: <CalendarOutlined />,
      emptyText: '0 节',
    },
    {
      label: '出勤率',
      value: report.stats.attendanceRate,
      suffix: '%',
      isHighlight: report.stats.attendanceRate != null,
      icon: <CheckCircleOutlined />,
      emptyText: '待出勤',
    },
    {
      label: '消息通知',
      value: report.stats.notificationCount,
      suffix: '条',
      isHighlight: report.stats.notificationCount > 0,
      icon: <BellOutlined />,
      emptyText: '0 条',
    },
    {
      label: '周测均分',
      value: averageScore,
      suffix: '分',
      isHighlight: averageScore != null,
      icon: <TrophyOutlined />,
      emptyText: '待周测',
    },
  ]

  return (
    <section className="parent-dashboard-section" aria-labelledby="parent-weekly-report-title">
      <div className="parent-dashboard-section__head">
        <h2 id="parent-weekly-report-title">本周简报</h2>
        <span className="parent-weekly-range-pill">
          <CalendarOutlined style={{ fontSize: 11 }} />
          <span>{weekRange}</span>
        </span>
      </div>

      <div className="parent-weekly-strip">
        {metrics.map((metric) => (
          <div key={metric.label} className="parent-weekly-strip__item">
            <span className="parent-weekly-strip__item-watermark" aria-hidden="true">
              {metric.icon}
            </span>
            {metric.value == null ? (
              <span className="parent-weekly-empty-val">{metric.emptyText}</span>
            ) : (
              <strong className={metric.isHighlight ? 'highlight' : ''}>
                <AnimatedNumber value={metric.value} />
                {metric.suffix && <small style={{ fontSize: 11, fontWeight: 700, marginLeft: 1 }}>{metric.suffix}</small>}
              </strong>
            )}
            <span className="parent-weekly-label">{metric.label}</span>
          </div>
        ))}
      </div>

      <div className="parent-weekly-content-well">
        {/* 右上角雅致素宣折角微印 */}
        <div className="parent-weekly-content-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 18,
                height: 18,
                borderRadius: 5,
                background: 'rgba(20, 87, 77, 0.1)',
                color: '#14574D',
                fontSize: 10,
              }}
            >
              <BookOutlined />
            </span>
            <strong style={{ color: '#1A1201', fontSize: 13.5, fontWeight: 750 }}>本周课堂内容</strong>
          </div>
          {latestFeedback && (
            <span className="parent-weekly-feedback-tag">
              {latestFeedback.subject || '课堂反馈'} · {latestFeedback.teacherName}
            </span>
          )}
        </div>

        {latestFeedback ? (
          <>
            <p style={{ margin: '8px 0 10px', color: '#5C503D', fontSize: 12.5, lineHeight: 1.65 }}>
              {latestFeedback.content || (latestFeedback.knowledgePoints.length ? `本周涉及：${latestFeedback.knowledgePoints.join('、')}` : '老师已发布课堂反馈，点击查看具体内容。')}
            </p>
            {!!latestFeedback.knowledgePoints.length && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                {latestFeedback.knowledgePoints.slice(0, 4).map((point) => (
                  <span
                    key={point}
                    style={{
                      fontSize: 11,
                      fontWeight: 650,
                      color: '#14574D',
                      background: 'rgba(20, 87, 77, 0.08)',
                      border: '1px solid rgba(20, 87, 77, 0.12)',
                      padding: '2px 8px',
                      borderRadius: 6,
                    }}
                  >
                    {point}
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <Link
                href={`/parent/class-feedback?childId=${encodeURIComponent(activeChildId || '')}`}
                style={{
                  color: '#14574D',
                  fontWeight: 700,
                  fontSize: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <span>查看完整课堂反馈</span>
                <RightOutlined style={{ fontSize: 9 }} />
              </Link>
              {practiceUrl && latestFeedback.knowledgePoints.length > 0 && (
                <Link
                  href={practiceUrl}
                  style={{
                    color: '#8A6517',
                    fontWeight: 700,
                    fontSize: 12,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <span>围绕本节知识点练习</span>
                  <RightOutlined style={{ fontSize: 9 }} />
                </Link>
              )}
            </div>
          </>
        ) : (
          <div className="parent-weekly-empty-state">
            <span className="parent-weekly-empty-seal" aria-hidden="true">研学</span>
            <div className="parent-weekly-empty-icon-wrap">
              <div className="parent-weekly-empty-icon">
                <BookOutlined />
              </div>
            </div>
            <div className="parent-weekly-empty-title">本周课堂反馈正在课后研磨中</div>
            <div className="parent-weekly-empty-desc">
              任课老师课后会为孩子细致梳理知识点掌握度与课堂表现。发布后，本周所学重点、易错剖析与专属练习将在此呈现。
            </div>
            <div>
              <span className="parent-weekly-evening-pill">
                <span className="parent-weekly-moon">🌙</span>
                <span>建议傍晚或晚间 20:00 查看今日完整学情反馈</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}


