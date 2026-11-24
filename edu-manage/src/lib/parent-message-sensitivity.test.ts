import { describe, expect, it } from 'vitest'
import {
  detectSensitiveKeywords,
  getMessageSensitivity,
  sortMessagesWithSensitivity,
} from './parent-message-sensitivity'

describe('parent-message-sensitivity', () => {
  it('detects sensitive keywords in parent texts', () => {
    expect(detectSensitiveKeywords('老师，孩子说数学完全听不懂，跟不上了')).toEqual(['听不懂', '跟不上'])
    expect(detectSensitiveKeywords('我想了解一下退费怎么处理')).toEqual(['退费'])
    expect(detectSensitiveKeywords('可以换个老师吗，感觉态度差')).toEqual(['换个老师', '态度差'])
    expect(detectSensitiveKeywords('今天作业写完了，谢谢老师')).toEqual([])
  })

  it('determines message sensitivity from title and parent replies', () => {
    const sensitiveMsg = {
      title: '关于上周课程',
      replies: [
        { role: 'parent', content: '上周的物理太难了，孩子完全学不会' },
        { role: 'teacher', content: '收到，我们会加强答疑' },
      ],
    }
    const res1 = getMessageSensitivity(sensitiveMsg)
    expect(res1.isSensitive).toBe(true)
    expect(res1.matchedKeywords).toContain('学不会')

    const normalMsg = {
      title: '请问明天几点上课',
      replies: [{ role: 'parent', content: '收到，准时到校' }],
    }
    const res2 = getMessageSensitivity(normalMsg)
    expect(res2.isSensitive).toBe(false)
  })

  it('places sensitive messages first in sortMessagesWithSensitivity', () => {
    const msgs = [
      {
        id: '1',
        title: '平时请假咨询',
        updatedAt: '2026-11-19T10:00:00.000Z',
        replies: [{ role: 'parent', content: '老师明天请个假' }],
      },
      {
        id: '2',
        title: '孩子想退费',
        updatedAt: '2026-11-18T10:00:00.000Z',
        replies: [{ role: 'parent', content: '孩子跟不上了，想退费' }],
      },
      {
        id: '3',
        title: '关于期中考试',
        updatedAt: '2026-11-19T12:00:00.000Z',
        replies: [{ role: 'parent', content: '期中考得还行' }],
      },
    ]

    const sorted = sortMessagesWithSensitivity(msgs)
    // id: '2' 包含敏感词，必须置顶排第 1，即使更新时间较早
    expect(sorted[0].id).toBe('2')
    // 其余非敏感按更新时间排序：'3' > '1'
    expect(sorted[1].id).toBe('3')
    expect(sorted[2].id).toBe('1')
  })
})
