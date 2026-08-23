'use client'

import { ReactNode } from 'react'
import { useIsMobile } from '@/hooks/useIsMobile'
import { WorkspacePageHeader } from '@/components/Common/WorkspacePageHeader'

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

      <WorkspacePageHeader
        eyebrow="牧哲学堂 · 管理工作台"
        title={title}
        subtitle={subtitle}
        actions={actions}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}
