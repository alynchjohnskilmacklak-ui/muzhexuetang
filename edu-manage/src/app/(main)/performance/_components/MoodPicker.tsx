'use client'

import { Button, Space } from 'antd'
import { MOOD_META } from '@/lib/mood-meta'

export type MoodValue = keyof typeof MOOD_META

export function MoodPicker({ value, onChange }: { value: MoodValue; onChange: (value: MoodValue) => void }) {
  return (
    <Space wrap>
      {(Object.keys(MOOD_META) as MoodValue[]).map((mood) => {
        const item = MOOD_META[mood]
        const active = value === mood
        return (
          <Button
            key={mood}
            onClick={() => onChange(mood)}
            style={{
              borderColor: active ? item.color : '#23252a',
              background: active ? `${item.color}22` : '#0f1011',
              color: active ? item.color : '#d0d6e0',
              fontWeight: active ? 700 : 500,
            }}
          >
            <span style={{ marginRight: 6 }}>{item.icon}</span>
            {item.label}
          </Button>
        )
      })}
    </Space>
  )
}
