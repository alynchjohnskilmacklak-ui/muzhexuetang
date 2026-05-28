'use client'

import { Tooltip } from 'antd'
import { PERFORMANCE_BADGES } from '@/lib/performance'

export function BadgeWall({ earned }: { earned: string[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
      {PERFORMANCE_BADGES.map((badge) => {
        const active = earned.includes(badge.type)
        return (
          <Tooltip key={badge.type} title={badge.label}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 8,
                border: `1px solid ${active ? '#f5a62366' : '#23252a'}`,
                background: active ? 'rgba(245,166,35,0.12)' : '#0f1011',
                opacity: active ? 1 : 0.38,
                color: active ? '#f5a623' : '#8a8f98',
                minWidth: 0,
              }}
            >
              <span>{badge.icon}</span>
              <span style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{badge.label}</span>
            </div>
          </Tooltip>
        )
      })}
    </div>
  )
}
