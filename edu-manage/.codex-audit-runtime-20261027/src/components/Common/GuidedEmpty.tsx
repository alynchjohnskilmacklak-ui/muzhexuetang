'use client'

import type { ReactNode } from 'react'
import { Button, Space, Typography } from 'antd'
import { InboxOutlined } from '@ant-design/icons'

const { Text } = Typography

type GuidedEmptyProps = {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  actionIcon?: ReactNode
  icon?: ReactNode
  compact?: boolean
}

export function GuidedEmpty({
  title,
  description,
  actionLabel,
  onAction,
  actionIcon,
  icon,
  compact = false,
}: GuidedEmptyProps) {
  return (
    <div role="status" style={{ padding: compact ? '20px 12px' : '36px 20px', textAlign: 'center' }}>
      <div style={{
        display: 'grid',
        width: compact ? 48 : 60,
        height: compact ? 48 : 60,
        margin: '0 auto 12px',
        placeItems: 'center',
        color: 'var(--color-primary)',
        fontSize: compact ? 21 : 25,
        background: 'var(--color-primary-bg)',
        border: '1px solid var(--color-hairline)',
        borderRadius: 14,
      }}>
        {icon || <InboxOutlined />}
      </div>
      <Space direction="vertical" size={5} style={{ width: '100%', maxWidth: 420 }}>
        <Text strong style={{ color: 'var(--color-ink)', fontSize: compact ? 14 : 15 }}>{title}</Text>
        <Text style={{ color: 'var(--color-ink-muted)', lineHeight: 1.7 }}>{description}</Text>
      </Space>
      {actionLabel && onAction ? (
        <div style={{ marginTop: 16 }}>
          <Button type="primary" icon={actionIcon} onClick={onAction}>{actionLabel}</Button>
        </div>
      ) : null}
    </div>
  )
}
