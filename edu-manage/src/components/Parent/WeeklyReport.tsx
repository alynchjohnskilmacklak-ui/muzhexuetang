'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Alert, Button, Skeleton, Typography } from 'antd'
import { BookOutlined } from '@ant-design/icons'

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

  if (loading) return <div className="parent-dashboard-section"><Skeleton active paragraph={{ rows: 1 }} /></div>
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
  const metrics = [
    { label: '本周课次', value: report.stats.totalSchedules },
    { label: '出勤率', value: report.stats.attendanceRate == null ? '暂无' : `${report.stats.attendanceRate}%` },
    { label: '消息通知', value: report.stats.notificationCount },
    { label: '周测均分', value: averageScore ?? '暂无' },
  ]

  return (
    <section className="parent-dashboard-section" aria-labelledby="parent-weekly-report-title">
      <div className="parent-dashboard-section__head">
        <h2 id="parent-weekly-report-title">本周简报</h2>
        <Text type="secondary">{weekRange}</Text>
      </div>
      <div className="parent-weekly-strip">
        {metrics.map(metric => (
          <div key={metric.label} className="parent-weekly-strip__item">
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, padding: 14, border: '1px solid var(--color-hairline)', borderRadius: 12, background: 'var(--color-surface-1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <strong style={{ color: 'var(--color-ink)' }}>本周课堂内容</strong>
          {latestFeedback && <Text type="secondary">{latestFeedback.subject || '课堂反馈'} · {latestFeedback.teacherName}</Text>}
        </div>
        {latestFeedback ? (
          <>
            <p style={{ margin: '8px 0', color: 'var(--color-ink-muted)', lineHeight: 1.65 }}>
              {latestFeedback.content || (latestFeedback.knowledgePoints.length ? `本周涉及：${latestFeedback.knowledgePoints.join('、')}` : '老师已发布课堂反馈，点击查看具体内容。')}
            </p>
            {!!latestFeedback.knowledgePoints.length && (
              <Text type="secondary">知识点：{latestFeedback.knowledgePoints.slice(0, 4).join('、')}</Text>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
              <Link href={`/parent/class-feedback?childId=${encodeURIComponent(activeChildId || '')}`} style={{ color: 'var(--color-primary)' }}>查看完整课堂反馈</Link>
              {practiceUrl && latestFeedback.knowledgePoints.length > 0 && <Link href={practiceUrl} style={{ color: 'var(--color-primary)' }}>围绕本节知识点练习</Link>}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px 12px 8px' }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14, margin: '0 auto 10px',
              background: 'linear-gradient(135deg, rgba(201,164,92,.16), rgba(232,120,74,.10))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#C9A45C', fontSize: 21,
            }}>
              <BookOutlined />
            </div>
            <div style={{ fontWeight: 700, color: 'var(--color-ink)', fontSize: 14 }}>本周课堂内容正在整理中</div>
            <div style={{ fontSize: 12.5, color: 'var(--color-ink-muted)', marginTop: 4, lineHeight: 1.6 }}>
              老师课后会为每个孩子整理课堂反馈，发布后这里会展示本周学到的知识点。
            </div>
            <div style={{ fontSize: 12.5, color: '#E8784A', marginTop: 6, fontWeight: 600 }}>
              建议晚上来查看当天的学习情况
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
