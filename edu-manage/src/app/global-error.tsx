'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="zh-CN">
      <body style={{ margin: 0 }}>
        <main style={{ minHeight: '100vh', background: '#F7F4EF', display: 'grid', placeItems: 'center', padding: 24, boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
          <section style={{ width: 'min(92vw, 460px)', boxSizing: 'border-box', background: '#fff', border: '1px solid #EEE7E1', borderRadius: 18, padding: '36px 28px', textAlign: 'center', boxShadow: '0 12px 36px rgba(26,18,1,.08)' }}>
            <Image src="/images/logo.jpg" alt="牧哲学堂" width={160} height={44} style={{ objectFit: 'contain' }} />
            <h1 style={{ margin: '22px 0 8px', color: '#1A1201', fontSize: 26 }}>页面开小差了</h1>
            <p style={{ margin: '0 0 24px', color: '#7A6E60', lineHeight: 1.7 }}>系统暂时没有响应，请稍后重试</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" onClick={reset} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #E8784A', background: '#E8784A', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>重试</button>
              <Link href="/" style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #E8784A', color: '#E8784A', textDecoration: 'none', fontWeight: 700 }}>返回首页</Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  )
}
