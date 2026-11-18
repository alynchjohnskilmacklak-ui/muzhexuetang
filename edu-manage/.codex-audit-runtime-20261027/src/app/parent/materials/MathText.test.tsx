import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MathText } from './MathText'

describe('practice formula rendering', () => {
  it('typesets inline equations adjacent to Chinese text', () => {
    const html = renderToStaticMarkup(<MathText text="已知 $x=4$，求 $2x+1$。" inline />)
    expect(html).toContain('class="katex"')
    expect(html).not.toContain('$x=4$')
    expect(html).not.toContain('$2x+1$')
  })

  it('typesets fractions rather than exposing LaTeX commands', () => {
    const html = renderToStaticMarkup(<MathText text={'$\\dfrac{x+1}{2}=4$'} inline />)
    expect(html).toContain('class="katex"')
    expect(html).not.toContain('$\\dfrac')
  })
})
