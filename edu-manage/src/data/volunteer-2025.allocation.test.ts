import { describe, expect, it } from 'vitest'
import { getAllocationBands, getRankTag, getScoreTag } from './volunteer-2025'

const yiTongMap: Record<string, number> = {
  正定中学: 560,
  石家庄实验中学: 555,
  石家庄第二实验中学: 550,
  辛集中学: 545,
  新乐一中: 725,
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

describe('分配生：分配线缺失不丢校 + 级联为单一数据源', () => {
  it('新乐一中(名额131,无分配线) 31名/732分：分配线=一统线下50=675，应被推荐', () => {
    const bands = getAllocationBands('新开路中学', 31, 732, 460, lineLookup)
    const xinle = bands.find(b => b.highSchoolName === '新乐一中')

    expect(xinle).toBeDefined()
    expect(xinle!.lineSource).toBe('yiTong_est')
    expect(xinle!.effectiveLine).toBe(675)
    expect(['推荐', '保底']).toContain(xinle!.tag)
  })

  it('650分（高于控制线460但低于675）应判分数不足，不再被误判为机会', () => {
    const bands = getAllocationBands('新开路中学', 31, 650, 460, lineLookup)
    const xinle = bands.find(b => b.highSchoolName === '新乐一中')!

    expect(xinle.tag).toBe('分数不足')
  })

  it('getScoreTag 对该档位返回「分配生机会」（左侧列表与右侧一致）', () => {
    const bands = getAllocationBands('新开路中学', 31, 732, 460, lineLookup)
    const xinle = bands.find(b => b.highSchoolName === '新乐一中')!

    expect(getScoreTag(732, 460, xinle)).toBe('分配生机会')
  })

  it('分数低于控制线仍判分数不足', () => {
    const bands = getAllocationBands('新开路中学', 31, 400, 460, lineLookup)

    expect(bands.find(b => b.highSchoolName === '新乐一中')!.tag).toBe('分数不足')
  })

  it('无级联档位时按统招分差走梯度', () => {
    expect(getScoreTag(700, 600, null)).toBe('保底')
    expect(getScoreTag(610, 600, null)).toBe('冲刺')
  })
})

describe('位次法 getRankTag', () => {
  it('考生位次远优于录取位次 → 保底', () => {
    expect(getRankTag(5000, 7000)).toBe('保底')
  })

  it('考生位次略低于录取位次 → 冲刺/差距', () => {
    expect(['冲刺', '差距较大']).toContain(getRankTag(7700, 7000))
  })
})
