'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { Button, Input, message, Select, Spin } from 'antd'
import { PlusOutlined, ReloadOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons'
import { PageLayout } from '@/components/Layout/PageLayout'
import { useIsMobile } from '@/hooks/useIsMobile'
import { FeedbackCard } from '@/components/FeedbackCard'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export default function AdminFeedbackPage() {
  const isMobile = useIsMobile() ?? false
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [teacherFilter, setTeacherFilter] = useState('')
  const [q, setQ] = useState('')
  const [viewAll, setViewAll] = useState(false)

  const params = new URLSearchParams({ date, limit: '200' })
  if (teacherFilter) params.set('teacherId', teacherFilter)
  if (viewAll) params.set('all', '1')
  const { data, isLoading, mutate } = useSWR(`/api/feedback?${params}`, fetcher)
  const { data: teachersData } = useSWR('/api/teachers?limit=200', fetcher)
  const teachers: any[] = Array.isArray(teachersData?.teachers) ? teachersData.teachers : []
  const feedbacks: any[] = Array.isArray(data?.feedbacks) ? data.feedbacks : []

  // Compute teachers without feedback today
  const noFeedback = useMemo(() => {
    if (viewAll) return []
    const teachersWithFeedback = new Set(feedbacks.map((f: any) => f.teacherId))
    return teachers.filter((t: any) => !teachersWithFeedback.has(t.id) && t.status === 'ACTIVE')
  }, [viewAll, feedbacks, teachers])

  const filtered = feedbacks.filter((f: any) =>
    !q.trim() ||
    String(f.teacherName || f.teacher?.name || '').includes(q) ||
    String(f.overallComment || f.summary || '').includes(q) ||
    (Array.isArray(f.students) && f.students.some((s: any) => String(s.name).includes(q)))
  )

  const handleAdminReply = async (feedbackId: string, replyText: string) => {
    if (!replyText.trim()) return
    const res = await fetch('/api/feedback', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: feedbackId, adminReply: replyText }),
    })
    if (res.ok) { message.success('回复成功'); mutate() }
    else message.error('回复失败')
  }

  return (
    <PageLayout
      title="成长反馈管理"
      subtitle="查看所有老师的反馈，可为家长回复或替老师补发（不计薪资）"
      actions={
        <Button icon={<ReloadOutlined />} onClick={() => mutate()} />
      }
    >
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          { label: '今日已反馈', value: feedbacks.length, color: '#1D9E75' },
          { label: '未反馈老师', value: noFeedback.length, color: noFeedback.length > 0 ? '#E87545' : '#1D9E75' },
        ].map(card => (
          <div key={card.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEE7E1', padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: '#98A2B3' }}>{card.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: card.color, marginTop: 4 }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EEE7E1', padding: 14, marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 145 }} disabled={viewAll} />
        <Select allowClear placeholder="按教师" style={{ width: 130 }} value={teacherFilter || undefined} onChange={v => setTeacherFilter(v || '')}
          options={teachers.map((t: any) => ({ label: t.name, value: t.id }))} />
        <Input prefix={<SearchOutlined />} placeholder="搜索内容/学员" value={q} onChange={e => setQ(e.target.value)} allowClear style={{ width: isMobile ? '100%' : 220 }} />
        <Button type={viewAll ? 'primary' : 'default'} onClick={() => setViewAll(v => !v)}
          style={viewAll ? { background: '#E8784A', borderColor: '#E8784A' } : undefined}>
          {viewAll ? '恢复按日' : '查看全部'}
        </Button>
      </div>

      {/* No-feedback warning */}
      {!viewAll && noFeedback.length > 0 && (
        <div style={{ background: '#FFFBF5', border: '1.5px solid #FED7AA', borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ color: '#D97706', fontWeight: 600, marginBottom: 6 }}><WarningOutlined /> 今日尚未提交反馈</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {noFeedback.map((t: any) => (
              <span key={t.id} style={{ fontSize: 12, padding: '3px 12px', borderRadius: 9999, background: '#FEF3C7', color: '#D97706' }}>{t.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Feedback list */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#98A2B3' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          {viewAll ? '暂无反馈记录' : `${date} 暂无课堂反馈`}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((item: any) => (
            <FeedbackCard key={item.id} item={item} onReply={(id, text) => handleAdminReply(id, text)} />
          ))}
        </div>
      )}
    </PageLayout>
  )
}
