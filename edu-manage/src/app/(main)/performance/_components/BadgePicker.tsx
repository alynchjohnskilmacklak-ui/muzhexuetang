'use client'

import { Space, Tag } from 'antd'
import { PERFORMANCE_BADGES } from '@/lib/mood-meta'

export function BadgePicker({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const selected = value[0] || ''

  return (
    <Space wrap>
      {PERFORMANCE_BADGES.map((badge) => {
        const active = selected === badge.type
        return (
          <Tag
            key={badge.type}
            onClick={() => onChange(active ? [] : [badge.type])}
            style={{
              cursor: 'pointer',
              border: `1px solid ${active ? '#f5a623' : '#23252a'}`,
              padding: '6px 12px',
              background: active ? 'rgba(245,166,35,0.15)' : '#0f1011',
              color: active ? '#f5a623' : '#d0d6e0',
              borderRadius: 8,
            }}
          >
            <span style={{ marginRight: 6 }}>{badge.icon}</span>
            {badge.label}
          </Tag>
        )
      })}
    </Space>
  )
}
