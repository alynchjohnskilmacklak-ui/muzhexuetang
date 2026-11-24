'use client'

import { useEffect, useRef, useState } from 'react'
import { easeOutDeceleration } from '@/lib/ui-motion'

export function AnimatedNumber({ value, className, precision = 0 }: { value: number; className?: string; precision?: number }) {
  const safeValue = typeof value === 'number' && Number.isFinite(value) ? value : 0
  const [displayValue, setDisplayValue] = useState(safeValue)
  const currentValue = useRef(safeValue)

  useEffect(() => {
    const from = currentValue.current
    if (from === safeValue) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      currentValue.current = safeValue
      setDisplayValue(safeValue)
      return
    }

    let startTime: number | null = null
    let frameId = 0
    const duration = 620
    const update = (now: number) => {
      if (startTime === null) startTime = now
      const progress = Math.min(1, (now - startTime) / duration)
      const factor = 10 ** precision
      const next = Math.round((from + (safeValue - from) * easeOutDeceleration(progress)) * factor) / factor
      currentValue.current = next
      setDisplayValue(next)
      if (progress < 1) frameId = window.requestAnimationFrame(update)
      else currentValue.current = safeValue
    }

    frameId = window.requestAnimationFrame(update)
    return () => window.cancelAnimationFrame(frameId)
  }, [precision, safeValue])

  const formatOptions = precision > 0
    ? { minimumFractionDigits: precision, maximumFractionDigits: precision }
    : undefined

  return (
    <span className={className} aria-label={safeValue.toLocaleString('zh-CN', formatOptions)} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {displayValue.toLocaleString('zh-CN', formatOptions)}
    </span>
  )
}
