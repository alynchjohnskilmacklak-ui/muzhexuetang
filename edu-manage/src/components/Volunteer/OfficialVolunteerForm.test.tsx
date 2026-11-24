import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import OfficialVolunteerForm from './OfficialVolunteerForm'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

describe('OfficialVolunteerForm layout and actions', () => {
  it('renders top return button and action bar without mobile-shell-back hidden class', () => {
    const html = renderToStaticMarkup(<OfficialVolunteerForm portal="parent" />)
    expect(html).toContain('返回模拟测算')
    expect(html).toContain('从模拟方案同步')
    expect(html).toContain('清空重选')
    expect(html).not.toContain('mobile-shell-back')
  })

  it('renders summary bar with allocation, shifan and putong slot counts', () => {
    const html = renderToStaticMarkup(<OfficialVolunteerForm portal="admin" />)
    expect(html).toContain('已选 0/15')
    expect(html).toContain('分配生 0/3')
    expect(html).toContain('省示范 0/6')
    expect(html).toContain('普高 0/6')
  })
})
