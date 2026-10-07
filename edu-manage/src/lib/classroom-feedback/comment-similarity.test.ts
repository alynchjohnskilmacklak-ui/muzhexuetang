import { describe, expect, it } from 'vitest'
import { findSimilarComments, textSimilarity } from './comment-similarity'

describe('feedback comment similarity', () => {
  it('detects copied comments', () => {
    expect(textSimilarity('课堂表现认真，知识掌握扎实。', '课堂表现认真，知识掌握扎实。')).toBe(1)
    expect(findSimilarComments([
      { studentId: 'a', comment: '课堂表现认真，知识掌握扎实。' },
      { studentId: 'b', comment: '课堂表现认真，知识掌握扎实。' },
    ])).toHaveLength(1)
  })

  it('does not warn for meaningfully different comments', () => {
    expect(findSimilarComments([
      { studentId: 'a', comment: '运算步骤规范，能够主动检查结果。' },
      { studentId: 'b', comment: '英语朗读声音清晰，需要继续积累词汇。' },
    ])).toEqual([])
  })
})
