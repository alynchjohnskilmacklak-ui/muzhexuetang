'use client'

import React, { useEffect, useRef, useState } from 'react'

export interface NumberTickerProps {
  /** 目标数值 */
  value: number
  /** 滚动方向，默认 up 递增 */
  direction?: 'up' | 'down'
  /** 动画延迟启动（毫秒），默认 0 */
  delay?: number
  /** 动画持续时间（毫秒），默认 1200 */
  duration?: number
  /** 小数位数，默认 0 */
  decimalPlaces?: number
  /** 自定义 CSS 类名 */
  className?: string
  /** 前缀字符（如 ￥、+） */
  prefix?: string
  /** 后缀字符（如 %、分、课时） */
  suffix?: string
}

/**
 * Magic UI · NumberTicker（物理数字滚动器）
 * 适合满分捷报、课时结余、出勤率等关键数字的生动呈现，带物理阻尼减速（Cubic Out）。
 */
export function NumberTicker({
  value,
  direction = 'up',
  delay = 0,
  duration = 1200,
  decimalPlaces = 0,
  className = '',
  prefix = '',
  suffix = '',
}: NumberTickerProps) {
  const [displayValue, setDisplayValue] = useState<number>(() =>
    direction === 'down' ? value : 0
  )
  const animRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    // 监听减弱动画偏好
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(value)
      return
    }

    const startVal = direction === 'down' ? value * 1.5 : 0
    const endVal = value

    const timeout = setTimeout(() => {
      const step = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp
        const elapsed = timestamp - startTimeRef.current
        const progress = Math.min(elapsed / duration, 1)

        // Ease out cubic: 1 - pow(1 - x, 3)
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const current = startVal + (endVal - startVal) * easeOut

        setDisplayValue(current)

        if (progress < 1) {
          animRef.current = requestAnimationFrame(step)
        } else {
          setDisplayValue(endVal)
        }
      }

      animRef.current = requestAnimationFrame(step)
    }, delay)

    return () => {
      clearTimeout(timeout)
      if (animRef.current) cancelAnimationFrame(animRef.current)
      startTimeRef.current = null
    }
  }, [value, direction, delay, duration])

  return (
    <span className={`mz-magic-number-ticker ${className}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {prefix}
      {displayValue.toFixed(decimalPlaces)}
      {suffix}
    </span>
  )
}
