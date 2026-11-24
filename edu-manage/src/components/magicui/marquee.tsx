'use client'

import React, { type ReactNode, type CSSProperties } from 'react'

export interface MarqueeProps {
  className?: string
  /** 是否反向滚动 */
  reverse?: boolean
  /** 鼠标悬停时是否暂停动画，默认 true */
  pauseOnHover?: boolean
  /** 内容子元素 */
  children: ReactNode
  /** 是否垂直方向滚动，默认 false */
  vertical?: boolean
  /** 单个循环持续时间（秒），默认 28 */
  duration?: number
  /** 子元素间隙（px），默认 16 */
  gap?: number
  /** 重复次数以保证平滑循环，默认 2 */
  repeat?: number
  style?: CSSProperties
}

/**
 * Magic UI · Marquee（无缝平滑跑马灯）
 * 适合官网荣誉喜报、学员名校捷报、教学服务清单平滑流动展示，告别原生走马灯的掉帧卡顿。
 */
export function Marquee({
  className = '',
  reverse = false,
  pauseOnHover = true,
  children,
  vertical = false,
  duration = 28,
  gap = 16,
  repeat = 2,
  style,
}: MarqueeProps) {
  const directionClass = vertical ? 'mz-marquee-vertical' : 'mz-marquee-horizontal'
  const reverseClass = reverse ? 'is-reverse' : ''
  const pauseClass = pauseOnHover ? 'pause-on-hover' : ''

  return (
    <div
      className={`mz-magic-marquee-container ${directionClass} ${pauseClass} ${className}`}
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        overflow: 'hidden',
        userSelect: 'none',
        gap,
        ...style,
      }}
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          className={`mz-magic-marquee-content ${reverseClass}`}
          style={{
            display: 'flex',
            flexDirection: vertical ? 'column' : 'row',
            flexShrink: 0,
            justifyContent: 'space-around',
            gap,
            animationDuration: `${duration}s`,
          }}
        >
          {children}
        </div>
      ))}
    </div>
  )
}
