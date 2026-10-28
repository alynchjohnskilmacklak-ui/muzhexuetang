import { describe, expect, it } from 'vitest'
import { articleSections, parseAiArticleResponse } from './ai-article'
import { textbookEdition } from './textbook-editions'

const students = [
  { id: 'a', name: '张三', observation: '移项练习计算快且准确' },
  { id: 'b', name: '李四', observation: '' },
]
const context = { edition: '冀教版', grade: '初一', subject: '数学' }
const card = { topic: '一元一次方程', definition: '只含一个未知数且未知数次数为一的整式方程。', formulas: ['ax+b=0（a≠0）'], verified: true, source: '模型自称来源' }
const article = (key: string, observation: string) => [
  '本节课学习内容：',
  '这节课围绕一元一次方程的移项和检验展开。',
  '课堂反馈：',
  `${key}同学${observation}。`,
  '孩子掌握情况：',
  observation.includes('未记录') ? '目前没有足够信息判断个人掌握情况。' : '移项练习完成情况可作为本次判断依据。',
].join('\n')

describe('AI feedback article', () => {
  it('maps anonymous keys and keeps unverified cards unverified even if model claims a source', () => {
    const response = JSON.stringify({ topic: card.topic, intro: '移项时需注意符号变化。', card, articles: [
      { key: 'S1', article: article('S1', '完成了移项练习') },
      { key: 'S2', article: article('S2', '练习完成较好') },
    ] })
    const result = parseAiArticleResponse(response, students, context)
    expect(result.articles[0].article).toContain('张三同学')
    expect(result.articles[0].article).not.toContain('李四')
    expect(result.card.verified).toBe(false)
    expect(result.card.source).toBeUndefined()
    expect(articleSections(result.articles[0].article)?.length).toBe(3)
  })

  it('rejects observations from another selected student', () => {
    const response = JSON.stringify({ card, articles: [
      { key: 'S1', article: article('S1', '看到S2完成了练习') },
      { key: 'S2', article: article('S2', '练习完成较好') },
    ] })
    expect(() => parseAiArticleResponse(response, students, context)).toThrow('混入其他学生')
  })

  it('rejects evasive no-observation phrasing', () => {
    const response = JSON.stringify({ card, articles: [
      { key: 'S1', article: article('S1', '完成了移项练习') },
      { key: 'S2', article: article('S2', '本次尚未记录具体课堂表现') },
    ] })
    expect(() => parseAiArticleResponse(response, students, context)).toThrow('回避性表述')
  })

  it('maps junior geography to the user-confirmed textbook edition', () => {
    expect(textbookEdition('初一', '地理')).toBe('人教版')
    expect(textbookEdition('八年级', '地理')).toBe('人教版')
    expect(textbookEdition('初二', '生物')).toBe('冀少版')
  })
})
