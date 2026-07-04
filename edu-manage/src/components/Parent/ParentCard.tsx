'use client'

import type { CSSProperties, ReactNode } from 'react'

export function ParentCard({ children, style, onClick, className }: {
  children: ReactNode
  style?: CSSProperties
  onClick?: () => void
  className?: string
}) {
  return (
    <div className={className} onClick={onClick} style={{
      background: '#fff', border: '1px solid #EEE7E1', borderRadius: 16,
      padding: 16, boxShadow: '0 1px 3px rgba(26,18,1,.04)',
      cursor: onClick ? 'pointer' : undefined, ...style,
    }}>
      {children}
    </div>
  )
}

export function SectionHeader({ title, count, extra }: { title: string; count?: number | string; extra?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 10px' }}>
      <div style={{ width: 4, height: 16, borderRadius: 2, background: '#E8784A', flexShrink: 0 }} />
      <span style={{ fontWeight: 700, fontSize: 14, color: '#1F2329' }}>{title}</span>
      {count !== undefined && <span style={{ fontSize: 12, color: '#98A2B3' }}>{count}</span>}
      {extra && <span style={{ marginLeft: 'auto' }}>{extra}</span>}
    </div>
  )
}
