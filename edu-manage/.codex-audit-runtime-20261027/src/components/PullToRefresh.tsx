'use client'

import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { ArrowDownOutlined, LoadingOutlined } from '@ant-design/icons'

const TRIGGER_DISTANCE = 70

export function PullToRefresh({ children, onRefresh }: { children: ReactNode; onRefresh: () => Promise<unknown> }) {
  const startY = useRef<number | null>(null)
  const eligible = useRef(false)
  const [enabled, setEnabled] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [distance, setDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(hover: none) and (pointer: coarse)')
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setEnabled(media.matches)
    const updateMotion = () => setReducedMotion(motion.matches)
    update()
    updateMotion()
    media.addEventListener('change', update)
    motion.addEventListener('change', updateMotion)
    return () => {
      media.removeEventListener('change', update)
      motion.removeEventListener('change', updateMotion)
    }
  }, [])

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (!enabled || refreshing || window.scrollY > 0) return
    startY.current = event.touches[0]?.clientY ?? null
    eligible.current = startY.current !== null
  }

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    if (!enabled || !eligible.current || startY.current === null || refreshing || window.scrollY > 0) return
    const delta = (event.touches[0]?.clientY ?? startY.current) - startY.current
    if (delta <= 0) {
      setDistance(0)
      return
    }
    setDistance(Math.min(delta * 0.55, 96))
  }

  const finishPull = async () => {
    const shouldRefresh = distance >= TRIGGER_DISTANCE && !refreshing
    startY.current = null
    eligible.current = false
    if (!shouldRefresh) {
      setDistance(0)
      return
    }
    setRefreshing(true)
    setDistance(52)
    try {
      await onRefresh()
    } catch (error) {
      console.warn('[pull-to-refresh] refresh failed', error)
    } finally {
      setRefreshing(false)
      setDistance(0)
    }
  }

  const label = refreshing ? '正在刷新' : distance >= TRIGGER_DISTANCE ? '松开刷新' : '下拉刷新'

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={() => void finishPull()} onTouchCancel={() => void finishPull()}>
      <div
        aria-live="polite"
        style={{
          height: distance,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          color: '#9a8e7a',
          fontSize: 12,
          transition: refreshing && !reducedMotion ? 'height .2s ease' : undefined,
        }}
      >
        {refreshing ? <LoadingOutlined spin={!reducedMotion} /> : <ArrowDownOutlined style={{ transform: distance >= TRIGGER_DISTANCE ? 'rotate(180deg)' : undefined, transition: reducedMotion ? undefined : 'transform .18s ease' }} />}
        {label}
      </div>
      {children}
    </div>
  )
}
