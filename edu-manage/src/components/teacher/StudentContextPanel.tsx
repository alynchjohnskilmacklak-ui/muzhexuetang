'use client'

import { Card, Tag, Typography, Button, Progress, Spin, Empty } from 'antd'
import { BookOutlined, FlagOutlined, RiseOutlined, RocketOutlined, TrophyOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import useSWR from 'swr'

const { Text, Paragraph } = Typography

const MOOD_LABELS: Record<string, string> = {
  GREAT: '很棒', GOOD: '良好', OKAY: '平稳', NEEDS_ATTENTION: '需关注',
}
const MASTERY_LABELS: Record<string, { label: string; color: string }> = {
  MASTERED: { label: '已掌握', color: 'green' },
  NEEDS_REVIEW: { label: '需复习', color: 'orange' },
  NEEDS_PRACTICE: { label: '薄弱', color: 'red' },
}

export function StudentContextPanel({ studentId }: { studentId: string }) {
  const router = useRouter()
  const { data, isLoading } = useSWR(`/api/teacher/students/${studentId}/context`, fetcher)

  if (isLoading) return <div style={{ padding: 20, textAlign: 'center' }}><Spin /></div>
  if (!data) return <Empty description="暂无学生数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />

  const { basic, recentFeedbacks, masteryRecords, goals, weaknesses, stageSummary, attendance, todayLessons } = data

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Basic info */}
      <Card size="small" style={{ borderRadius: 10, border: '1px solid #EEE7E1', background: '#FFFBF7' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text strong style={{ fontSize: 14 }}>{basic.name}</Text>
            <div style={{ fontSize: 11, color: '#7A869A', marginTop: 2 }}>
              {[basic.grade, basic.school].filter(Boolean).join(' / ')}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#7A869A' }}>剩余课时 <strong style={{ color: '#E8784A' }}>{basic.remainHours}h</strong></div>
            <div style={{ fontSize: 11, color: '#7A869A' }}>
              出勤率 <strong style={{ color: attendance.rate != null ? '#1D9E75' : '#7A869A' }}>{attendance.rate != null ? `${attendance.rate}%` : '—'}</strong>
            </div>
          </div>
        </div>
      </Card>

      {/* Today lessons */}
      {todayLessons?.length > 0 && (
        <Card size="small" style={{ borderRadius: 10, border: '1px solid #EEE7E1' }}>
          <Text strong style={{ fontSize: 12 }}>今日课程</Text>
          {todayLessons.map((l: any) => (
            <div key={l.id} style={{ fontSize: 11, color: '#5a4e3a', marginTop: 2 }}>
              {format(new Date(l.date), 'MM/dd')} {l.time} {l.course}
            </div>
          ))}
        </Card>
      )}

      {/* Recent feedbacks */}
      <Card size="small" style={{ borderRadius: 10, border: '1px solid #EEE7E1' }}>
        <Text strong style={{ fontSize: 12 }}>最近反馈</Text>
        {recentFeedbacks?.length > 0 ? recentFeedbacks.map((f: any) => (
          <div key={f.id} style={{ marginTop: 6, padding: '6px 8px', background: '#F9F7FF', borderRadius: 6, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Tag style={{ borderRadius: 9999, fontSize: 10, margin: 0 }}>
                {f.mood ? MOOD_LABELS[f.mood] || f.mood : '—'}
              </Tag>
              <Text type="secondary" style={{ fontSize: 10 }}>{format(new Date(f.createdAt), 'MM/dd')}</Text>
            </div>
            <Paragraph style={{ margin: '4px 0 0', fontSize: 11 }} ellipsis={{ rows: 2 }}>{f.overallComment || f.summary || '—'}</Paragraph>
            <div style={{ fontSize: 10, color: '#7A869A' }}>
              {f.imageCount > 0 && `📷${f.imageCount}张 `}
              {f.parentReplied ? <span style={{ color: '#1D9E75' }}>家长已回复</span> : ''}
            </div>
          </div>
        )) : <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>暂无反馈</Text>}
      </Card>

      {/* Mastery */}
      {masteryRecords?.length > 0 && (
        <Card size="small" style={{ borderRadius: 10, border: '1px solid #EEE7E1' }}>
          <Text strong style={{ fontSize: 12 }}>知识掌握</Text>
          {masteryRecords.map((m: any) => (
            <div key={m.id} style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
              <Tag color={MASTERY_LABELS[m.level]?.color} style={{ borderRadius: 9999, fontSize: 10, margin: 0 }}>
                {MASTERY_LABELS[m.level]?.label || m.level}
              </Tag>
              <Text style={{ fontSize: 11 }}>{m.knowledgePoint}</Text>
            </div>
          ))}
        </Card>
      )}

      {/* Goals */}
      {goals?.length > 0 && (
        <Card size="small" style={{ borderRadius: 10, border: '1px solid #EEE7E1' }}>
          <Text strong style={{ fontSize: 12 }}><FlagOutlined /> 学习目标</Text>
          {goals.map((g: any) => (
            <div key={g.id} style={{ fontSize: 11, color: '#5a4e3a', marginTop: 2 }}>
              {g.goalDesc} ({g.subject})
            </div>
          ))}
        </Card>
      )}

      {/* Weaknesses */}
      {weaknesses?.length > 0 && (
        <Card size="small" style={{ borderRadius: 10, border: '1px solid #EEE7E1' }}>
          <Text strong style={{ fontSize: 12 }}>薄弱点</Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {weaknesses.slice(0, 5).map((w: any) => (
              <Tag key={w.id} color={w.mistakeCount >= 3 ? 'red' : 'orange'} style={{ borderRadius: 9999, fontSize: 10, margin: 0 }}>
                {w.topic}{w.mistakeCount > 1 ? ` ×${w.mistakeCount}` : ''}
              </Tag>
            ))}
          </div>
        </Card>
      )}

      {/* Stage summary */}
      {stageSummary && (
        <Card size="small" style={{ borderRadius: 10, border: '1px solid #FFF0D5', background: '#FFFCF5' }}>
          <Text strong style={{ fontSize: 12 }}><RocketOutlined /> 阶段寄语</Text>
          <Paragraph style={{ margin: '4px 0 0', fontSize: 11 }} ellipsis={{ rows: 2 }}>{stageSummary.summary}</Paragraph>
          <div style={{ fontSize: 10, color: '#7A869A', marginTop: 2 }}>
            {format(new Date(stageSummary.periodStart), 'M/d')} - {format(new Date(stageSummary.periodEnd), 'M/d')}
          </div>
        </Card>
      )}

      {/* Enter workbench */}
      <Button type="link" size="small" icon={<RiseOutlined />}
        onClick={() => router.push(`/teacher/student/${studentId}`)}
        style={{ alignSelf: 'flex-end', padding: 0 }}>
        查看完整学生工作台 →
      </Button>
    </div>
  )
}

const fetcher = (url: string) => fetch(url).then(r => r.json())
