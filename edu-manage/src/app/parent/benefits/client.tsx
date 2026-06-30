'use client'

import { Card, Tag, Typography } from 'antd'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MEMBERSHIP_THEME, resolveMembership } from '@/constants/membership'

const { Title, Text } = Typography

export function BenefitsClient({ content, studentName, membershipLevel }: { content: string; studentName: string; membershipLevel: string }) {
  const level = resolveMembership(membershipLevel)
  const theme = MEMBERSHIP_THEME[level]
  const showBadge = level === 'VIP' || level === 'SVIP'

  return (
    <div style={{ width: '100%', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0, color: '#1a1201' }}>会员权益</Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <Text style={{ color: '#5a4e3a' }}>{studentName ? `${studentName} 当前等级` : '当前等级'}：{theme.label}</Text>
          {showBadge && (
            <Tag style={{ margin: 0, borderRadius: 999, background: theme.bg, borderColor: theme.border, color: theme.accent, fontWeight: 700 }}>
              {level === 'SVIP' && <span style={{ color: theme.gold, marginRight: 3 }}>★</span>}{theme.badge}
            </Tag>
          )}
        </div>
      </div>

      <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)', background: '#fff' }} styles={{ body: { padding: '20px 22px' } }}>
        <div className="membership-markdown">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ children }) => <div style={{ overflowX: 'auto', margin: '16px 0' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 680 }}>{children}</table></div>,
              th: ({ children }) => <th style={{ padding: '10px 12px', border: '1px solid rgba(0,0,0,.08)', background: '#faf8f5', textAlign: 'left' }}>{children}</th>,
              td: ({ children }) => <td style={{ padding: '10px 12px', border: '1px solid rgba(0,0,0,.08)', verticalAlign: 'top' }}>{children}</td>,
            }}
          >{content}</ReactMarkdown>
        </div>
      </Card>
    </div>
  )
}
