'use client'

import { Tag } from 'antd'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  LEAD: { label: '潜客', color: '#E8784A' },
  TRIAL: { label: '试听', color: '#f5a623' },
  ACTIVE: { label: '在读', color: '#27a644' },
  COMPLETED: { label: '结课', color: '#828fff' },
  INACTIVE: { label: '离校', color: '#62666d' },
}

export function StatusBadge({ status, remainHours }: { status: string; remainHours?: number }) {
  const config = STATUS_MAP[status] || { label: status, color: '#8a8f98' }
  const isOwed = typeof remainHours === 'number' && remainHours <= 0 && status === 'ACTIVE'

  return (
    <Tag
      color={isOwed ? '#e03e2d' : config.color}
      style={{ borderRadius: 9999, border: 'none', fontWeight: 600, fontSize: 12 }}
    >
      {isOwed ? '欠费' : config.label}
    </Tag>
  )
}
