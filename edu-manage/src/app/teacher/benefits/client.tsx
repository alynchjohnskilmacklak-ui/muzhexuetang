'use client'

import { Card, Tag, Typography } from 'antd'
import { GiftOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { resolveTier, TIER_THEME } from '@/constants/teacher-tier'

const { Title, Text } = Typography

export function TeacherBenefitsClient({ content, teacherName, tierLevel }: {
  content: string
  teacherName: string
  tierLevel: string
}) {
  const tier = resolveTier(tierLevel)
  const theme = TIER_THEME[tier]

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <Text style={{ color: '#3E8E6E', fontSize: 12, fontWeight: 700, letterSpacing: .6 }}>MUZHE ACADEMY</Text>
          <Title level={2} style={{ margin: '4px 0' }}>我的福利</Title>
          <Text type="secondary">{teacherName}老师，感谢您为课堂与孩子成长持续付出。</Text>
        </div>
        <Tag style={{ margin: 0, background: theme.bg, borderColor: theme.border, color: theme.accent, borderRadius: 999, padding: '4px 12px', fontWeight: 700 }}>
          {tier === 'SENIOR' && <span style={{ color: theme.gold, marginRight: 4 }}>★</span>}
          {theme.label}
        </Tag>
      </header>

      <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <GiftOutlined style={{ color: theme.accent, fontSize: 20 }} />
          <Text strong>教师等级与福利说明</Text>
        </div>
        <div className="membership-markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </Card>
    </div>
  )
}
