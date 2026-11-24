'use client'

import { useEffect } from 'react'

const TARGET_SELECTOR = 'button:not(:disabled):not([aria-disabled="true"]), [role="button"]:not([aria-disabled="true"]), [role="switch"]:not([aria-disabled="true"]), [role="checkbox"]:not([aria-disabled="true"]), .ant-segmented-item:not(.ant-segmented-item-disabled), label:has(.ant-checkbox), label:has(.ant-radio-button), label:has(.ant-segmented-item-input), a[href]'

export function InteractionMotionLayer() {
  useEffect(() => {
    const activeTargets = new Map<number, HTMLElement>()
    const timers = new WeakMap<HTMLElement, number>()
    const inlinePositions = new WeakMap<HTMLElement, string>()

    const clearTimer = (target: HTMLElement) => {
      const timer = timers.get(target)
      if (timer) window.clearTimeout(timer)
    }

    const animateRelease = (target: HTMLElement) => {
      target.classList.remove('mz-is-pressed', 'mz-spring-release')
      void target.offsetWidth
      target.classList.add('mz-spring-release')
      clearTimer(target)
      timers.set(target, window.setTimeout(() => {
        target.classList.remove('mz-motion-target', 'mz-spring-release')
        target.querySelectorAll(':scope > .mz-ripple-layer').forEach((layer) => layer.remove())
        const originalPosition = inlinePositions.get(target)
        if (originalPosition !== undefined) target.style.position = originalPosition
        inlinePositions.delete(target)
      }, 580))
    }

    const start = (target: HTMLElement, clientX: number, clientY: number) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      clearTimer(target)
      target.classList.add('mz-motion-target', 'mz-is-pressed')
      target.classList.remove('mz-spring-release')
      const computed = window.getComputedStyle(target)
      if (computed.position === 'static') {
        inlinePositions.set(target, target.style.position)
        target.style.position = 'relative'
      }

      const rect = target.getBoundingClientRect()
      const layer = document.createElement('span')
      layer.className = 'mz-ripple-layer'
      layer.setAttribute('aria-hidden', 'true')
      const ripple = document.createElement('span')
      ripple.className = 'mz-click-ripple'
      ripple.style.left = `${clientX - rect.left}px`
      ripple.style.top = `${clientY - rect.top}px`
      ripple.style.setProperty('--mz-ripple-scale', String(Math.ceil(Math.hypot(rect.width, rect.height) / 7)))
      layer.append(ripple)
      target.querySelectorAll(':scope > .mz-ripple-layer').forEach((existing) => existing.remove())
      target.append(layer)
      timers.set(target, window.setTimeout(() => layer.remove(), 620))
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(TARGET_SELECTOR) : null
      if (!target || target.closest('[data-motion-ignore]')) return
      start(target, event.clientX, event.clientY)
      activeTargets.set(event.pointerId, target)
    }

    const onPointerUp = (event: PointerEvent) => {
      const target = activeTargets.get(event.pointerId)
      if (!target) return
      activeTargets.delete(event.pointerId)
      animateRelease(target)
    }

    const onPointerCancel = (event: PointerEvent) => {
      const target = activeTargets.get(event.pointerId)
      if (!target) return
      activeTargets.delete(event.pointerId)
      target.classList.remove('mz-is-pressed')
      clearTimer(target)
      timers.set(target, window.setTimeout(() => {
        target.classList.remove('mz-motion-target')
        target.querySelectorAll(':scope > .mz-ripple-layer').forEach((layer) => layer.remove())
        const originalPosition = inlinePositions.get(target)
        if (originalPosition !== undefined) target.style.position = originalPosition
        inlinePositions.delete(target)
      }, 200))
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || (event.key !== 'Enter' && event.key !== ' ')) return
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(TARGET_SELECTOR) : null
      if (!target || target.closest('[data-motion-ignore]')) return
      const rect = target.getBoundingClientRect()
      start(target, rect.left + rect.width / 2, rect.top + rect.height / 2)
      activeTargets.set(-1, target)
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      const target = activeTargets.get(-1)
      if (!target) return
      activeTargets.delete(-1)
      animateRelease(target)
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('pointerup', onPointerUp, true)
    document.addEventListener('pointercancel', onPointerCancel, true)
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('keyup', onKeyUp, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('pointerup', onPointerUp, true)
      document.removeEventListener('pointercancel', onPointerCancel, true)
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('keyup', onKeyUp, true)
      activeTargets.forEach((target) => {
        target.classList.remove('mz-is-pressed', 'mz-motion-target', 'mz-spring-release')
        target.querySelectorAll(':scope > .mz-ripple-layer').forEach((layer) => layer.remove())
        const originalPosition = inlinePositions.get(target)
        if (originalPosition !== undefined) target.style.position = originalPosition
      })
    }
  }, [])

  return null
}
