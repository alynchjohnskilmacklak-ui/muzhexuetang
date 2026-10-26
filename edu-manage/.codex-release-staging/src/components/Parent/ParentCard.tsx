'use client'

import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'

export function ParentCard({ children, style, onClick, className }: {
  children: ReactNode
  style?: CSSProperties
  onClick?: () => void
  className?: string
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    onClick()
  }

  return (
    <div
      className={className}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
      background: 'var(--color-surface-1)', border: '1px solid var(--color-hairline)', borderRadius: 'var(--radius-container)',
      padding: 16, boxShadow: 'var(--shadow-raised)',
      cursor: onClick ? 'pointer' : undefined, ...style,
    }}
    >
      {children}
    </div>
  )
}
