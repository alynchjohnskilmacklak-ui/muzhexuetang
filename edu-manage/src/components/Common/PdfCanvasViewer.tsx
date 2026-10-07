'use client'

import { useEffect, useRef, useState } from 'react'
import { Button, Spin } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist'

function PdfPage({ document, pageNumber }: { document: PDFDocumentProxy; pageNumber: number }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let page: PDFPageProxy | null = null
    let renderTask: RenderTask | null = null
    let disposed = false

    const render = async () => {
      const host = hostRef.current
      const canvas = canvasRef.current
      if (!host || !canvas) return

      page = page || await document.getPage(pageNumber)
      const baseViewport = page.getViewport({ scale: 1 })
      const availableWidth = Math.max(280, host.clientWidth - 16)
      const scale = Math.min(2, availableWidth / baseViewport.width)
      const viewport = page.getViewport({ scale })
      const outputScale = Math.min(window.devicePixelRatio || 1, 2)
      const context = canvas.getContext('2d')
      if (!context || disposed) return

      renderTask?.cancel()
      canvas.width = Math.floor(viewport.width * outputScale)
      canvas.height = Math.floor(viewport.height * outputScale)
      canvas.style.width = `${Math.floor(viewport.width)}px`
      canvas.style.height = `${Math.floor(viewport.height)}px`
      context.setTransform(outputScale, 0, 0, outputScale, 0, 0)
      renderTask = page.render({ canvas, canvasContext: context, viewport })
      await renderTask.promise.catch((error: unknown) => {
        if ((error as { name?: string })?.name !== 'RenderingCancelledException') throw error
      })
    }

    void render()
    const observer = new ResizeObserver(() => void render())
    if (hostRef.current) observer.observe(hostRef.current)

    return () => {
      disposed = true
      observer.disconnect()
      renderTask?.cancel()
      page?.cleanup()
    }
  }, [document, pageNumber])

  return <div ref={hostRef} className="pdf-canvas-page"><canvas ref={canvasRef} aria-label={`PDF 第 ${pageNumber} 页`} /></div>
}

export function PdfCanvasViewer({ url, data, title }: { url?: string; data?: Uint8Array; title: string }) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const attemptRef = useRef(0)

  useEffect(() => {
    let disposed = false
    let loadedDocument: PDFDocumentProxy | null = null
    let loadingTask: PDFDocumentLoadingTask | null = null
    const controller = new AbortController()
    const timers: ReturnType<typeof setTimeout>[] = []

    const load = async () => {
      setDocument(null)
      setError('')
      try {
        let bytes: Uint8Array
        if (data?.byteLength) {
          bytes = data.slice()
        } else if (url) {
          const response = await fetch(url, { signal: controller.signal })
          if (!response.ok) throw new Error('PDF 文件读取失败')
          bytes = new Uint8Array(await response.arrayBuffer())
        } else {
          throw new Error('PDF 文件数据为空')
        }
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
        loadingTask = pdfjs.getDocument({ data: bytes })
        loadedDocument = await loadingTask.promise
        if (!disposed) setDocument(loadedDocument)
      } catch (loadError) {
        if (!disposed && (loadError as { name?: string })?.name !== 'AbortError') {
          // 网络波动或解析瞬态失败时自动重试一次，避免家长看到原始英文报错
          if (attemptRef.current < 1) {
            attemptRef.current += 1
            const timer = setTimeout(() => setReloadKey((value) => value + 1), 900)
            timers.push(timer)
            return
          }
          const message = loadError instanceof Error ? loadError.message : ''
          if (message === 'PDF 文件读取失败') setError('PDF 数据读取失败，请检查网络后重试')
          else if (message === 'PDF 文件数据为空') setError('PDF 文件数据为空，请重新下载后查看')
          else if (message === 'Load failed') setError('PDF 数据读取失败，请检查网络后重试')
          else setError('文件格式暂不支持在线预览，可能是 PDF 结构特殊或文件已损坏')
        }
      }
    }

    void load()
    return () => {
      disposed = true
      timers.forEach((timer) => clearTimeout(timer))
      controller.abort()
      void loadingTask?.destroy()
    }
  }, [data, reloadKey, url])

  if (error) {
    return (
      <><div className="pdf-canvas-state" role="alert">
          <strong>讲义暂时没有打开</strong>
          <span>{error}。仍无法打开时，可返回列表下载查看。</span>
          <Button icon={<ReloadOutlined />} onClick={() => setReloadKey((value) => value + 1)}>重新加载</Button>
        </div><PdfCanvasViewerStyles /></>
    )
  }

  if (!document) return <><div className="pdf-canvas-state" aria-live="polite"><Spin /><span>正在打开“{title}”</span></div><PdfCanvasViewerStyles /></>

  return (
    <div className="pdf-canvas-viewer" aria-label={`${title} PDF 预览`}>
      {Array.from({ length: document.numPages }, (_, index) => <PdfPage key={index + 1} document={document} pageNumber={index + 1} />)}
      <PdfCanvasViewerStyles />
      <style jsx>{`
        .pdf-canvas-viewer { height: min(82vh, 920px); overflow: auto; padding: 12px; background: var(--color-surface-3); overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
        .pdf-canvas-viewer :global(.pdf-canvas-page) { display: flex; justify-content: center; min-width: 0; margin: 0 auto 12px; }
        .pdf-canvas-viewer :global(canvas) { display: block; max-width: 100%; height: auto !important; background: var(--color-surface-1); box-shadow: 0 6px 18px rgba(26, 18, 1, .08); }
      `}</style>
    </div>
  )
}

function PdfCanvasViewerStyles() {
  return <style jsx global>{`
    .pdf-canvas-state { min-height: min(70vh, 620px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 24px; color: var(--color-ink-muted); background: var(--color-canvas); text-align: center; }
    .pdf-canvas-state strong { color: var(--color-ink); font-size: 16px; }
    .pdf-canvas-state span { max-width: 34em; line-height: 1.6; }
  `}</style>
}
