'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { cacheAvatarObjectUrl, peekCachedAvatarObjectUrl } from '@/lib/avatar-image-cache'

interface Props {
  src?: string | null
  fallbackSrc?: string | null
  alt: string
  className?: string
  style?: CSSProperties
  loading?: 'eager' | 'lazy'
  onError?: () => void
  /** 跳过 blob 对象缓存，始终使用原始 URL（用于截图/导出场景，modern-screenshot 无法渲染 blob: 图） */
  noCache?: boolean
}

/** Avatar image that retains a small, decoded session copy across route changes. */
export function CachedAvatarImage({ src, fallbackSrc, alt, className, style, loading = 'lazy', onError, noCache = false }: Props) {
  const rawSource = src?.trim() || ''
  const source = !noCache && rawSource.startsWith('/api/uploads/') && !/[?&]variant=/.test(rawSource)
    ? `${rawSource}${rawSource.includes('?') ? '&' : '?'}variant=thumbnail`
    : rawSource
  const fallback = fallbackSrc?.trim() || ''
  // noCache 时不参与 blob 缓存链，直接从原始 source 出图（避免截图/导出时 blob: 渲染空白）
  const initialState = useMemo(() => noCache
    ? { source, fallback, displaySrc: source || fallback, failed: false }
    : { source, fallback, displaySrc: source ? peekCachedAvatarObjectUrl(source) || source : fallback, failed: false },
  [source, fallback, noCache])
  const [imageState, setImageState] = useState(initialState)

  useEffect(() => {
    setImageState(initialState)
  }, [initialState])

  // Derive the next image synchronously so switching students never paints the
  // previous student's portrait for a frame while the effect catches up.
  const currentState = imageState.source === source && imageState.fallback === fallback
    ? imageState
    : initialState
  const visibleSrc = currentState.failed ? fallback : currentState.displaySrc || fallback

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={noCache ? (source || fallback) : (visibleSrc || undefined)}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      style={style}
      onLoad={(event) => {
        if (noCache || !source || currentState.failed || currentState.displaySrc !== source || source.startsWith('blob:') || source.startsWith('data:')) return
        void cacheAvatarObjectUrl(source, event.currentTarget).then((objectUrl) => {
          setImageState((current) => current.source === source && current.fallback === fallback && current.displaySrc === source
            ? { ...current, displaySrc: objectUrl }
            : current)
        }).catch(() => undefined)
      }}
      onError={(event) => {
        onError?.()
        if (!currentState.failed && currentState.displaySrc.startsWith('blob:') && source) {
          setImageState({ source, fallback, displaySrc: source, failed: false })
          return
        }
        if (visibleSrc !== fallback) setImageState({ ...currentState, failed: true })
        else event.currentTarget.removeAttribute('src')
      }}
    />
  )
}
