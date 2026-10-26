import { reportPageEnd } from '@/lib/report-pagination'
import { applyWatermark, domToCanvas, drawBrandHeader } from '@/lib/export-brand'

/** Render one report section at a time rather than one unbounded mobile canvas. */
export async function exportReportPdf(root: HTMLElement, filename: string) {
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
    } finally { clearTimeout(timer) }
  }))
  if (root.querySelector('[data-report-pending="true"]')) throw new Error('课堂照片尚未准备完成，请稍后重试')
  await document.fonts.ready
  const [{ jsPDF }] = await Promise.all([import('jspdf')])
  const pdf = new jsPDF('p', 'mm', 'a4')
  // 首页品牌页眉（canvas 渲染 Logo+标题+品牌名，中文可正常显示），内容从 margin 下方开始
  const pageW = pdf.internal.pageSize.getWidth()
  const headerCanvas = document.createElement('canvas')
  headerCanvas.width = 1050
  headerCanvas.height = 74
  await drawBrandHeader(headerCanvas.getContext('2d')!, headerCanvas.width, '学情报告')
  pdf.addImage(headerCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, 74 * (pageW / headerCanvas.width))
  const margin = 26, width = 172, bottom = 285
  let y = margin
  for (const block of Array.from(root.children) as HTMLElement[]) {
    if (!block.getBoundingClientRect().height) continue
    const rect = block.getBoundingClientRect()
    const ranges: Array<{ top: number; bottom: number }> = []
    for (const image of block.querySelectorAll('img, canvas, svg')) {
      const box = image.getBoundingClientRect()
      ranges.push({ top: box.top - rect.top, bottom: box.bottom - rect.top })
    }
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      if (!walker.currentNode.textContent?.trim()) continue
      const range = document.createRange()
      range.selectNodeContents(walker.currentNode)
      for (const box of range.getClientRects()) ranges.push({ top: box.top - rect.top, bottom: box.bottom - rect.top })
    }
    const canvas = await domToCanvas(block, { scale: Math.min(1.5, 8192 / Math.max(rect.width, rect.height)), backgroundColor: '#ffffff' })
    // 斜向低透明度水印（canvas 烤入，中文可正常显示），随后切片会继承水印
    applyWatermark(canvas.getContext('2d')!, canvas.width, canvas.height)
    const ratio = width / canvas.width
    const scale = canvas.height / rect.height
    const protectedRanges = ranges.map((range) => ({ top: Math.floor(range.top * scale), bottom: Math.ceil(range.bottom * scale) }))
    if (canvas.height * ratio <= bottom - margin && y + canvas.height * ratio > bottom) { pdf.addPage(); y = margin }
    let start = 0
    while (start < canvas.height) {
      if (bottom - y < 10) { pdf.addPage(); y = margin }
      const end = Math.min(canvas.height, Math.max(start + 1, Math.floor(reportPageEnd(start, (bottom - y) / ratio, canvas.height, protectedRanges))))
      const slice = document.createElement('canvas')
      slice.width = canvas.width
      slice.height = end - start
      slice.getContext('2d')?.drawImage(canvas, 0, start, canvas.width, slice.height, 0, 0, canvas.width, slice.height)
      pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', margin, y, width, slice.height * ratio)
      y += slice.height * ratio
      slice.width = slice.height = 0
      start = end
      if (start < canvas.height) { pdf.addPage(); y = margin }
    }
    canvas.width = canvas.height = 0
    y += 3
  }
  pdf.save(filename)
}
