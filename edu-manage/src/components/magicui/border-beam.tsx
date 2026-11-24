'use client'

import React, { type CSSProperties } from 'react'

export interface BorderBeamProps {
  /** 额外的样式类名 */
  className?: string
  /** 边框光环厚度（px），默认 1.5 */
  borderWidth?: number
  /** 单次旋转周期时长（秒），默认 10 */
  duration?: number
  /** 渐变起始颜色，默认牧哲学堂流金 #D6B45B */
  colorFrom?: string
  /** 渐变过渡色，默认牧哲学堂墨玉绿 #14574D */
  colorTo?: string
  /** 边框圆角，默认 inherit 跟随父容器 */
  borderRadius?: string | number
  /** 自定义行内样式 */
  style?: CSSProperties
}

/**
 * Magic UI · BorderBeam（流动光环边框）
 * 专为牧哲学堂东方美学定制：墨玉流金流光在圆角边框表面悄然穿梭，低调奢华。
 * 纯 CSS 硬件加速渲染，零外部重型依赖，自动适配 prefers-reduced-motion。
 */
export function BorderBeam({
  className = '',
  borderWidth = 1.5,
  duration = 10,
  colorFrom = '#D6B45B',
  colorTo = '#14574D',
  borderRadius = 'inherit',
  style,
}: BorderBeamProps) {
  return (
    <div
      aria-hidden="true"
      className={`mz-magic-border-beam ${className}`}
      style={{
        position: 'absolute',
        inset: -borderWidth,
        borderRadius,
        padding: borderWidth,
        pointerEvents: 'none',
        zIndex: 1,
        overflow: 'hidden',
        // 双重遮罩合成：仅保留内边距（即边框轨道）部分
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        maskComposite: 'exclude',
        ...style,
      }}
    >
      <div
        className="mz-magic-border-beam-spinner"
        style={{
          position: 'absolute',
          top: '-100%',
          left: '-100%',
          width: '300%',
          height: '300%',
          background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 40deg, ${colorFrom} 75deg, ${colorTo} 110deg, transparent 145deg, transparent 360deg)`,
          animation: `mzBorderBeamRotate ${duration}s linear infinite`,
          willChange: 'transform',
        }}
      />
    </div>
  )
}
