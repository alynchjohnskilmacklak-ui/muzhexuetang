'use client'

import { useEffect, useState } from 'react'
import { Skeleton, Typography } from 'antd'

const { Text } = Typography

interface WeeklyReportData {
  weekStart: string
  reports: Array<{
    student: { id: string; name: string; grade: string | null }
    stats: { totalSchedules: number; attendanceRate: number | null; notificationCount: number }
    grades: Array<{ subject: string; score: number; type: string }>
  }>
}

export function WeeklyReport({ activeChildId }: { activeChildId?: string }) {
  const [data, setData] = useState<WeeklyReportData | null>(null)
  const [loading, setLoading] = useState(Boolean(activeChildId))

  useEffect(() => {
    if (!activeChildId) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetch(`/api/parent/weekly-report?childId=${activeChildId}`)
      .then(response => response.json())
      .then(result => setData(result))
      .catch(error => console.warn('周报加载失败', error))
      .finally(() => setLoading(false))
  }, [activeChildId])

  if (loading) return <div className="parent-dashboard-section"><Skeleton active paragraph={{ rows: 1 }} /></div>
  if (!data || data.reports.length === 0) return null

  const report = data.reports.find(item => item.student.id === activeChildId) || data.reports[0]
  const weekStart = new Date(data.weekStart)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const weekRange = `${weekStart.getMonth() + 1}/${weekStart.getDate()} – ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`
  const averageScore = report.grades.length
    ? Math.round(report.grades.reduce((total, grade) => total + grade.score, 0) / report.grades.length)
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
    </section>
  )
}
