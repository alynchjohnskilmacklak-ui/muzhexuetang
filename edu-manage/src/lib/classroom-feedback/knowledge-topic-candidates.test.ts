import { describe, expect, it } from 'vitest'
import { getRelevantKnowledgePointCandidates, selectRelevantKnowledgePointCandidates } from './knowledge-topic-candidates'

describe('knowledge point candidate selection', () => {
  it.each([
    ['数学', '初一', '今天复习一元一次方程，并练习移项和检验。', '一元一次方程'],
    ['语文', '初一', '本节精读《济南的冬天》，分析景物描写。', '济南的冬天'],
    ['英语', '初二', '今天复习一般过去时的规则动词和不规则动词。', '一般过去时的规则动词和不规则动词'],
    ['生物', '初二', '本节学习生物进化的原因和自然选择。', '生物进化的原因'],
    ['化学', '初三', '讲解二氧化碳的性质，并比较二氧化碳和一氧化碳。', '二氧化碳的性质'],
    ['物理', '初三', '归纳串、并联电路中电流、电压、电阻关系的总结。', '串、并联电路中电流、电压、电阻关系的总结'],
    ['数学', '高一', '练习一元二次不等式的解法，重点是画数轴。', '一元二次不等式的解法'],
    ['英语', '高一', '复习单一主语的主谓一致。', '单一主语的主谓一致'],
    ['化学', '高一', '演示一定物质的量浓度溶液的配制。', '一定物质的量浓度溶液的配制'],
    ['物理', '高一', '讲解平均速度与位移的区别。', '平均速度'],
  ])('finds the matching catalog topic for %s / %s', (subject, grade, lessonNote, expectedTopic) => {
    expect(getRelevantKnowledgePointCandidates(subject, grade, lessonNote)).toContain(expectedTopic)
  })

  it('prioritizes the chapter topic mentioned in the lesson and filters exercise stems', () => {
    const selected = selectRelevantKnowledgePointCandidates([
      '一元二次不等式在实数集上的恒成立',
      '简答题',
      '请结合材料分析作者这样写的原因？',
      '一元二次不等式的解法',
      '配方法',
    ], '本课学习一元二次不等式的解法，先求根再画数轴表示解集。')

    expect(selected[0]).toBe('一元二次不等式的解法')
    expect(selected).not.toContain('简答题')
    expect(selected).not.toContain('请结合材料分析作者这样写的原因？')
  })

  it('does not fall back to an arbitrary first page of topics when no lesson is supplied', () => {
    expect(selectRelevantKnowledgePointCandidates(['一次函数', '二次函数'], '')).toEqual([])
  })

  it('uses the selected textbook chapter as matching context when the lesson note is broad', () => {
    const selected = getRelevantKnowledgePointCandidates(
      '数学',
      '初一',
      '本课进行课本内容讲解。',
      ['七年级上册 · 有理数'],
    )

    expect(selected).toContain('有理数')
  })
})
