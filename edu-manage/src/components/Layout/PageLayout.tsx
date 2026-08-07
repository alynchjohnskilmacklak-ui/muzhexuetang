'use client'

import { ReactNode } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'

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
  const isMobile = useIsMobile() ?? false

  return (
    <div style={{ position: 'relative', minHeight: '100%', width: '100%', maxWidth: '100%', overflowX: 'clip' }}>
      {/* Logo watermark — fixed bottom-right */}
      <div
        style={{
          position: 'fixed',
          right: isMobile ? '12px' : '60px',
          bottom: isMobile ? '20px' : '40px',
          width: isMobile ? '160px' : '280px',
          height: isMobile ? '92px' : '160px',
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
          alignItems: isMobile ? 'stretch' : 'center',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          gap: isMobile ? '12px' : '16px',
          marginBottom: '16px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ minWidth: 0, width: isMobile ? '100%' : 'auto' }}>
          <h1 style={{ fontSize: isMobile ? '24px' : '20px', lineHeight: 1.25, fontWeight: 600, margin: 0, color: '#1a1201', wordBreak: 'keep-all' }}>{title}</h1>
          {subtitle && (
            <div style={{ fontSize: '13px', color: '#9a8e7a', marginTop: 4 }}>
              {subtitle}
            </div>
          )}
        </div>
        {actions && <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: isMobile ? '100%' : 'auto' }}>{actions}</div>}
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}
