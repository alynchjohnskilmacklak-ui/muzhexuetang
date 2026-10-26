'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Sticker } from '@/constants/stickers'

/** 静态预览优先；仅靠近视口时才挂载动画资源，出视口后退回海报帧。 */
export function StickerImage({
  sticker,
  animated = false,
  style,
}: {
  sticker: Sticker
  animated?: boolean
  style?: CSSProperties
}) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const [isNearViewport, setIsNearViewport] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [animationFailed, setAnimationFailed] = useState(false)
  const [posterFailed, setPosterFailed] = useState(false)

  useEffect(() => {
    if (!animated) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setPrefersReducedMotion(media.matches)
    updatePreference()
    media.addEventListener('change', updatePreference)
    return () => media.removeEventListener('change', updatePreference)
  }, [animated])

  useEffect(() => {
    if (!animated || prefersReducedMotion) {
      setIsNearViewport(false)
      return
    }
    const container = containerRef.current
    if (!container) return
    if (typeof IntersectionObserver === 'undefined') {
      setIsNearViewport(true)
      return
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsNearViewport(entry.isIntersecting)
    }, { rootMargin: '160px' })
    observer.observe(container)
    return () => observer.disconnect()
  }, [animated, prefersReducedMotion])

  const useAnimation = animated && !prefersReducedMotion && isNearViewport && !animationFailed
  const imageSrc = useAnimation ? sticker.src : sticker.posterSrc

  return (
    <span
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'block',
        overflow: 'hidden',
        aspectRatio: '1 / 1',
        backgroundColor: 'var(--color-surface-2)',
        borderRadius: 8,
        ...style,
      }}
    >
      {posterFailed ? (
        <span
          role="img"
          aria-label={sticker.name + '，图片暂不可用'}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 8,
            boxSizing: 'border-box',
            border: '1px dashed var(--color-hairline-strong)',
            color: 'var(--color-ink-subtle)',
            background: 'var(--color-surface-2)',
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          {sticker.name}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageSrc}
          alt={sticker.name}
          width={useAnimation ? 240 : 160}
          height={useAnimation ? 240 : 160}
          loading="lazy"
          decoding="async"
          onError={() => {
            if (useAnimation) setAnimationFailed(true)
            else setPosterFailed(true)
          }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      )}
    </span>
  )
}
