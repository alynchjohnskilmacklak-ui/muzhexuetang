import { describe, it, expect } from 'vitest'
import { getAllocationBands, getTopRecommendation } from './volunteer-2025'

const resolver = (name: string) => {
  if (name === '新乐一中') return { yiTong: 500, tongZhao: 480, allocationLine: null }
  if (name === '辛集中学') return { yiTong: 560, tongZhao: 540, allocationLine: 545 }
  return null
}

describe('getAllocationBands', () => {
  it('分配生线缺失的学校不应被过滤掉（回退守护）', () => {
    const bands = getAllocationBands('新开路中学', 60, 470, resolver)
    expect(bands.some(b => b.highSchoolName === '新乐一中')).toBe(true)
  })

  it('线缺失时不误判为分数不足', () => {
    const bands = getAllocationBands('新开路中学', 60, 470, resolver)
    const xinle = bands.find(b => b.highSchoolName === '新乐一中')
    expect(xinle?.tag).not.toBe('分数不足')
  })

  it('级联按名额累计分档，返回非空', () => {
    const bands = getAllocationBands('新开路中学', 60, 470, resolver)
    expect(bands.length).toBeGreaterThan(0)
  })

  it('有分配生线的学校正常参与分数判定', () => {
    const bands = getAllocationBands('新开路中学', 1, 600, resolver)
    const xinji = bands.find(b => b.highSchoolName === '辛集中学')
    expect(xinji).toBeDefined()
    if (xinji) expect(xinji.allocationLine).not.toBeNull()
  })
})

describe('getTopRecommendation', () => {
  it('有推荐时返回 recommended', () => {
    const bands = getAllocationBands('新开路中学', 1, 600, resolver)
    const top = getTopRecommendation(bands)
    if (bands.some(b => b.tag === '推荐')) {
      expect(top?.source).toBe('recommended')
    }
  })

  it('无推荐时返回 fallback_safe 或 null', () => {
    const bands = getAllocationBands('新开路中学', 99999, 300, resolver)
    const top = getTopRecommendation(bands)
    expect(top === null || top.source === 'fallback_safe').toBe(true)
  })
})
