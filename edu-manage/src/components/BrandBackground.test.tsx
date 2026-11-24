import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BrandBackgroundScene } from './BrandBackground'

describe('BrandBackground', () => {
  it('renders mobile variant SVG markup correctly', () => {
    const markup = renderToStaticMarkup(<BrandBackgroundScene variant="mobile" />)
    expect(markup).toContain('viewBox="0 0 390 844"')
    expect(markup).toContain('brand-bg-scene')
  })

  it('renders tablet variant SVG markup correctly', () => {
    const markup = renderToStaticMarkup(<BrandBackgroundScene variant="tablet" />)
    expect(markup).toContain('viewBox="0 0 768 1024"')
  })

  it('renders desktop variant SVG markup correctly', () => {
    const markup = renderToStaticMarkup(<BrandBackgroundScene variant="desktop" />)
    expect(markup).toContain('viewBox="0 0 1600 900"')
  })

  it('contains essential brand definitions and gradients', () => {
    const markup = renderToStaticMarkup(<BrandBackgroundScene variant="desktop" />)
    expect(markup).toContain('id="brand-background-gradient"')
    expect(markup).toContain('id="brand-logo-mark"')
  })
})
