import { describe, expect, it } from 'vitest'
import { getAllocationBands } from './volunteer-2025'

describe('getAllocationBands —— 分配线缺失不应丢弃学校', () => {
  const yiTongMap: Record<string, number> = {
    正定中学: 560,
    石家庄实验中学: 555,
    石家庄第二实验中学: 550,
    辛集中学: 545,
    新乐一中: 480,
  }

  const dbLineMap: Record<string, number> = {
    正定中学: 600,
    石家庄实验中学: 595,
    石家庄第二实验中学: 590,
    辛集中学: 585,
  }

  const lineLookup = (name: string) =>
    yiTongMap[name] != null
      ? { yiTong: yiTongMap[name], tongZhao: yiTongMap[name], allocationLine: dbLineMap[name] ?? null }
      : { yiTong: 300, tongZhao: 300, allocationLine: null }

  it('新乐一中(名额131,无分配线)在 31名/732分/控制线460 时应被推荐而非消失', () => {
    const bands = getAllocationBands('新开路中学', 31, 732, 460, lineLookup)

    const xinle = bands.find((band) => band.highSchoolName === '新乐一中')
    expect(xinle).toBeDefined()
    expect(xinle!.lineSource).toBe('control')
    expect(xinle!.effectiveLine).toBe(460)
    expect(['推荐', '保底']).toContain(xinle!.tag)
  })

  it('分数低于控制线时仍判分数不足', () => {
    const bands = getAllocationBands('新开路中学', 31, 400, 460, lineLookup)
    const xinle = bands.find((band) => band.highSchoolName === '新乐一中')

    expect(xinle).toBeDefined()
    expect(xinle!.tag).toBe('分数不足')
  })
})
