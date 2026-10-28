import type { CSSProperties } from 'react'
import { isStickerMarker, parseSticker } from '@/constants/stickers'
import { StickerImage } from '@/components/Parent/StickerImage'

export function StickerMessageContent({
  content,
  animated = true,
  style,
}: {
  content: string
  animated?: boolean
  style?: CSSProperties
}) {
  const sticker = parseSticker(content)
  if (sticker) return <StickerImage sticker={sticker} animated={animated} style={style} />

  if (isStickerMarker(content)) {
    return (
      <span
        aria-label="暂不支持的表情"
        style={{ color: 'var(--color-ink-subtle)', fontSize: 12, ...style }}
      >
        暂不支持的表情
      </span>
    )
  }

  return content
}
