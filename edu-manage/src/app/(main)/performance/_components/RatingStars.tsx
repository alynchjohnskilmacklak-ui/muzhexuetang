'use client'

import { Rate, Space } from 'antd'
import { RATING_LABELS } from '@/lib/mood-meta'

export type RatingMap = Record<keyof typeof RATING_LABELS, number>

export function RatingStars({ value, onChange }: { value: RatingMap; onChange: (value: RatingMap) => void }) {
  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      {(Object.keys(RATING_LABELS) as Array<keyof typeof RATING_LABELS>).map((key) => (
        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <span style={{ color: '#d0d6e0', fontSize: 13 }}>{RATING_LABELS[key]}</span>
          <Rate
            value={value[key]}
            onChange={(next) => onChange({ ...value, [key]: next })}
            style={{ color: '#f5a623', fontSize: 17 }}
          />
        </div>
      ))}
    </Space>
  )
}
