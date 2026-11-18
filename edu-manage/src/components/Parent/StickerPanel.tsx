'use client'

import { STICKERS, type Sticker } from '@/constants/stickers'
import { StickerImage } from '@/components/Parent/StickerImage'

/**
 * 小羊表情包面板（家校沟通对话框通用）
 * 点击某个表情后回调 onPick(sticker)，由调用方负责发送/插入
 */
export function StickerPanel({
  onPick,
  compact,
}: {
  onPick: (sticker: Sticker) => void
  compact?: boolean
}) {
  return (
    <div style={{
      background: 'var(--color-surface-1)',
      borderRadius: 14,
      border: '1px solid var(--color-hairline-strong)',
      boxShadow: 'var(--shadow-overlay)',
      padding: compact ? 10 : 12,
      maxWidth: 320,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
          background: 'var(--color-primary-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
        }}>🐑</div>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-ink)' }}>小羊表情包</div>
          <div style={{ fontSize: 10.5, color: 'var(--color-ink-subtle)' }}>静态预览 · 点选发送后动态播放</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {STICKERS.map((sticker) => (
          <button
            key={sticker.id}
            type="button"
            aria-label={`发送表情：${sticker.name}`}
            onClick={() => onPick(sticker)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              fontFamily: 'inherit',
              borderRadius: 10,
              overflow: 'hidden',
              border: '1px solid var(--color-hairline)',
              background: 'var(--color-canvas)',
              outlineOffset: 2,
              transition: 'transform .15s ease, box-shadow .15s ease',
              display: 'flex',
              flexDirection: 'column',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.06)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(0,0,0,.12)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
            }}
            onFocus={(e) => { (e.currentTarget as HTMLButtonElement).style.outline = '2px solid var(--color-primary)' }}
            onBlur={(e) => { (e.currentTarget as HTMLButtonElement).style.outline = 'none' }}
          >
            <StickerImage sticker={sticker} animated={false} style={{ width: '100%', borderRadius: 0 }} />
            <div style={{
              fontSize: 10, color: 'var(--color-ink-muted)', textAlign: 'center',
              padding: '3px 0 4px', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {sticker.name}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
