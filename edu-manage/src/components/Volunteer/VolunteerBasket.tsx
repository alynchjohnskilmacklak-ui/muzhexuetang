'use client'

import { useId, useState, type ReactNode } from 'react'
import { Button } from 'antd'
import { BrandModal } from '@/components/Common/BrandModal'

type VolunteerBasketProps = {
  isMobile: boolean
  allocationCount: number
  shifanCount: number
  putongCount: number
  onOpenForm: () => void
  children: ReactNode
}

export function VolunteerBasket({
  isMobile, allocationCount, shifanCount, putongCount, onOpenForm, children,
}: VolunteerBasketProps) {
  const [open, setOpen] = useState(false)
  const basketId = useId()
  const count = allocationCount + shifanCount + putongCount

  if (!isMobile) {
    return (
      <section aria-label="我的志愿" style={{ marginTop: 24, padding: 24, borderRadius: 14, background: 'var(--color-surface-1)', border: '1px solid var(--color-hairline)' }}>
        <div style={{ marginBottom: 16, fontWeight: 600, color: 'var(--color-ink)' }}>我的志愿 · 已选 {count}/15</div>
        {children}
      </section>
    )
  }

  return (
    <>
      <section aria-label="志愿篮汇总" style={{
        position: 'sticky', bottom: 0, zIndex: 50, width: '100%', maxWidth: '100%',
        marginTop: 16, padding: '10px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
        background: 'var(--color-surface-1)', border: '1px solid var(--color-hairline)', borderRadius: '14px 14px 0 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <strong style={{ fontSize: 13, color: 'var(--color-ink)' }}>我的志愿</strong>
          <span style={{ fontSize: 12, color: 'var(--color-primary)' }}>已选 {count}/15</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: 11, color: 'var(--color-ink-subtle)', marginBottom: 8 }}>
          <span>分配生 {allocationCount}/3</span>
          <span>省示范 {shifanCount}/6</span>
          <span>普高 {putongCount}/6</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button aria-expanded={open} aria-controls={open ? basketId : undefined} onClick={() => setOpen(true)} style={{ flex: 1, minWidth: 0, minHeight: 40 }}>查看志愿篮</Button>
          <Button type="primary" onClick={onOpenForm} style={{ flex: 1, minWidth: 0, minHeight: 40 }}>填写模拟表</Button>
        </div>
      </section>
      {open && (
        <BrandModal
          open
          title={`我的志愿（${count}/15）`}
          mobileHeight="85dvh"
          onClose={() => setOpen(false)}
          footer={<Button type="primary" block onClick={() => setOpen(false)}>继续选校</Button>}
        >
          <div id={basketId}>
            <p style={{ margin: '0 0 12px', color: 'var(--color-ink-subtle)', fontSize: 12 }}>在这里查看、删除或调整志愿顺序，关闭后继续选择学校。</p>
            {children}
          </div>
        </BrandModal>
      )}
    </>
  )
}
