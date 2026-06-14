'use client'

import { Input, Space, Tag } from 'antd'
import { useState } from 'react'
import { QUICK_TAGS } from '@/lib/mood-meta'

export function TagPicker({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const [custom, setCustom] = useState('')

  const toggle = (tag: string) => {
    onChange(value.includes(tag) ? value.filter((item) => item !== tag) : [...value, tag])
  }

  const addCustom = () => {
    const tag = custom.trim()
    if (!tag) return
    if (!value.includes(tag)) onChange([...value, tag])
    setCustom('')
  }

  return (
    <Space direction="vertical" size={10} style={{ width: '100%' }}>
      <Space wrap>
        {QUICK_TAGS.map((tag) => {
          const active = value.includes(tag)
          return (
            <Tag
              key={tag}
              onClick={() => toggle(tag)}
              style={{
                cursor: 'pointer',
                border: 'none',
                padding: '5px 12px',
                background: active ? '#E8784A' : '#202226',
                color: active ? '#fff' : '#d0d6e0',
              }}
            >
              {tag}
            </Tag>
          )
        })}
      </Space>
      <Input
        value={custom}
        onChange={(event) => setCustom(event.target.value)}
        onPressEnter={addCustom}
        placeholder="输入自定义标签后回车"
        maxLength={12}
      />
    </Space>
  )
}
