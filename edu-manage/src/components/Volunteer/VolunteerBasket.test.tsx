import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { VolunteerBasket } from './VolunteerBasket'

describe('volunteer basket layout', () => {
  it('keeps all fifteen empty slots out of the initial mobile school view', () => {
    const html = renderToStaticMarkup(
      <VolunteerBasket isMobile allocationCount={0} shifanCount={0} putongCount={0} onOpenForm={() => {}}>
        <div>完整志愿空位列表</div>
      </VolunteerBasket>,
    )
    expect(html).not.toContain('完整志愿空位列表')
    expect(html).toContain('已选 0/15')
    expect(html).toContain('查看志愿篮')
  })

  it('shows selected counts without expanding the mobile basket', () => {
    const html = renderToStaticMarkup(
      <VolunteerBasket isMobile allocationCount={1} shifanCount={2} putongCount={3} onOpenForm={() => {}}>
        <div>学校详情与调序控件</div>
      </VolunteerBasket>,
    )
    expect(html).toContain('已选 6/15')
    expect(html).toContain('分配生 1/3')
    expect(html).toContain('省示范 2/6')
    expect(html).toContain('普高 3/6')
    expect(html).not.toContain('学校详情与调序控件')
  })

  it('keeps the full desktop basket in normal page flow', () => {
    const html = renderToStaticMarkup(
      <VolunteerBasket isMobile={false} allocationCount={0} shifanCount={0} putongCount={0} onOpenForm={() => {}}>
        <div>志愿调序与导出</div>
      </VolunteerBasket>,
    )
    expect(html).toContain('志愿调序与导出')
    expect(html).not.toContain('position:sticky')
  })
})
