'use client'

import { useEffect } from 'react'

/** Keep a sheet's momentum inside its own scroll area without cancelling touch events. */
export function useContainTouchScroll(open: boolean, selector: string) {
  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(selector)
      if (!element) return
      const previousOverscroll = element.style.overscrollBehaviorY
      const previousTouchAction = element.style.touchAction
      element.style.overscrollBehaviorY = 'contain'
      element.style.touchAction = 'pan-y pinch-zoom'
      cleanup = () => {
        element.style.overscrollBehaviorY = previousOverscroll
        element.style.touchAction = previousTouchAction
      }
    })
    let cleanup = () => {}
    return () => {
      window.cancelAnimationFrame(frame)
      cleanup()
    }
  }, [open, selector])
}
