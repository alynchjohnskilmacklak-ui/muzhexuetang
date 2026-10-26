// 牧哲学堂 · 小羊表情包（家校沟通对话框动态表情）
export interface Sticker {
  id: string
  name: string
  src: string
  posterSrc: string
}

export const STICKERS: Sticker[] = [
  { id: '01_收到', name: '收到', src: '/stickers/animated/received.webp', posterSrc: '/stickers/posters/received.webp' },
  { id: '02_谢谢家长', name: '谢谢家长', src: '/stickers/animated/thank-you.webp', posterSrc: '/stickers/posters/thank-you.webp' },
  { id: '03_上课啦', name: '上课啦', src: '/stickers/animated/class-start.webp', posterSrc: '/stickers/posters/class-start.webp' },
  { id: '05_请假已批', name: '请假已批', src: '/stickers/animated/leave-approved.webp', posterSrc: '/stickers/posters/leave-approved.webp' },
  { id: '06_表现真棒', name: '表现真棒', src: '/stickers/animated/great-job.webp', posterSrc: '/stickers/posters/great-job.webp' },
  { id: '07_成绩已出', name: '成绩已出', src: '/stickers/animated/results-ready.webp', posterSrc: '/stickers/posters/results-ready.webp' },
  { id: '08_请确认', name: '请确认', src: '/stickers/animated/please-confirm.webp', posterSrc: '/stickers/posters/please-confirm.webp' },
  { id: '09_加油冲刺', name: '加油冲刺', src: '/stickers/animated/keep-going.webp', posterSrc: '/stickers/posters/keep-going.webp' },
]

/** 消息内容标记：存文本，渲染时识别为动态图 */
export const STICKER_MARK = (id: string) => `[sticker:${id}]`

const STICKER_RE = /^\[sticker:([^\]]+)\]$/

/** 解析消息内容是否为表情标记；非表情返回 null */
export function parseSticker(content: string): Sticker | null {
  const matched = content.trim().match(STICKER_RE)
  if (!matched) return null
  return STICKERS.find((sticker) => sticker.id === matched[1]) || null
}

export function isStickerMarker(content: string): boolean {
  return STICKER_RE.test(content.trim())
}

/** 列表预览文本：表情消息显示名称，未知标记不会泄漏原始协议串 */
export function stickerPreview(content: string): string {
  const sticker = parseSticker(content)
  if (sticker) return '[表情] ' + sticker.name
  return isStickerMarker(content) ? '[暂不支持的表情]' : content
}
