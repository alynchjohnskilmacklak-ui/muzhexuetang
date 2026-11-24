'use client'

import React, { type ButtonHTMLAttributes, type ReactNode } from 'react'

export interface ShimmerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode
  /** 微光扫掠颜色，默认流金浅白 */
  shimmerColor?: string
  /** 扫光周期时长，默认 3s */
  shimmerDuration?: string
  /** 按钮背景，默认墨玉墨绿渐变 */
  background?: string
  /** 圆角大小，默认 12px */
  borderRadius?: string | number
  /** 是否处于加载中状态 */
  loading?: boolean
}

/**
 * Magic UI · ShimmerButton（微晶扫光呼吸按钮）
 * 专为高转化场景（如系统登录、确认预约）设计，光带沿 25 度斜角匀速滑过，兼顾丝滑呼吸与微弹按压反馈。
 */
export function ShimmerButton({
  children,
  shimmerColor = 'rgba(214, 180, 91, 0.38)',
  shimmerDuration = '3s',
  background = 'linear-gradient(135deg, #186358 0%, #10483F 100%)',
  borderRadius = 12,
  loading = false,
  disabled = false,
  className = '',
  style,
  ...props
}: ShimmerButtonProps) {
  const isDisabled = disabled || loading

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={`mz-magic-shimmer-btn ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.65 : 1,
        borderRadius,
        background,
        border: '1px solid rgba(255, 255, 255, 0.16)',
        boxShadow: '0 6px 18px -2px rgba(20, 87, 77, 0.35), 0 2px 4px rgba(20, 87, 77, 0.16)',
        color: '#FFFFFF',
        fontFamily: 'inherit',
        transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* 扫光层 */}
      {!isDisabled && (
        <span
          aria-hidden="true"
          className="mz-magic-shimmer-sweep"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `linear-gradient(90deg, transparent 0%, transparent 20%, ${shimmerColor} 50%, transparent 80%, transparent 100%)`,
            animation: `mzShimmerSweep ${shimmerDuration} infinite ease-in-out`,
            willChange: 'transform',
          }}
        />
      )}

      {/* 内容层 */}
      <span
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          height: '100%',
        }}
      >
        {loading && (
          <span
            className="mz-magic-btn-spinner"
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTopColor: '#FFFFFF',
              animation: 'mzBtnSpin 0.7s linear infinite',
              display: 'inline-block',
            }}
          />
        )}
        {children}
      </span>
    </button>
  )
}
