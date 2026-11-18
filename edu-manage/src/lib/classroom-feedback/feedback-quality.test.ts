import { describe, expect, it } from 'vitest'
import { getKnowledgePointOptions } from './subject-knowledge-points'
import { findKnowledgeTopicMismatch, isGroupNarrativeSentence } from './feedback-quality'

describe('classroom feedback quality guards', () => {
  it('flags an explicit lesson topic that conflicts with the generated card topic', () => {
    const juniorMathTopics = getKnowledgePointOptions('数学', '初一')
    expect(findKnowledgeTopicMismatch(
      '今天学习代数式，并练习用字母表示数量关系。',
      '一元一次方程',
      juniorMathTopics,
    )).toEqual({ lessonTopic: '代数式', generatedTopic: '一元一次方程' })
  })

  it('does not flag matching topics, related catalogue labels, or ambiguous multi-topic notes', () => {
    const topics = ['代数式', '代数式的值', '一元一次方程']
    expect(findKnowledgeTopicMismatch('今天学习代数式。', '代数式的值', topics)).toBeNull()
    expect(findKnowledgeTopicMismatch('今天学习代数式。', '代数式', topics)).toBeNull()
    expect(findKnowledgeTopicMismatch('今天复习代数式，并预习一元一次方程。', '一元一次方程', topics)).toBeNull()
  })

  it('recognizes singular-student phrasing and collective narration separately', () => {
    expect(isGroupNarrativeSentence('孩子们完成了讨论。')).toBe(true)
    expect(isGroupNarrativeSentence('有的孩子发言积极，还有的孩子需要提醒。')).toBe(true)
    expect(isGroupNarrativeSentence('马子墨独立列出了代数式。')).toBe(false)
  })
})
