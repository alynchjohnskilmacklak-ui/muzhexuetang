'use client'

import type { ReactNode } from 'react'
import { Button } from 'antd'

export function BrandEmpty({ title, hint, actionText, onAction, icon }: {
  title: string
  hint?: string
  actionText?: string
  onAction?: () => void
  icon?: ReactNode
}) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 20px' }}>
      <div style={{ width: 72, height: 72, margin: '0 auto 14px', borderRadius: 24,
        background: 'linear-gradient(145deg,#FFF3EC,#FFFDF9)', border: '1px solid #F5E3D7',
        display: 'grid', placeItems: 'center', fontSize: 30 }}>
        {icon ?? '📭'}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#1F2329', marginBottom: 6 }}>{title}</div>
      {hint && <div style={{ fontSize: 13, color: '#98A2B3', lineHeight: 1.7, maxWidth: 260, margin: '0 auto' }}>{hint}</div>}
      {actionText && onAction && (
        <Button type="primary" style={{ marginTop: 16, background: '#E8784A', borderColor: '#E8784A', borderRadius: 20 }} onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  )
}
