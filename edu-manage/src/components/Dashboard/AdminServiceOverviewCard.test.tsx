import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AdminServiceOverviewCard } from './AdminServiceOverviewCard'

describe('admin service overview dashboard card', () => {
  it('links to the existing service overview page', () => {
    const html = renderToStaticMarkup(<AdminServiceOverviewCard />)

    expect(html).toContain('href="/services"')
    expect(html).toContain('业务总览')
  })
})
