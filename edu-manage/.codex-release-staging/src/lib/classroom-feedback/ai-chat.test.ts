import { describe, expect, it } from 'vitest'
import { anonymizeText, buildChatSystemPrompt, parsePerStudentArticles, resolveAIProvider } from './ai-chat'

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

describe('AI feedback chat parser', () => {
  it('maps anonymous keys back to student ids and keeps unverified cards unverified', () => {
    const response = JSON.stringify({ topic: card.topic, intro: '移项时需注意符号变化。', card, articles: [
      { key: 'S1', article: article('S1', '完成了移项练习') },
      { key: 'S2', article: article('S2', '本次尚未记录具体课堂表现') },
    ] })
    const result = parsePerStudentArticles(response, students, context)
    expect(result.ok).toHaveLength(2)
    expect(result.ok[0]).toMatchObject({ studentId: 'a' })
    expect(result.ok[0].article).toContain('张三同学')
    expect(result.ok[0].article).not.toContain('李四')
    expect(result.failed).toHaveLength(0)
    expect(result.card?.verified).toBe(false)
  })

  it('allows partial failure: one missing student never blocks the other', () => {
    const response = JSON.stringify({ topic: card.topic, card, articles: [
      { key: 'S1', article: article('S1', '完成了移项练习') },
      // S2 缺失
    ] })
    const result = parsePerStudentArticles(response, students, context)
    expect(result.ok).toHaveLength(1)
    expect(result.ok[0].studentId).toBe('a')
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0].studentId).toBe('b')
    expect(result.failed[0].error).toContain('内容为空')
  })

  it('rewrites another student marker to XX同学 instead of blocking the body', () => {
    const response = JSON.stringify({ topic: card.topic, card, articles: [
      { key: 'S1', article: article('S1', '看到S2完成了练习') },
      { key: 'S2', article: article('S2', '本次尚未记录具体课堂表现') },
    ] })
    const result = parsePerStudentArticles(response, students, context)
    expect(result.ok).toHaveLength(2)
    expect(result.ok[0].article).toContain('XX同学')
    expect(result.ok[0].article).not.toContain('S2')
    expect(result.failed).toHaveLength(0)
  })

  it('is lenient about performance wording when teacher lesson note exists (no hard rejection)', () => {
    const response = JSON.stringify({ topic: card.topic, card, articles: [
      { key: 'S1', article: article('S1', '完成了移项练习') },
      { key: 'S2', article: article('S2', '积极回答并已经完全掌握') },
    ] })
    const result = parsePerStudentArticles(response, students, context)
    // 宽松策略：反馈内容只要不混入他人、不含极端禁词，就允许填入，老师可继续编辑
    expect(result.ok).toHaveLength(2)
    expect(result.failed).toHaveLength(0)
  })

  it('rewrites 孩子同学 to the student name and adds the real name to 孩子 mentions', () => {
    const response = JSON.stringify({ topic: card.topic, card, articles: [
      { key: 'S1', article: article('S1', '孩子同学完成了移项练习，孩子很认真') },
      { key: 'S2', article: article('S2', '本次尚未记录具体课堂表现') },
    ] })
    const result = parsePerStudentArticles(response, students, context)
    expect(result.ok).toHaveLength(2)
    expect(result.ok[0].article).toContain('张三同学完成了移项练习，张三同学很认真')
    expect(result.ok[0].article).not.toContain('孩子')
    expect(result.failed).toHaveLength(0)
  })

  it('accepts teacher wording 这位同学 echoed back by the model and rewrites it to the student name', () => {
    const response = JSON.stringify({ topic: card.topic, card, articles: [
      { key: 'S1', article: article('S1', '完成了移项练习') + '这位同学步骤清楚。' },
      { key: 'S2', article: article('S2', '本次尚未记录具体课堂表现') },
    ] })
    const result = parsePerStudentArticles(response, students, context)
    expect(result.ok).toHaveLength(2)
    expect(result.ok[0].article).toContain('张三同学')
    expect(result.ok[0].article).not.toContain('这位同学')
    expect(result.failed).toHaveLength(0)
  })

  it('anonymizes real names before sending to the model', () => {
    expect(anonymizeText('张三今天练了移项，李四也练了', students)).toBe('S1今天练了移项，S2也练了')
  })

  it('followup prompt restricts edits to targeted students only', () => {
    const system = buildChatSystemPrompt({
      mode: 'followup',
      subject: '数学',
      grade: '初一',
      edition: '冀教版',
      lessonNote: '把张三同学的反馈写简短些',
      students: [{ key: 'S1', level: 'GREAT', observation: '计算快' }],
      targetKeys: ['S1'],
    })
    expect(system).toContain('[S1]')
    expect(system).toContain('只修改')
  })

  it('resolves provider from env without leaking key values', () => {
    const previous = {
      ARK: process.env.ARK_API_KEY,
      DOUBAO: process.env.DOUBAO_API_KEY,
      DEEPSEEK: process.env.DEEPSEEK_API_KEY,
      KIMI: process.env.KIMI_API_KEY,
    }
    process.env.ARK_API_KEY = ''
    process.env.DOUBAO_API_KEY = ''
    process.env.DEEPSEEK_API_KEY = 'sk-test-deepseek-value'
    process.env.KIMI_API_KEY = ''
    expect(resolveAIProvider()).toBe('deepseek')
    Object.entries(previous).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key as string]
      else process.env[key as string] = value
    })
  })

  it('drops group-reference and guess-tone sentences in the shared (GROUP) parser', () => {
    const response = JSON.stringify({
      topic: '内能的利用', card, articles: [
        {
          key: 'S1',
          article: '这节课围绕内能的利用展开，核心是热机把内能转化为机械能。'
            + '从课堂整体情况看，有同学听讲认真，也有同学能主动举手发言，还有同学上课容易走神。S1同学听讲认真，能跟上课堂节奏。'
            + '结合该生积极发言、偶有粗心、需要多鼓励的特点，可以判断其对内能的利用已基本掌握。'
            + '建议课后先回顾热值、Q放=mq和热机效率的公式含义，再练习几道计算题。',
        },
      ],
    })
    const result = parsePerStudentArticles(response, [{ id: 'a', name: '马子墨', observation: '积极发言' }], context)
    expect(result.ok).toHaveLength(1)
    expect(result.ok[0].article).toContain('马子墨同学')
    expect(result.ok[0].article).not.toContain('有同学')
    expect(result.ok[0].article).not.toContain('也有同学')
    expect(result.ok[0].article).not.toContain('还有同学')
    expect(result.ok[0].article).not.toContain('结合该生')
    expect(result.ok[0].article).not.toContain('可以判断')
    expect(result.ok[0].article).toContain('Q放=mq')
    expect(result.ok[0].article).toContain('建议课后')
  })
})