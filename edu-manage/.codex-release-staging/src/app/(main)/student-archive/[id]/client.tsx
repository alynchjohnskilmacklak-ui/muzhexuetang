'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, Empty, Progress, Select, Space, Spin, Tag, Typography } from 'antd'
import type { StudentProfile } from '@/lib/student-profile'

const { Text, Paragraph } = Typography

type StageSummaryItem = {
  id: string
  status: string
  periodStart: string
  periodEnd: string
  summary: string
  suggestions?: string | null
  teacher?: { name: string } | null
}

type Payload = {
  profile: StudentProfile
  summaries: StageSummaryItem[]
  range: { from: string; to: string }
}

async function fetcher(url: string): Promise<Payload> {
  const response = await fetch(url)
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || '学情资料加载失败')
  return data
}

/** Shared learning record inside the management student's single detail page. */
export function StudentLearningRecord({ studentId }: { studentId: string }) {
  const [months, setMonths] = useState(6)
  const { data, isLoading, error } = useSWR<Payload>(
    `/api/admin/student-profile?studentId=${encodeURIComponent(studentId)}&months=${months}`,
    fetcher,
  )

  if (isLoading) return <div style={{ display: 'grid', placeItems: 'center', minHeight: 180 }}><Spin /></div>
  if (error || !data?.profile) return <Empty description={error?.message || '学习档案暂时无法加载'} />

  const { profile } = data
  const summaries = data.summaries.filter((item) => (
    item.status === 'PUBLISHED'
    && new Date(item.periodEnd) >= new Date(data.range.from)
    && new Date(item.periodEnd) <= new Date(data.range.to)
  ))
  const mastery = profile.study.mastery

  return (
    <div style={{ display: 'grid', gap: 14, marginBottom: 24, maxWidth: '100%' }}>
      <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
        <div>
          <Text strong style={{ display: 'block' }}>学习目标、薄弱点与阶段小结</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>目标和薄弱点为累计记录；阶段小结按所选时间筛选。</Text>
        </div>
        <Select
          aria-label="阶段小结时间范围"
          value={months}
          onChange={setMonths}
          style={{ width: 132 }}
          options={[1, 3, 6, 12, 24].map((value) => ({ value, label: `近 ${value} 个月` }))}
        />
      </Space>

      <Card title="知识点掌握与薄弱点" bordered={false} style={{ border: '1px solid var(--color-hairline)', borderRadius: 14 }}>
        {mastery.total > 0 ? (
          <>
            <Progress percent={mastery.masteredPct} strokeColor="var(--color-success)" />
            <Space wrap>
              <Tag color="green">已掌握 {mastery.masteredPct}%</Tag>
              <Tag color="orange">需复习 {mastery.reviewPct}%</Tag>
              <Tag color="red">薄弱 {mastery.weakPct}%</Tag>
            </Space>
          </>
        ) : <Text type="secondary">暂无试卷知识点记录</Text>}
        {profile.study.weaknesses.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text strong>当前薄弱点</Text>
            {profile.study.weaknesses.map((item) => (
              <div key={item.topic} style={{ marginTop: 8, lineHeight: 1.6 }}>
                <Tag color={item.mistakeCount >= 3 ? 'red' : 'orange'}>{item.topic} ×{item.mistakeCount}</Tag>
                {item.suggestion && <Text type="secondary">{item.suggestion}</Text>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="学习目标与阶段小结" bordered={false} style={{ border: '1px solid var(--color-hairline)', borderRadius: 14 }}>
        {profile.profileCase.goals.length ? profile.profileCase.goals.map((goal) => (
          <div key={`${goal.subject}-${goal.goalDesc}`} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap' }}>
            <Text>{goal.subject}：{goal.goalDesc}</Text>
            <Tag color={goal.isAchieved ? 'green' : 'blue'}>{goal.isAchieved ? '已达成' : '进行中'}</Tag>
          </div>
        )) : <Text type="secondary">暂无学习目标</Text>}
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--color-hairline)' }}>
          <Text strong>已发布的阶段小结</Text>
          {summaries.length ? summaries.map((item) => (
            <div key={item.id} style={{ marginTop: 12, paddingBottom: 12, borderBottom: '1px solid var(--color-hairline)' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {item.teacher?.name || '任课教师'} · {item.periodStart.slice(0, 10)} 至 {item.periodEnd.slice(0, 10)}
              </Text>
              <Paragraph style={{ margin: '6px 0', whiteSpace: 'pre-wrap' }}>{item.summary}</Paragraph>
              {item.suggestions && <Paragraph type="secondary" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>建议：{item.suggestions}</Paragraph>}
            </div>
          )) : <div style={{ marginTop: 8 }}><Text type="secondary">所选时间内暂无已发布的阶段小结</Text></div>}
        </div>
      </Card>
    </div>
  )
}
