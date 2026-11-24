import { reportPageEnd } from '@/lib/report-pagination'
import { applyWatermark, domToCanvas, drawBrandHeader } from '@/lib/export-brand'

type ExportReportOptions = {
  /** The report can render its own branded cover; the standard running header is omitted in that case. */
  header?: false | { title?: string; subtitle?: string }
}

export function getReportCaptureScale(width: number, height: number) {
  const safeWidth = Math.max(1, width)
  const longestEdge = Math.max(safeWidth, Math.max(1, height))
  const targetContentPixels = 1800 // about 265 DPI across the 172mm content area
  const maxCaptureEdge = 12000
  return Math.min(5.5, targetContentPixels / safeWidth, maxCaptureEdge / longestEdge)
}

/** Render one report section at a time rather than one unbounded mobile canvas. */
export async function exportReportPdf(root: HTMLElement, filename: string, options: ExportReportOptions = {}) {
  if (root.querySelector('[data-report-pending="true"]')) throw new Error('课堂照片正在加载，请稍后再下载')
  const images = Array.from(root.querySelectorAll('img'))
  await Promise.all(images.map(async (image) => {
    image.loading = 'eager'
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      await Promise.race([
        image.decode(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('课堂照片加载超时，请重试')), 15000) }),
      ])
      if (!image.naturalWidth) throw new Error('课堂照片加载失败，请重试')
    } catch (error) {
      if (image.dataset.reportOptionalImage === 'true' && image.dataset.reportImageRequired !== 'true') {
        image.remove()
        return
      }
      throw error
    } finally { clearTimeout(timer) }
  }))
  if (root.querySelector('[data-report-pending="true"]')) throw new Error('课堂照片尚未准备完成，请稍后重试')
  await document.fonts.ready
  const [{ jsPDF }] = await Promise.all([import('jspdf')])
  const pdf = new jsPDF('p', 'mm', 'a4')
  // 首页品牌页眉（canvas 渲染 Logo+标题+品牌名，中文可正常显示），内容从 margin 下方开始
  const pageW = pdf.internal.pageSize.getWidth()
  const header = options.header === undefined ? { title: '学情报告' } : options.header
  let margin = 26
  if (header !== false) {
    const headerCanvas = document.createElement('canvas')
    headerCanvas.width = 1050
    headerCanvas.height = 74
    await drawBrandHeader(headerCanvas.getContext('2d')!, headerCanvas.width, header.title || '学情报告', header.subtitle)
    pdf.addImage(headerCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, 74 * (pageW / headerCanvas.width))
  } else {
    margin = 16
  }
  const width = pageW - margin * 2, bottom = 285
  let y = margin
  for (const block of Array.from(root.children) as HTMLElement[]) {
    if (block.dataset.reportExcludeFromPdf === 'true') continue
    if (!block.getBoundingClientRect().height) continue
    const rect = block.getBoundingClientRect()
    const ranges: Array<{ top: number; bottom: number }> = []
    for (const image of block.querySelectorAll('img, canvas, svg')) {
      const box = image.getBoundingClientRect()
      ranges.push({ top: box.top - rect.top, bottom: box.bottom - rect.top })
    }
    // Preserve complete cards when they can fit on one A4 page. A card that is
    // taller than a page is intentionally left to the line/image safeguards.
    for (const card of block.querySelectorAll<HTMLElement>('section:not([aria-live="polite"]):not([data-report-pending]), article, p, h1, h2, h3, h4, h5, h6, li, [data-report-keep-together="true"]')) {
      const box = card.getBoundingClientRect()
      ranges.push({ top: box.top - rect.top, bottom: box.bottom - rect.top })
    }
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent?.trim()) continue
      const range = document.createRange()
      range.selectNodeContents(walker.currentNode)
      for (const box of range.getClientRects()) ranges.push({ top: box.top - rect.top, bottom: box.bottom - rect.top })
    }
    // The report is often exported from a narrow phone modal. Render each card
    // at print resolution instead of stretching a 360px screenshot across A4.
    const captureScale = getReportCaptureScale(rect.width, rect.height)
    const canvas = await domToCanvas(block, {
      scale: captureScale,
      backgroundColor: '#ffffff',
      onclone: (clone) => {
        clone.querySelectorAll('[data-report-exclude-from-pdf="true"]').forEach((node) => node.remove())
      },
    })
    // 斜向低透明度水印（canvas 烤入，中文可正常显示），随后切片会继承水印
    applyWatermark(canvas.getContext('2d')!, canvas.width, canvas.height)
    const ratio = width / canvas.width
    const scale = canvas.height / rect.height
    const maxPagePixels = (bottom - margin) / ratio
    const protectedRanges = ranges
      .map((range) => ({ top: Math.floor(range.top * scale), bottom: Math.ceil(range.bottom * scale) }))
      .filter((range) => range.bottom > range.top && range.bottom - range.top <= maxPagePixels)
    const blockHeightMm = canvas.height * ratio
    const remainingHeightMm = bottom - y
    // Avoid leaving most of an A4 page blank when a section barely does not fit.
    // Keep a whole small section together only when the remaining space is too
    // short to hold a useful chunk; otherwise let the existing safe slicer flow
    // it onto the current page and continue on the next one if needed.
    if (blockHeightMm <= bottom - margin && y + blockHeightMm > bottom && remainingHeightMm < 54) { pdf.addPage(); y = margin }
    let start = 0
    while (start < canvas.height) {
      if (bottom - y < 10) { pdf.addPage(); y = margin }
      const end = Math.min(canvas.height, Math.max(start + 1, Math.floor(reportPageEnd(start, (bottom - y) / ratio, canvas.height, protectedRanges))))
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = end - start
      slice.getContext('2d')?.drawImage(canvas, 0, start, canvas.width, slice.height, 0, 0, canvas.width, slice.height)
      pdf.addImage(slice.toDataURL('image/jpeg', 0.97), 'JPEG', margin, y, width, slice.height * ratio)
      y += slice.height * ratio
      slice.width = slice.height = 0
      start = end
      if (start < canvas.height) { pdf.addPage(); y = margin }
    }
    canvas.width = canvas.height = 0
    y += 3
  }
  const pageCount = pdf.getNumberOfPages()
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    pdf.setPage(pageNumber)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(117, 106, 88)
    pdf.text(`Muzhe Academy  ·  ${pageNumber} / ${pageCount}`, pageW - 16, 292, { align: 'right' })
  }
  pdf.save(filename)
}
