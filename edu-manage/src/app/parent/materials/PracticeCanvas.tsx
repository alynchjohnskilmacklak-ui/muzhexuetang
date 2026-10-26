'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, message, Tooltip } from 'antd'
import {
  ClearOutlined,
  DownloadOutlined,
  StopOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { applyWatermark, drawBrandHeader } from '@/lib/export-brand'

type Tool = 'pen-red' | 'pen-blue' | 'pen-black' | 'eraser'

const TOOL_COLORS: Record<Tool, string> = {
  'pen-red': '#e24b4a',
  'pen-blue': '#2563eb',
  'pen-black': '#1f2937',
  eraser: '#ffffff',
}

const TOOL_LABELS: Record<Tool, string> = {
  'pen-red': '红色辅助线',
  'pen-blue': '蓝色辅助线',
  'pen-black': '黑色标记',
  eraser: '橡皮',
}

/**
 * 交互画布：
 * - 带 src：在题干图上叠加绘制辅助线 / 描点作答（图大优先，全宽显示）
 * - 不带 src：纯白板草稿纸（学生自由打草稿）
 * 支持红/蓝/黑画笔、橡皮、撤销、清空、保存成图。
 */
export function PracticeCanvas({ src, alt, whiteboard = false, onOpenImage }: { src?: string; alt?: string; whiteboard?: boolean; onOpenImage?: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>('pen-blue')
  const [drawing, setDrawing] = useState(false)
  const [boardSize, setBoardSize] = useState<{ w: number; h: number }>({ w: 640, h: 420 })
  const undoStack = useRef<{ data: string; w: number; h: number }[]>([])

  // 初始化画布尺寸：白板用默认 640×420；带图优先图片原图，加载失败兜底默认尺寸
  useEffect(() => {
    const canvas = canvasRef.current
    const setup = (w: number, h: number) => {
      setBoardSize({ w, h })
      if (canvas) {
        canvas.width = w
        canvas.height = h
        const context = canvas.getContext('2d')
        if (context) {
          context.lineCap = 'round'
          context.lineJoin = 'round'
        }
      }
    }
    if (whiteboard || !imgRef.current) {
      setup(640, 420)
      return
    }
    const img = imgRef.current
    const apply = () => {
      const w = img.naturalWidth
      const h = img.naturalHeight
      setup(w || 640, h || 420)
    }
    if (img.complete) apply()
    else img.addEventListener('load', apply, { once: true })
    const timer = window.setTimeout(apply, 2000)
    return () => window.clearTimeout(timer)
  }, [src, whiteboard])

  const getPos = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()
    if (!canvas || !rect) return null
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }, [])

  const stroke = useCallback((from: { x: number; y: number } | null, to: { x: number; y: number }, toolNow: Tool) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    context.strokeStyle = TOOL_COLORS[toolNow]
    context.fillStyle = TOOL_COLORS[toolNow]
    context.globalCompositeOperation = toolNow === 'eraser' ? 'destination-out' : 'source-over'
    context.lineWidth = toolNow === 'eraser' ? 26 : 4
    context.beginPath()
    if (from) {
      context.moveTo(from.x, from.y)
    } else {
      context.moveTo(to.x - 0.1, to.y - 0.1)
      context.lineTo(to.x, to.y)
    }
    context.lineTo(to.x, to.y)
    context.stroke()
    if (!from) {
      context.beginPath()
      context.arc(to.x, to.y, context.lineWidth / 2, 0, Math.PI * 2)
      context.fill()
    }
  }, [])

  const pushUndo = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    undoStack.current.push({ data: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height })
    if (undoStack.current.length > 30) undoStack.current.shift()
  }, [])

  const lastPos = useRef<{ x: number; y: number } | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    const pos = getPos(e)
    if (!pos) return
    pushUndo()
    setDrawing(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    stroke(null, pos, tool)
    lastPos.current = pos
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing) return
    const pos = getPos(e)
    if (!pos) return
    stroke(lastPos.current, pos, tool)
    lastPos.current = pos
  }

  const onPointerUp = () => {
    setDrawing(false)
    lastPos.current = null
  }

  const undo = () => {
    const canvas = canvasRef.current
    const prev = undoStack.current.pop()
    if (!canvas || !prev) return
    const context = canvas.getContext('2d')
    if (!context) return
    const img = new window.Image()
    img.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
    img.src = prev.data
  }

  const clearAll = () => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    pushUndo()
    context.clearRect(0, 0, canvas.width, canvas.height)
  }

  const saveImage = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      // 合成画布：顶部品牌条 + 底部原作画 + 斜向水印（在新画布上叠加，不动交互画布与文件名）
      const out = document.createElement('canvas')
      out.width = canvas.width
      out.height = canvas.height + 74
      const octx = out.getContext('2d')
      if (!octx) throw new Error('无法创建导出画布')
      const barH = await drawBrandHeader(octx, out.width, whiteboard ? '草稿练习' : '作图练习')
      octx.drawImage(canvas, 0, barH)
      applyWatermark(octx, out.width, out.height)
      const link = document.createElement('a')
      link.download = `${whiteboard ? '草稿' : '作图'}-${Date.now()}.png`
      link.href = out.toDataURL('image/png')
      link.click()
      message.success('已保存为图片，可在相册/下载中查看')
    } catch {
      message.error('图片生成失败，请稍后重试')
    }
  }

  // 题图保持在当前题卡内，避免手机端出现横向溢出。
  const wrapStyle: React.CSSProperties = whiteboard
    ? { marginTop: 12, userSelect: 'none' }
    : { marginTop: 12, userSelect: 'none' }

  return (
    <div ref={wrapRef} style={wrapStyle}>
      <div style={whiteboard ? undefined : { width: '100%', marginTop: 10 }}>
      <div
        style={{
          position: 'relative',
          borderRadius: 14,
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.08)',
          background: '#faf8f4',
        }}
      >
        {!whiteboard && src && (
          <img
            ref={imgRef}
            src={src}
            alt={alt || '题目配图'}
            decoding="async"
            draggable={false}
            style={{ display: 'block', width: '100%', height: 'auto', pointerEvents: 'none' }}
          />
        )}
        {boardSize && (
          <canvas
            ref={canvasRef}
            width={boardSize.w}
            height={boardSize.h}
            style={{
              position: whiteboard ? 'relative' : 'absolute',
              inset: 0,
              width: '100%',
              height: 'auto',
              aspectRatio: `${boardSize.w} / ${boardSize.h}`,
              display: 'block',
              touchAction: 'none',
              cursor: 'crosshair',
              background: whiteboard ? '#ffffff' : 'transparent',
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
        )}
      </div>
      {onOpenImage && <button type="button" onClick={onOpenImage} style={{ minHeight: 44, marginTop: 8, padding: '8px 12px', border: '1px solid var(--color-hairline)', borderRadius: 10, background: 'var(--color-surface-1)', color: 'var(--color-primary-focus)', fontWeight: 600 }}>放大查看图形</button>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
        {(Object.keys(TOOL_LABELS) as Tool[]).map((t) => (
          <Tooltip key={t} title={TOOL_LABELS[t]}>
            <button
              type="button"
              aria-label={TOOL_LABELS[t]}
              onClick={() => setTool(t)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                border: tool === t ? '2px solid #C9A45C' : '1px solid rgba(0,0,0,0.12)',
                background: t === 'eraser' ? '#fff' : TOOL_COLORS[t],
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {t === 'eraser' ? <StopOutlined style={{ color: '#666', fontSize: 14 }} /> : null}
            </button>
          </Tooltip>
        ))}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 4 }}>
          <Tooltip title="撤销一步">
            <Button size="small" style={{ width: 44, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} icon={<UndoOutlined />} onClick={undo} aria-label="撤销" />
          </Tooltip>
          <Tooltip title="清空">
            <Button size="small" style={{ width: 44, height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} icon={<ClearOutlined />} onClick={clearAll} aria-label="清空" />
          </Tooltip>
          <Tooltip title="保存为图片">
            <Button size="small" type="primary" style={{ height: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', fontSize: 13 }} icon={<DownloadOutlined />} onClick={saveImage} aria-label="保存画作">
              保存
            </Button>
          </Tooltip>
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#8a8378', marginTop: 6, lineHeight: 1.5 }}>
        {whiteboard ? '自由草稿区，画完可保存图片。' : '在题目图上直接画辅助线 / 描点作答，画完可保存图片。'}
      </div>
      </div>
    </div>
  )
}
