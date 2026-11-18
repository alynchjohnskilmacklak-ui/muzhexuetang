import { describe, expect, it } from 'vitest'
import { getParentFeedbackSections } from './parent-feedback-content'
import { parseStoredKnowledgeCard } from './knowledge-point-cards'

describe('parent feedback content', () => {
  it('shows a three-section article without duplicating raw lesson notes', () => {
    const sections = getParentFeedbackSections({
      lessonContent: '老师原始关键词',
      overallComment: '本节课学习内容：\n学习移项。\n课堂反馈：\n张三同学完成练习。\n孩子掌握情况：\n根据练习记录，已能处理基础题。',
      summary: '旧摘要',
    })
    expect(sections.map((section) => section.label)).toEqual(['本节课学习内容', '课堂反馈', '孩子掌握情况'])
    expect(sections[0].content).toBe('学习移项。')
  })

  it('does not trust a model-supplied verified flag or source', () => {
    const card = parseStoredKnowledgeCard({
      edition: '人教版', grade: '初一', subject: '地理', topic: '经纬网',
      definition: '用经线和纬线确定位置。', formulas: [],
      verified: true, source: '模型自称教材原文',
    })
    expect(card?.verified).toBe(false)
    expect(card?.source).toBeUndefined()
  })
})
