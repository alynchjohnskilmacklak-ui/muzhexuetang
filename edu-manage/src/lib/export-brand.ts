/**
 * 统一导出品牌文案与 PDF / 图片视觉工具。
 *
 * - PDF：首页页眉 Logo + 每页斜向水印（jsPDF）
 * - 图片（Canvas/PNG）：顶部品牌条 Logo + 斜向水印
 * - XLSX 的实际 Logo 与水印由 export-xlsx-brand.ts 写入工作簿，不改变单元格
 * - CSV / JSON 使用品牌文件名，保留原始表头和数据结构
 */

export const EXPORT_BRAND = {
  orgName: '牧哲学堂',
  orgEn: 'MOREJOY',
  slogan: '不恥學淺 唯恐志短',
  watermark: '牧哲学堂教育管理系统导出',
  logoPath: '/brand/logo-export.jpg',
}

/* ---------------- Logo 加载（前端，带缓存） ---------------- */

let cachedLogo: HTMLImageElement | null = null

export async function loadBrandLogo(): Promise<HTMLImageElement> {
  if (cachedLogo) return cachedLogo
  const img = new Image()
  img.src = EXPORT_BRAND.logoPath
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('导出品牌 Logo 加载失败'))
  })
  cachedLogo = img
  return img
}

export function brandLogoDataUrl(img: HTMLImageElement, width = 320): string {
  const scale = width / img.naturalWidth
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.9)
}

/* ---------------- Canvas（PNG 图片导出） ---------------- */

/** 在 Canvas 顶部绘制品牌条：Logo + 标题 + 品牌名，返回品牌条高度 */
export async function drawBrandHeader(
  ctx: CanvasRenderingContext2D,
  width: number,
  title: string,
  subtitle?: string,
): Promise<number> {
  const img = await loadBrandLogo()
  const barHeight = 74
  const ratio = img.naturalHeight / img.naturalWidth
  const logoH = 52
  const logoW = Math.round(logoH / ratio)

  ctx.fillStyle = '#123C35'
  ctx.fillRect(0, 0, width, barHeight)

  // 左侧 Logo（白底裁切，保证可读）
  const logoLeft = 18
  const logoTop = (barHeight - logoH) / 2
  ctx.save()
  ctx.fillStyle = '#FFFFFF'
  const pad = 3
  ctx.fillRect(logoLeft - pad, logoTop - pad, logoW + pad * 2, logoH + pad * 2)
  ctx.drawImage(img, logoLeft, logoTop, logoW, logoH)
  ctx.restore()

  // 标题
  ctx.fillStyle = '#F7F3E8'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.font = 'bold 21px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.fillText(title, logoLeft + logoW + 16, barHeight / 2 - (subtitle ? 8 : 0))
  if (subtitle) {
    ctx.fillStyle = 'rgba(242,227,182,.85)'
    ctx.font = '12px "PingFang SC","Microsoft YaHei",sans-serif'
    ctx.fillText(subtitle, logoLeft + logoW + 16, barHeight / 2 + 16)
  }
  // 右侧品牌名
  ctx.fillStyle = 'rgba(242,227,182,.75)'
  ctx.font = 'bold 15px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText(`${EXPORT_BRAND.orgName} · ${EXPORT_BRAND.orgEn}`, width - 18, barHeight / 2)
  ctx.textAlign = 'left'

  return barHeight
}

/** Canvas 斜向低透明度水印 */
export function applyWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string = EXPORT_BRAND.watermark,
  opacity = 0.07,
): void {
  ctx.save()
  ctx.globalAlpha = opacity
  ctx.fillStyle = '#123C35'
  ctx.font = 'bold 18px "PingFang SC","Microsoft YaHei",sans-serif'
  ctx.textAlign = 'center'
  const step = 220
  for (let y = -height; y < height * 2; y += step) {
    ctx.save()
    ctx.translate(width / 2, y)
    ctx.rotate(-Math.PI / 5)
    for (let x = -width; x < width * 2; x += 360) {
      ctx.fillText(text, x, 0)
    }
    ctx.restore()
  }
  ctx.restore()
}

/* ---------------- jsPDF（PDF 导出） ---------------- */

export type BrandPdf = {
  addImage: (data: string, format: 'JPEG', x: number, y: number, w: number, h: number) => void
  text: (text: string, x: number, y: number, opts?: Record<string, unknown>) => void
  setFontSize: (size: number) => void
  setTextColor: (r: number, g: number, b: number) => void
  setGState?: (state: unknown) => void
  getNumberOfPages: () => number
  setPage: (page: number) => void
  setDrawColor: (r: number, g: number, b: number) => void
  setLineWidth: (w: number) => void
  line: (x1: number, y1: number, x2: number, y2: number) => void
  internal: { pageSize: { getWidth: () => number } }
}

