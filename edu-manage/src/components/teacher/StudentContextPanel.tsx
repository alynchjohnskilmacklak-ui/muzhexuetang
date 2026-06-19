'use client'

import { useState } from 'react'
import { Card, Tag, Typography, Button, Spin, Empty, Input, Modal, Space, Select, InputNumber, Collapse } from 'antd'
import { BookOutlined, FlagOutlined, RiseOutlined, RocketOutlined, PlusOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { toast } from 'sonner'
import useSWR from 'swr'

const { Text, Paragraph } = Typography

const MOOD_LABELS: Record<string, string> = { GREAT: '很棒', GOOD: '良好', OKAY: '平稳', NEEDS_ATTENTION: '需关注' }
const MASTERY_LABELS: Record<string, { label: string; color: string }> = { MASTERED: { label: '已掌握', color: 'green' }, NEEDS_REVIEW: { label: '需复习', color: 'orange' }, NEEDS_PRACTICE: { label: '薄弱', color: 'red' } }

async function requestJson(url: string, init: RequestInit) {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}) } })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || '操作失败')
  return data
}

export function StudentContextPanel({ studentId }: { studentId: string }) {
  const router = useRouter()
  const { data, isLoading, mutate } = useSWR(`/api/teacher/students/${studentId}/context`, fetcher)
  const [goalSubj, setGoalSubj] = useState('')
  const [goalDesc, setGoalDesc] = useState('')
  const [weakTopic, setWeakTopic] = useState('')
  const [weakCount, setWeakCount] = useState<number | null>(1)
  const [summaryText, setSummaryText] = useState('')
  const [suggestionsText, setSuggestionsText] = useState('')
  const [saving, setSaving] = useState(false)

  if (isLoading) return <div style={{ padding: 20, textAlign: 'center' }}><Spin /></div>
  if (!data) return <Empty description="暂无学生数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />

  const { basic, recentFeedbacks, masteryRecords, goals, weaknesses, stageSummary, attendance, todayLessons } = data

  const addGoal = async () => {
    if (!goalSubj.trim() || !goalDesc.trim()) { toast.warning('请填写学科和目标'); return }
    try {
      await requestJson('/api/teacher/learning-goals', { method: 'POST', body: JSON.stringify({ studentId, subject: goalSubj, goalDesc }) })
      toast.success('目标已添加'); setGoalSubj(''); setGoalDesc(''); mutate()
    } catch (e: any) { toast.error(e.message) }
  }

  const addWeakness = async () => {
    if (!weakTopic.trim()) { toast.warning('请填写知识点'); return }
    try {
      await requestJson('/api/teacher/weaknesses', { method: 'POST', body: JSON.stringify({ studentId, topic: weakTopic, mistakeCount: weakCount || 1 }) })
      toast.success('薄弱点已添加'); setWeakTopic(''); setWeakCount(1); mutate()
    } catch (e: any) { toast.error(e.message) }
  }

  const saveStage = async (status: string) => {
    setSaving(true)
    try {
      const start = new Date(); start.setMonth(start.getMonth() - 3)
      const body: Record<string, unknown> = { studentId, periodStart: start.toISOString().slice(0, 10), periodEnd: new Date().toISOString().slice(0, 10), summary: summaryText, suggestions: suggestionsText }
      const d = await requestJson('/api/teacher/stage-summary', { method: 'POST', body: JSON.stringify(body) })
      if (status === 'publish') {
        await requestJson('/api/teacher/stage-summary', { method: 'PATCH', body: JSON.stringify({ id: d.stageSummary.id, action: 'publish' }) })
        toast.success('寄语已发布，家长可见')
      } else { toast.success('草稿已保存') }
      setSummaryText(''); setSuggestionsText(''); mutate()
    } catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  // Pre-fill summary from existing draft
  if (stageSummary && !summaryText && !suggestionsText) {
    // Don't auto-fill in render, use effect would be better but we keep it simple
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 'min(600px, 70vh)', overflow: 'auto' }}>
      {/* Basic info */}
      <Card size="small" style={{ borderRadius: 10, border: '1px solid #EEE7E1', background: '#FFFBF7' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><Text strong style={{ fontSize: 14 }}>{basic.name}</Text>
            <div style={{ fontSize: 11, color: '#7A869A', marginTop: 2 }}>{[basic.grade, basic.school].filter(Boolean).join(' / ')}</div></div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#7A869A' }}>课时 <strong style={{ color: '#E8784A' }}>{basic.remainHours}h</strong></div>
            <div style={{ fontSize: 11, color: '#7A869A' }}>出勤 <strong style={{ color: attendance.rate != null ? '#1D9E75' : '#7A869A' }}>{attendance.rate != null ? `${attendance.rate}%` : '—'}</strong></div>
          </div>
        </div>
      </Card>

      {/* Recent feedbacks */}
      <Card size="small" style={{ borderRadius: 10, border: '1px solid #EEE7E1' }}>
        <Text strong style={{ fontSize: 12 }}>最近反馈</Text>
        {recentFeedbacks?.length > 0 ? recentFeedbacks.map((f: any) => (
          <div key={f.id} style={{ marginTop: 4, padding: '4px 6px', background: '#F9F7FF', borderRadius: 6, fontSize: 11 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Tag style={{ borderRadius: 9999, fontSize: 9, margin: 0 }}>{f.mood ? MOOD_LABELS[f.mood] || f.mood : '—'}</Tag>
              <Text type="secondary" style={{ fontSize: 9 }}>{format(new Date(f.createdAt), 'MM/dd')}</Text>
            </div>
            <Paragraph style={{ margin: '2px 0 0', fontSize: 10 }} ellipsis={{ rows: 1 }}>{f.overallComment || f.summary || '—'}</Paragraph>
            <div style={{ fontSize: 9, color: '#7A869A' }}>{f.imageCount > 0 && `📷${f.imageCount} `}{f.parentReplied ? '家长已回复' : ''}</div>
          </div>
        )) : <Text type="secondary" style={{ fontSize: 10 }}>暂无</Text>}
      </Card>

      {/* Mastery */}
      {masteryRecords?.length > 0 && (
        <Card size="small" style={{ borderRadius: 10, border: '1px solid #EEE7E1' }}>
          <Text strong style={{ fontSize: 12 }}>知识掌握</Text>
          {masteryRecords.map((m: any) => (
            <div key={m.id} style={{ marginTop: 2, display: 'flex', gap: 4, alignItems: 'center' }}>
              <Tag color={MASTERY_LABELS[m.level]?.color} style={{ borderRadius: 9999, fontSize: 9, margin: 0 }}>{MASTERY_LABELS[m.level]?.label || m.level}</Tag>
              <Text style={{ fontSize: 10 }}>{m.knowledgePoint}</Text>
            </div>
          ))}
        </Card>
      )}

      {/* Goals + editor */}
      <Card size="small" style={{ borderRadius: 10, border: '1px solid #EEE7E1' }}>
        <Text strong style={{ fontSize: 12 }}><FlagOutlined /> 学习目标</Text>
        {goals?.map((g: any) => <div key={g.id} style={{ fontSize: 10, color: '#5a4e3a', marginTop: 1 }}>{g.goalDesc} ({g.subject})</div>)}
        {(!goals || goals.length === 0) && <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>暂无</Text>}
        <Space.Compact style={{ marginTop: 6, width: '100%' }}>
          <Input size="small" placeholder="学科" value={goalSubj} onChange={e => setGoalSubj(e.target.value)} style={{ width: 60 }} />
          <Input size="small" placeholder="目标描述" value={goalDesc} onChange={e => setGoalDesc(e.target.value)} style={{ flex: 1 }} />
          <Button size="small" icon={<PlusOutlined />} onClick={addGoal} />
        </Space.Compact>
      </Card>

      {/* Weaknesses + editor */}
      <Card size="small" style={{ borderRadius: 10, border: '1px solid #EEE7E1' }}>
        <Text strong style={{ fontSize: 12 }}>薄弱点</Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 3 }}>
          {weaknesses?.slice(0, 5).map((w: any) => <Tag key={w.id} color={w.mistakeCount >= 3 ? 'red' : 'orange'} style={{ borderRadius: 9999, fontSize: 9, margin: 0 }}>{w.topic}{w.mistakeCount > 1 ? ` ×${w.mistakeCount}` : ''}</Tag>)}
        </div>
        <Space.Compact style={{ marginTop: 6, width: '100%' }}>
          <Input size="small" placeholder="知识点" value={weakTopic} onChange={e => setWeakTopic(e.target.value)} style={{ flex: 1 }} />
          <InputNumber size="small" min={1} value={weakCount} onChange={v => setWeakCount(v)} style={{ width: 50 }} />
          <Button size="small" icon={<PlusOutlined />} onClick={addWeakness} />
        </Space.Compact>
      </Card>

      {/* Stage summary + editor */}
      <Card size="small" style={{ borderRadius: 10, border: '1px solid #FFF0D5', background: '#FFFCF5' }}>
        <Text strong style={{ fontSize: 12 }}><RocketOutlined /> 阶段寄语</Text>
        {stageSummary ? (
          <Paragraph style={{ margin: '4px 0 0', fontSize: 10 }} ellipsis={{ rows: 2 }}>{stageSummary.summary}</Paragraph>
        ) : <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>暂未发布</Text>}
        <Input.TextArea size="small" rows={2} placeholder="教师寄语..." value={summaryText} onChange={e => setSummaryText(e.target.value)} style={{ marginTop: 6, fontSize: 11 }} />
        <Input size="small" placeholder="下一步建议（可选）" value={suggestionsText} onChange={e => setSuggestionsText(e.target.value)} style={{ marginTop: 4, fontSize: 11 }} />
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <Button size="small" icon={<SaveOutlined />} loading={saving} onClick={() => saveStage('draft')}>草稿</Button>
          <Button size="small" type="primary" icon={<SendOutlined />} loading={saving} onClick={() => saveStage('publish')} style={{ background: '#E8784A', borderColor: '#E8784A' }}>发布</Button>
        </div>
      </Card>

      <Button type="link" size="small" icon={<RiseOutlined />} onClick={() => router.push(`/teacher/student/${studentId}`)} style={{ alignSelf: 'flex-end', padding: 0 }}>
        完整工作台 →
      </Button>
    </div>
  )
}

const fetcher = (url: string) => fetch(url).then(r => r.json())
