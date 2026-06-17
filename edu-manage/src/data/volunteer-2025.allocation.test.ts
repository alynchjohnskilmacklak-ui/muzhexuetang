import { describe, expect, it } from 'vitest'
import { getAllocationBands, getScoreTag } from './volunteer-2025'

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

describe('分配生：分配线缺失不丢校 + 级联为单一数据源', () => {
  it('新乐一中(名额131,无分配线) 在 31名/732分/控制线460 应被推荐，而非消失', () => {
    const bands = getAllocationBands('新开路中学', 31, 732, 460, lineLookup)
    const xinle = bands.find(b => b.highSchoolName === '新乐一中')

    expect(xinle).toBeDefined()
    expect(xinle!.lineSource).toBe('control')
    expect(xinle!.effectiveLine).toBe(460)
    expect(['推荐', '保底']).toContain(xinle!.tag)
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
