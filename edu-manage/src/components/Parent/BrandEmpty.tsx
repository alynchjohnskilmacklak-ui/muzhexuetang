'use client'

import type { ReactNode } from 'react'
import { Button } from 'antd'
import { InboxOutlined } from '@ant-design/icons'

export function BrandEmpty({ title, hint, actionText, onAction, icon }: {
  title: string
  hint?: string
  actionText?: string
  onAction?: () => void
  icon?: ReactNode
}) {
  return (
    <div role="status" style={{ textAlign: 'center', padding: '48px 20px' }}>
      <div style={{ width: 64, height: 64, margin: '0 auto 14px', borderRadius: 14,
        background: 'var(--color-primary-bg)', border: '1px solid var(--color-hairline)', color: 'var(--color-primary)',
        display: 'grid', placeItems: 'center', fontSize: 26 }}>
        {typeof icon === 'string' || !icon ? <InboxOutlined /> : icon}
      </div>
      <div style={{ fontSize: 15, fontWeight: 650, color: 'var(--color-ink)', marginBottom: 6 }}>{title}</div>
      {hint && <div style={{ fontSize: 13, color: 'var(--color-ink-muted)', lineHeight: 1.7, maxWidth: 360, margin: '0 auto' }}>{hint}</div>}
      {actionText && onAction && (
        <Button type="primary" style={{ marginTop: 16 }} onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  )
}
