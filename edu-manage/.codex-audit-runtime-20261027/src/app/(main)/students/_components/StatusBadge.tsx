'use client'

import { Tag } from 'antd'

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  LEAD: { label: '潜客', color: '#E8784A' },
  TRIAL: { label: '试听', color: '#f5a623' },
  ACTIVE: { label: '在读', color: '#27a644' },
  COMPLETED: { label: '结课', color: '#828fff' },
  INACTIVE: { label: '离校', color: '#62666d' },
}

export function StatusBadge({
  status,
  isOwed = false,
}: {
  status: string
  isOwed?: boolean
}) {
  const config = STATUS_MAP[status] || { label: status, color: '#8a8f98' }
  const showOwed = isOwed && status === 'ACTIVE'

  return (
    <Tag
      color={showOwed ? '#e03e2d' : config.color}
      style={{ borderRadius: 9999, border: 'none', fontWeight: 600, fontSize: 12 }}
    >
      {showOwed ? '欠费' : config.label}
    </Tag>
  )
}
