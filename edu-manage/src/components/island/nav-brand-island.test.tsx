import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import { NavBrandIsland } from './nav-brand-island'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

describe('NavBrandIsland Component', () => {
  it('renders top island capsule button in parent portal', () => {
    const html = renderToStaticMarkup(<NavBrandIsland roleLabel="家长端" />)
    expect(html).toContain('课时消耗与剩余预警')
    expect(html).toContain('余3课时')
  })

  it('renders compact island capsule button when compact=true', () => {
    const html = renderToStaticMarkup(<NavBrandIsland roleLabel="家长端" compact={true} />)
    expect(html).toContain('课时预警')
    expect(html).toContain('余3h')
  })

  it('renders teacher scenario correctly', () => {
    const html = renderToStaticMarkup(<NavBrandIsland roleLabel="教师端" />)
    expect(html).toContain('初二尖子1班 · 授课中')
  })

  it('renders admin scenario correctly', () => {
    const html = renderToStaticMarkup(<NavBrandIsland roleLabel="管理端" />)
    expect(html).toContain('校区运行大盘 · 18堂开课')
  })

  it('renders compact admin scenario correctly when compact=true', () => {
    const html = renderToStaticMarkup(<NavBrandIsland roleLabel="管理端" compact={true} />)
    expect(html).toContain('校区大盘·18堂')
    expect(html).toContain('98.6%')
  })
})
