'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDownOutlined, LoadingOutlined } from '@ant-design/icons'
import { getRubberBandOffset } from '@/lib/ui-motion'

const TRIGGER_DISTANCE = 58
const MAX_PULL_DISTANCE = 104
const REFRESH_HOLD_DISTANCE = 52

export function PullToRefresh({ children, onRefresh }: { children: ReactNode; onRefresh: () => Promise<unknown> }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const startPoint = useRef<{ x: number; y: number } | null>(null)
  const eligible = useRef(false)
  const distanceRef = useRef(0)
  const enabledRef = useRef(false)
  const refreshingRef = useRef(false)
  const onRefreshRef = useRef(onRefresh)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [distance, setDistance] = useState(0)
  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const touchQuery = window.matchMedia('(hover: none) and (pointer: coarse)')
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateTouch = () => { enabledRef.current = touchQuery.matches }
    const updateMotion = () => setReducedMotion(motionQuery.matches)
    updateTouch()
    updateMotion()
    touchQuery.addEventListener('change', updateTouch)
    motionQuery.addEventListener('change', updateMotion)

    const setPullDistance = (nextDistance: number) => {
      distanceRef.current = nextDistance
      setDistance(nextDistance)
    }

    const finishPull = async (cancelled: boolean) => {
      const shouldRefresh = !cancelled && distanceRef.current >= TRIGGER_DISTANCE && !refreshingRef.current
      startPoint.current = null
      eligible.current = false
      setPulling(false)

      if (!shouldRefresh) {
        setPullDistance(0)
        return
      }

      refreshingRef.current = true
      setRefreshing(true)
      setPullDistance(REFRESH_HOLD_DISTANCE)
      try {
        await onRefreshRef.current()
      } catch (error) {
        console.warn('[pull-to-refresh] refresh failed', error)
      } finally {
        refreshingRef.current = false
        setRefreshing(false)
        setPullDistance(0)
      }
    }

    const handleTouchStart = (event: TouchEvent) => {
      if (!enabledRef.current || refreshingRef.current || window.scrollY > 0) return
      const touch = event.touches[0]
      if (!touch) return
      startPoint.current = { x: touch.clientX, y: touch.clientY }
      eligible.current = true
    }

    const handleTouchMove = (event: TouchEvent) => {
      const origin = startPoint.current
      if (!enabledRef.current || !eligible.current || !origin || refreshingRef.current || window.scrollY > 0) return
      const touch = event.touches[0]
      if (!touch) return

      const deltaX = touch.clientX - origin.x
      const rawDeltaY = touch.clientY - origin.y
      if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(rawDeltaY)) {
        eligible.current = false
        setPulling(false)
        setPullDistance(0)
        return
      }
      if (rawDeltaY <= 0) {
        setPulling(false)
        setPullDistance(0)
        return
      }

      if (event.cancelable) event.preventDefault()
      setPulling(true)
      setPullDistance(getRubberBandOffset(rawDeltaY * 1.4, MAX_PULL_DISTANCE))
    }

    const handleTouchEnd = () => { void finishPull(false) }
    const handleTouchCancel = () => { void finishPull(true) }

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })
    container.addEventListener('touchcancel', handleTouchCancel, { passive: true })

    return () => {
      touchQuery.removeEventListener('change', updateTouch)
      motionQuery.removeEventListener('change', updateMotion)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [])

  const label = refreshing ? '正在刷新' : distance >= TRIGGER_DISTANCE ? '松开刷新' : '下拉刷新'

  return (
    <div ref={containerRef} className="mz-pull-to-refresh" style={{ touchAction: 'pan-y', overscrollBehaviorY: 'contain' }}>
      <div
        className="mz-pull-to-refresh__indicator"
        data-refreshing={refreshing}
        data-pulling={pulling}
        aria-live="polite"
        aria-atomic="true"
        style={{
          height: distance,
          transition: pulling || reducedMotion ? 'none' : 'height 380ms cubic-bezier(.16,1,.3,1)',
        }}
      >
        {refreshing ? <LoadingOutlined spin={!reducedMotion} /> : <ArrowDownOutlined style={{ transform: distance >= TRIGGER_DISTANCE ? 'rotate(180deg)' : undefined }} />}
        <span>{label}</span>
      </div>
      {children}
    </div>
  )
}
