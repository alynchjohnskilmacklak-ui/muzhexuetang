import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import { BorderBeam } from './border-beam'
import { ShimmerButton } from './shimmer-button'
import { Marquee } from './marquee'
import { NumberTicker } from './number-ticker'

describe('Magic UI Components (Customized for 牧哲学堂)', () => {
  it('renders BorderBeam with mask and conic gradient', () => {
    const html = renderToStaticMarkup(
      <BorderBeam
        borderWidth={2}
        duration={8}
        colorFrom="#D6B45B"
        colorTo="#14574D"
        borderRadius={22}
      />
    )
    expect(html).toContain('mz-magic-border-beam')
    expect(html).toContain('mzBorderBeamRotate 8s linear infinite')
    expect(html).toContain('#D6B45B')
    expect(html).toContain('#14574D')
  })

  it('renders ShimmerButton with sweep layer and children', () => {
    const html = renderToStaticMarkup(
      <ShimmerButton loading={false}>
        登 录
      </ShimmerButton>
    )
    expect(html).toContain('mz-magic-shimmer-btn')
    expect(html).toContain('mz-magic-shimmer-sweep')
    expect(html).toContain('登 录')
  })

  it('renders ShimmerButton loading state with spinner', () => {
    const html = renderToStaticMarkup(
      <ShimmerButton loading={true}>
        登 录中
      </ShimmerButton>
    )
    expect(html).toContain('mz-magic-btn-spinner')
    expect(html).toContain('disabled=""')
  })

  it('renders Marquee with repeat items and gap', () => {
    const html = renderToStaticMarkup(
      <Marquee repeat={2} gap={16}>
        <span>喜报 1</span>
        <span>喜报 2</span>
      </Marquee>
    )
    expect(html).toContain('mz-magic-marquee-container')
    expect(html).toContain('mz-magic-marquee-content')
    expect(html).toContain('喜报 1')
  })

  it('renders NumberTicker with prefix and suffix', () => {
    const html = renderToStaticMarkup(
      <NumberTicker value={100} prefix="满分 " suffix=" 分" />
    )
    expect(html).toContain('mz-magic-number-ticker')
    expect(html).toContain('满分')
    expect(html).toContain('分')
  })
})
