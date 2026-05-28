'use client'

import { Card, Typography } from 'antd'
import { useRouter } from 'next/navigation'
import type { OperatingHighlight } from '@/types/dashboard'

const { Title, Text } = Typography

const toneStyles: Record<OperatingHighlight['tone'], { color: string; bg: string }> = {
  orange: { color: '#E87545', bg: 'rgba(232,117,69,0.09)' },
  red: { color: '#d9363e', bg: 'rgba(217,54,62,0.08)' },
  blue: { color: '#1677ff', bg: 'rgba(22,119,255,0.08)' },
  purple: { color: '#722ed1', bg: 'rgba(114,46,209,0.08)' },
  green: { color: '#1D9E75', bg: 'rgba(29,158,117,0.08)' },
}

export function OperationHighlightsCard({ data }: { data: OperatingHighlight[] }) {
  const router = useRouter()

  return (
    <Card bordered={false} style={{ borderRadius: 16, marginTop: 16 }} styles={{ body: { padding: 20 } }}>
      <Title level={5} style={{ marginBottom: 14 }}>运营关键提醒</Title>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {data.map((item) => {
          const tone = toneStyles[item.tone]
          return (
            <button
              key={item.label}
              onClick={() => router.push(item.href)}
              style={{
                minHeight: 82,
                padding: '14px 16px',
                borderRadius: 14,
                border: `1px solid ${tone.color}20`,
                background: tone.bg,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 800, color: tone.color, lineHeight: 1 }}>
                {item.value}
              </div>
              <Text style={{ display: 'block', marginTop: 8, color: '#5a4e3a' }}>{item.label}</Text>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
