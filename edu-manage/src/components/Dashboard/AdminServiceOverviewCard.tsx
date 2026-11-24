'use client'

import Link from 'next/link'
import { AppstoreOutlined, RightOutlined } from '@ant-design/icons'

export function AdminServiceOverviewCard() {
  return (
    <Link
      href="/services"
      aria-label="打开业务总览"
      className="pressable"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        maxWidth: '100%',
        marginBottom: 16,
        padding: '14px 16px',
        borderRadius: 14,
        border: '1px solid rgba(83,74,183,.14)',
        background: '#fff',
        boxShadow: '0 2px 8px rgba(58,50,39,.04)',
        color: 'var(--color-ink, #1a1201)',
        textDecoration: 'none',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'rgba(83,74,183,.08)',
          color: '#534AB7',
          fontSize: 18,
        }}
      >
        <AppstoreOutlined />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}>
          业务总览
        </span>
        <span style={{ display: 'block', marginTop: 2, color: 'var(--color-ink-muted, #5a4e3a)', fontSize: 12, lineHeight: 1.4 }}>
          集中查看业务服务与运营入口
        </span>
      </span>
      <RightOutlined aria-hidden="true" style={{ flexShrink: 0, color: 'var(--color-ink-subtle, #756A58)', fontSize: 12 }} />
    </Link>
  )
}