/* ---------------- DOM → Canvas（替代 html2canvas，兼容现代 CSS） ---------------- */

export type DomToCanvasOptions = {
  scale?: number
  backgroundColor?: string
  /** 渲染前对克隆出的节点做替换（等价 html2canvas 的 onclone） */
  onclone?: (clone: HTMLElement) => void
}

/**
 * 基于 modern-screenshot（SVG foreignObject，浏览器原生渲染样式）将 DOM 节点
 * 转为 Canvas。解决 html2canvas 1.4.1 解析 color-mix/oklch 等现代 CSS 挂起的问题。
 */
export async function domToCanvas(
  el: HTMLElement,
  opts?: DomToCanvasOptions,
): Promise<HTMLCanvasElement> {
  const { domToPng } = await import('modern-screenshot')
  const clone = el.cloneNode(true) as HTMLElement
  opts?.onclone?.(clone)
  // Cloning a canvas copies its element but not its bitmap. Preserve chart canvases
  // as images so exported reports do not show large blank chart areas.
  const sourceCanvases = Array.from(el.querySelectorAll('canvas'))
  const clonedCanvases = Array.from(clone.querySelectorAll('canvas'))
  sourceCanvases.forEach((source, index) => {
    const target = clonedCanvases[index]
    if (!target || source.width <= 0 || source.height <= 0) return
    try {
      const image = document.createElement('img')
      image.src = source.toDataURL('image/png')
      image.width = source.width
      image.height = source.height
      image.alt = source.getAttribute('aria-label') || ''
      image.className = target.className
      image.style.cssText = target.style.cssText
      const style = getComputedStyle(source)
      for (const property of ['display', 'width', 'height', 'max-width', 'max-height', 'margin', 'object-fit', 'object-position', 'vertical-align']) {
        const value = style.getPropertyValue(property)
        if (value) image.style.setProperty(property, value)
      }
      target.replaceWith(image)
    } catch {
      // A tainted or unsupported canvas should not block the rest of the report.
    }
  })
  // 克隆节点脱离 DOM 时 getBoundingClientRect() 返回 0×0，modern-screenshot 会
  // 生成 0×0 画布 → toDataURL 返回 `data:,` 空图 → 解码报
  // “The source image cannot be decoded.”。因此把克隆节点挂到隐藏容器中渲染。
  const rect = el.getBoundingClientRect()
  if (rect.width && rect.height) {
    clone.style.width = `${rect.width}px`
    clone.style.height = `${rect.height}px`
  }
  // Export sources are mounted far off-screen. The clone is rendered from its own
  // bounds, so keep the content visible while removing only the wrapper's parking offset.
  if (clone.style.position === 'fixed' && Number.parseFloat(clone.style.left) < -1000) {
    clone.style.position = 'relative'
    clone.style.left = 'auto'
    clone.style.top = 'auto'
    clone.style.right = 'auto'
    clone.style.bottom = 'auto'
    clone.style.zIndex = 'auto'
  }
  const holder = document.createElement('div')
  // Keep the capture tree outside the viewport without visibility:hidden: hidden
  // ancestors are inherited by the cloned report and produce a blank transparent PNG.
  holder.style.cssText = 'position:fixed;left:-100000px;top:0;width:max-content;height:max-content;visibility:visible;pointer-events:none;overflow:visible;'
  document.body.appendChild(holder)
  holder.appendChild(clone)
  try {
    await document.fonts.ready
    await Promise.all(Array.from(clone.querySelectorAll('img'), (image) => image.decode().catch(() => undefined)))
    const dataUrl = await domToPng(clone, {
      scale: opts?.scale ?? 2,
      backgroundColor: opts?.backgroundColor,
      type: 'image/png',
    })
    const img = new Image()
    img.src = dataUrl
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法创建导出画布')
    ctx.drawImage(img, 0, 0)
    return canvas
  } finally {
    holder.remove()
  }
}

/* ---------------- XLSX summary text rows ---------------- */

/** 返回插入到表格数据前的品牌行（3 行：机构+标题 / 水印 / 空行） */
export function brandAoaHeader(sheetTitle: string): (string | number)[][] {
  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return [
    [`${EXPORT_BRAND.orgName} · ${sheetTitle}`, '', '', ''],
    [`${EXPORT_BRAND.watermark}（${dateStr}）`, '', '', ''],
    [],
  ]
}

/** 合并数据行：品牌行 + 表头 + 数据 */
export function brandAoaRows(sheetTitle: string, header: (string | number)[], rows: (string | number)[][]): (string | number)[][] {
  return [...brandAoaHeader(sheetTitle), header, ...rows]
}

