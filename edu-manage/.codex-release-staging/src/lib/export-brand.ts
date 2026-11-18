/**
 * 统一导出品牌工具：所有导出文件（PDF / Excel / CSV / 图片）强制携带
 * 牧哲学堂 Logo + 低透明度水印「牧哲学堂教育管理系统导出」。
 *
 * - PDF：首页页眉 Logo + 每页斜向水印（jsPDF）
 * - 图片（Canvas/PNG）：顶部品牌条 Logo + 斜向水印
 * - XLSX：SheetJS 社区版不支持嵌入图片，统一在首行插入品牌信息与水印文案行
 * - CSV：首行插入品牌信息与水印文案行
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

/** PDF 首页页眉：Logo + 标题 + 品牌条（调用方在生成内容前调用一次） */
export async function stampPdfBrand(pdf: BrandPdf, title: string, subtitle?: string): Promise<void> {
  const img = await loadBrandLogo()
  const pageW = pdf.internal.pageSize.getWidth()
  const headerH = 24
  const logoH = 13
  const ratio = img.naturalHeight / img.naturalWidth
  const logoW = Math.round(logoH / ratio)

  // 右侧品牌名
  pdf.setTextColor(18, 60, 78)
  pdf.setFontSize(11)
  pdf.text(`${EXPORT_BRAND.orgName} · ${EXPORT_BRAND.orgEn}`, pageW - 8, 8.5, { align: 'right' })

  const dataUrl = brandLogoDataUrl(img, 320)
  if (dataUrl) {
    pdf.addImage(dataUrl, 'JPEG', 8, 4, logoW, logoH)
  }
  pdf.setFontSize(14)
  pdf.setTextColor(23, 47, 41)
  pdf.text(title, 8 + logoW + 4, 8.5)
  if (subtitle) {
    pdf.setFontSize(9)
    pdf.setTextColor(120, 130, 140)
    pdf.text(subtitle, 8 + logoW + 4, 13.5)
  }
  pdf.setDrawColor(201, 164, 92)
  pdf.setLineWidth(0.6)
  pdf.line(8, headerH - 2, pageW - 8, headerH - 2)
}

/** PDF 每页斜向水印（生成完成后调用，作用于全部页） */
export function stampPdfWatermark(
  pdf: BrandPdf,
  text: string = EXPORT_BRAND.watermark,
  opacity = 0.08,
): void {
  const pageW = pdf.internal.pageSize.getWidth()
  const GState = (pdf as { GState?: unknown }).GState
  for (let page = 1; page <= pdf.getNumberOfPages(); page++) {
    pdf.setPage(page)
    pdf.setFontSize(14)
    pdf.setTextColor(18, 60, 78)
    if (pdf.setGState && GState) {
      pdf.setGState(new (GState as new (opts: { opacity: number }) => unknown)({ opacity }))
    }
    const step = 70
    for (let y = -40; y < 320; y += step) {
      pdf.text(text, pageW / 2, y, { align: 'center', angle: 35 })
    }
    if (pdf.setGState && GState) {
      pdf.setGState(new (GState as new (opts: { opacity: number }) => unknown)({ opacity: 1 }))
    }
  }
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
  // 克隆节点脱离 DOM 时 getBoundingClientRect() 返回 0×0，modern-screenshot 会
  // 生成 0×0 画布 → toDataURL 返回 `data:,` 空图 → 解码报
  // “The source image cannot be decoded.”。因此把克隆节点挂到隐藏容器中渲染。
  const rect = el.getBoundingClientRect()
  if (rect.width && rect.height) {
    clone.style.width = `${rect.width}px`
    clone.style.height = `${rect.height}px`
  }
  const holder = document.createElement('div')
  holder.style.cssText = 'position:fixed;left:-99999px;top:0;width:auto;height:auto;visibility:hidden;pointer-events:none;'
  document.body.appendChild(holder)
  holder.appendChild(clone)
  try {
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

/* ---------------- XLSX（SheetJS 社区版不支持嵌入图片，品牌行方案） ---------------- */

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

/* ---------------- CSV ---------------- */

/** CSV 品牌前缀行 */
export function brandCsvPrefix(title: string): string[] {
  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return [
    `${EXPORT_BRAND.orgName} · ${title}`,
    `${EXPORT_BRAND.watermark}（${dateStr}）`,
    '',
  ]
}
