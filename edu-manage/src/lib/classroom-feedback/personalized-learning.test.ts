import { describe, expect, it } from 'vitest'
import {
  buildPersonalizedLearningFallback,
  getTeacherSupportTags,
  normalizePersonalizedLearningExtension,
} from './personalized-learning'

describe('personalized classroom feedback add-ons', () => {
  it('normalizes a generated extension and removes internal generation wording', () => {
    expect(normalizePersonalizedLearningExtension({
      focus: '重点练习圆的概念',
      practiceTask: 'AI生成：做一道练习',
      parentPrompt: '你能说说圆心和半径吗？',
    })).toMatchObject({
      focus: '重点练习圆的概念',
      practiceTask: '',
      parentPrompt: '你能说说圆心和半径吗？',
    })
  })

  it('builds legacy additions from existing topic and attention evidence', () => {
    const result = buildPersonalizedLearningFallback({
      topic: '圆的概念',
      mastery: '基本掌握',
      tags: ['粗心出错'],
      nextLessonFocus: '检查练习订正情况',
    })
    expect(result?.focus).toBe('粗心出错')
    expect(result?.practiceTask).toContain('读清条件')
    expect(result?.nextLessonFollowup).toContain('检查练习订正情况')
  })

  it('keeps only supported classroom intervention tags', () => {
    expect(getTeacherSupportTags(['分步提示引导', '自定义标签', '错题当堂订正']))
      .toEqual(['分步提示引导', '错题当堂订正'])
  })
})
