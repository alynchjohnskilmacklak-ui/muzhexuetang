'use client'

import { ReactNode } from 'react'

export function PageLayout({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <div style={{ position: 'relative', minHeight: '100%' }}>
      {/* Logo watermark — fixed bottom-right */}
      <div
        style={{
          position: 'fixed',
          right: '60px',
          bottom: '40px',
          width: '280px',
          height: '160px',
          backgroundImage: 'url(/images/logo.jpg)',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right bottom',
          opacity: 0.035,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Brand quote bar */}
      <div
        style={{
          borderLeft: '3px solid #E8784A',
          borderRadius: '0 8px 8px 0',
          padding: '8px 14px',
          marginBottom: '16px',
          background: 'rgba(232,120,74,.04)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 500, color: '#E8784A', marginBottom: '2px' }}>
          牧哲学堂
        </div>
        <div style={{
          fontSize: '11px',
          color: '#9a8e7a',
          lineHeight: 1.8,
          fontStyle: 'italic',
        }}>
          在思想的原野上，放牧星辰 · 这里不是填满答案的工坊，而是点燃火光的山谷。
          当公式与诗句在风中交织，当逻辑的刻刀与想象的诗筏共舞——
          我们以「牧者」之名，俯身轻抚每一粒思想的种子。
        </div>
      </div>

      {/* Title row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 500, margin: 0, color: '#1a1201' }}>{title}</h1>
          {subtitle && (
            <div style={{ fontSize: '13px', color: '#9a8e7a', marginTop: 4 }}>
              {subtitle}
            </div>
          )}
        </div>
        {actions && <div style={{ display: 'flex', gap: '8px' }}>{actions}</div>}
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}
