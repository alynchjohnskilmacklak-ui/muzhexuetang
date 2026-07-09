'use client'

import { Card, Collapse, Tag, Typography } from 'antd'
import { CheckCircleOutlined, GiftOutlined } from '@ant-design/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { resolveTier, TEACHER_TIERS, TIER_QUICK_PERKS, TIER_THEME } from '@/constants/teacher-tier'

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
      <Card bordered={false} style={{ borderRadius: 14, border: `1px solid ${theme.border}`, background: theme.bg }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <Text style={{ color: theme.accent, fontSize: 12, fontWeight: 700, letterSpacing: .6 }}>MUZHE ACADEMY</Text>
            <Title level={2} style={{ margin: '5px 0 4px', color: '#1a1201' }}>我的福利</Title>
            <Text style={{ color: '#5a4e3a' }}>{teacherName}老师，感谢您为课堂与孩子成长持续付出。</Text>
          </div>
          <Tag style={{ margin: 0, background: '#fff', borderColor: theme.border, color: theme.accent, borderRadius: 999, padding: '4px 12px', fontWeight: 700 }}>
            {tier === 'SENIOR' && <span style={{ color: theme.gold, marginRight: 4 }}>★</span>}
            {theme.label}
          </Tag>
        </div>
      </Card>

      <Card bordered={false} style={{ borderRadius: 14, border: '1px solid rgba(0,0,0,.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <GiftOutlined style={{ color: theme.accent, fontSize: 20 }} />
          <Text strong>当前等级核心福利</Text>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {TIER_QUICK_PERKS[tier].map((perk) => (
            <div key={perk} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, padding: '10px 12px', borderRadius: 10, background: theme.bg, color: '#5a4e3a', lineHeight: 1.6 }}>
              <CheckCircleOutlined style={{ color: theme.accent, marginTop: 4 }} />
              <span>{perk}</span>
            </div>
          ))}
        </div>
      </Card>

      <section>
        <Title level={4} style={{ margin: '2px 0 10px', fontSize: 16 }}>等级对比</Title>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10 }}>
          {TEACHER_TIERS.map((level) => {
            const itemTheme = TIER_THEME[level]
            const active = level === tier
            return (
              <Card key={level} bordered={false} style={{ borderRadius: 14, border: `1px solid ${active ? itemTheme.border : 'rgba(0,0,0,.06)'}`, background: active ? itemTheme.bg : '#fff' }} styles={{ body: { padding: 14 } }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 9 }}>
                  <Text strong style={{ color: itemTheme.accent }}>{level === 'SENIOR' && <span style={{ color: itemTheme.gold, marginRight: 4 }}>★</span>}{itemTheme.label}</Text>
                  {active && <Tag color="success" style={{ margin: 0, borderRadius: 999 }}>当前</Tag>}
                </div>
                <div style={{ display: 'grid', gap: 5 }}>
                  {TIER_QUICK_PERKS[level].map((perk) => <Text key={perk} type="secondary" style={{ fontSize: 12 }}>· {perk}</Text>)}
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      <Collapse
        style={{ background: '#fff', border: '1px solid rgba(0,0,0,.06)', borderRadius: 14 }}
        items={[{
          key: 'full',
          label: <Text strong>完整说明</Text>,
          children: (
            <div className="membership-markdown teacher-benefits-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              <Text className="teacher-benefits-mobile-table-note" type="secondary">完整等级对照已整理在上方卡片中。</Text>
            </div>
          ),
        }]}
      />

      <style jsx global>{`
        .teacher-benefits-mobile-table-note { display: none; }
        @media (max-width: 767px) {
          .teacher-benefits-markdown table { display: none; }
          .teacher-benefits-mobile-table-note { display: block; margin-top: 12px; }
        }
      `}</style>
    </div>
  )
}
