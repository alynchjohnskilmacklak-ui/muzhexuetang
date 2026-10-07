'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export function AppErrorState({
  error,
  retry,
  homeHref,
  homeLabel,
}: {
  error: Error & { digest?: string }
  retry: () => void
  homeHref: string
  homeLabel: string
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main style={{ minHeight: '100dvh', background: 'var(--color-canvas, #faf8f5)', display: 'grid', placeItems: 'center', padding: 24, boxSizing: 'border-box' }}>
      <section role="alert" style={{ width: 'min(92vw, 460px)', boxSizing: 'border-box', background: 'var(--color-surface-1, #fff)', border: '1px solid var(--color-hairline, #eee7e1)', borderRadius: 'var(--radius-lg, 14px)', padding: '36px 28px', textAlign: 'center' }}>
        <Image src="/images/logo.jpg" alt="牧哲学堂" width={64} height={64} style={{ borderRadius: 14, objectFit: 'cover' }} />
        <h1 style={{ margin: '22px 0 8px', color: 'var(--color-ink, #1a1201)', fontSize: 26 }}>页面暂时无法加载</h1>
        <p style={{ margin: '0 0 24px', color: 'var(--color-ink-muted, #7a6e60)', lineHeight: 1.7 }}>请检查网络后重试；如果问题持续存在，可以先返回首页继续使用其他功能。</p>
        {error.digest && <p style={{ margin: '-12px 0 20px', color: 'var(--color-ink-subtle, #8d806f)', fontSize: 12 }}>问题编号：{error.digest}</p>}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={retry} style={{ minHeight: 44, padding: '10px 20px', borderRadius: 10, border: '1px solid var(--color-primary, #e8784a)', background: 'var(--color-primary, #e8784a)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>重新加载</button>
          <Link href={homeHref} style={{ minHeight: 44, boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center', padding: '10px 20px', borderRadius: 10, border: '1px solid var(--color-primary, #e8784a)', color: 'var(--color-primary, #e8784a)', textDecoration: 'none', fontWeight: 700 }}>{homeLabel}</Link>
        </div>
      </section>
    </main>
  )
}
