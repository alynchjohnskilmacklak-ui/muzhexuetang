import { describe, expect, it } from 'vitest'
import { parseCombinedFeedbackInput } from './combined-input'

describe('parseCombinedFeedbackInput', () => {
  it('splits explicitly labelled teacher text', () => {
    expect(parseCombinedFeedbackInput(`
      本节课学习内容：一元一次方程移项法则及例题2—4。
      孩子掌握情况：基础方法已经掌握，计算准确率需要提高。
      课堂反馈：听讲认真，能够主动回答问题。
    `)).toEqual({
      lessonContent: '一元一次方程移项法则及例题2—4。',
      mastery: '基础方法已经掌握，计算准确率需要提高。',
      feedback: '听讲认真，能够主动回答问题。',
    })
  })

  it('recognizes common legacy headings', () => {
    expect(parseCombinedFeedbackInput('授课内容：复习全等三角形。\n知识掌握：概念理解较好。\n评语：课堂积极。')).toEqual({
      lessonContent: '复习全等三角形。',
      mastery: '概念理解较好。',
      feedback: '课堂积极。',
    })
  })

  it('classifies unlabelled pasted sentences without duplicating them', () => {
    const result = parseCombinedFeedbackInput('讲解一次函数图像。公式掌握较好。课堂听讲认真。')
    expect(result.lessonContent).toBe('讲解一次函数图像。')
    expect(result.mastery).toBe('公式掌握较好。')
    expect(result.feedback).toBe('课堂听讲认真。')
  })

  it('keeps a single legacy sentence publishable as lesson content', () => {
    expect(parseCombinedFeedbackInput('复习了二次根式的化简方法。')).toEqual({
      lessonContent: '复习了二次根式的化简方法。',
      mastery: '',
      feedback: '',
    })
  })

  it('understands natural teacher text without complete punctuation', () => {
    expect(parseCombinedFeedbackInput(
      '今天学的是一元二次方程的根与系数的解\n马紫晨同学上课认真听讲，能够很好地完成习题讲授的是九年级上册二次方程',
    )).toEqual({
      lessonContent: '今天学的是一元二次方程的根与系数的解\n讲授的是九年级上册二次方程',
      mastery: '能够很好地完成习题',
      feedback: '马紫晨同学上课认真听讲，',
    })
  })

  it('splits learning, mastery and classroom performance from one line', () => {
    const result = parseCombinedFeedbackInput('本节讲解二次函数图像，孩子能够完成基础练习，上课专注并积极回答问题')
    expect(result.lessonContent).toContain('本节讲解二次函数图像')
    expect(result.mastery).toContain('能够完成基础练习')
    expect(result.feedback).toContain('上课专注并积极回答问题')
  })
})
