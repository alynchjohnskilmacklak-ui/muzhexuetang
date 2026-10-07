import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const providers = readFileSync(new URL('../app/providers.tsx', import.meta.url), 'utf8')
const mobileLayout = readFileSync(new URL('../components/Layout/MobileLayout.tsx', import.meta.url), 'utf8')
const containHook = readFileSync(new URL('../hooks/useContainTouchScroll.ts', import.meta.url), 'utf8')
const globalStyles = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

describe('mobile scroll safety contract', () => {
  it('does not cancel native touchmove gestures', () => {
    expect(containHook).not.toContain("addEventListener('touchmove'")
    expect(containHook).not.toContain('preventDefault()')
  })

  it('does not poll and rewrite the document scroll lock while the user scrolls', () => {
    expect(providers).not.toContain('releaseStaleScrollLock')
    expect(providers).not.toContain("addEventListener('touchend'")
  })

  it('keeps the mobile shell out of the vertical scroll-container chain', () => {
    expect(mobileLayout).not.toContain("overflowX: 'hidden'")
    expect(mobileLayout).toContain("overflowX: 'clip'")
    expect(globalStyles).not.toMatch(/body\.ant-scrolling-effect\s*\{[\s\S]*?touch-action:\s*none/)
  })
})
