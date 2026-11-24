import { describe, expect, it } from 'vitest'
import { buildFinanceOption } from './chartBuilders'

describe('buildFinanceOption', () => {
  it('does not invent expenses or profit when operating costs are unknown', () => {
    const option = buildFinanceOption([{ month: '2026/11', income: 1200, expense: null, profit: null }])

    expect(option.legend.data).toEqual(['收费收入'])
    expect(option.series.map((series) => series.name)).toEqual(['收费收入'])
  })

  it('includes manually recorded expenses without deriving profit from incomplete data', () => {
    const option = buildFinanceOption([
      { month: '2026/10', income: 1200, expense: 700, profit: null },
      { month: '2026/11', income: 1500, expense: null, profit: null },
    ])

    expect(option.legend.data).toEqual(['收费收入', '已登记支出'])
    expect(option.series.map((series) => series.name)).toEqual(['收费收入', '已登记支出'])
  })

  it('shows profit only if every period has complete cost data', () => {
    const option = buildFinanceOption([
      { month: '2026/10', income: 1200, expense: 700, profit: 500 },
      { month: '2026/11', income: 1500, expense: 900, profit: 600 },
    ])
    expect(option.series.map((series) => series.name)).toEqual(['收费收入', '已登记支出', '利润'])
  })
})
