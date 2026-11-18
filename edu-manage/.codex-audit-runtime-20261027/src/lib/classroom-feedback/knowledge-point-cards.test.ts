import { describe, expect, it } from 'vitest'
import { hasCompleteKnowledgePointCard, parseGeneratedKnowledgeCard } from './knowledge-point-cards'

const context = { edition: '冀教版', grade: '初三', subject: '物理' }
const completeCard = {
  topic: '串联和并联电路',
  definition: '串联电路中各元件首尾相连，电流只有一条路径；并联电路中各元件并列连接，电流有多条路径。',
  formulas: ['串联电流处处相等', '并联干路电流等于各支路电流之和'],
  example: {
    question: '两个灯泡接入电路后，闭合开关时只有一个灯泡发光，如何判断连接方式？',
    steps: ['检查两个灯泡是否互相影响', '判断电流是否只有一条路径', '结合开关位置分析支路关系'],
    answer: '若两个灯泡互相影响且电流只有一条路径，则为串联。',
  },
  tips: ['用电流路径判断串并联', '分析开关时先标出各支路'],
}

describe('knowledge point card completeness', () => {
  it('accepts a full generated chapter explanation', () => {
    const card = parseGeneratedKnowledgeCard(completeCard, context)
    expect(hasCompleteKnowledgePointCard(card)).toBe(true)
  })

  it('rejects a topic-only or shortened card so the API can retry it', () => {
    const partial = parseGeneratedKnowledgeCard({
      topic: '串联和并联电路',
      definition: '串联和并联的电流路径不同。',
      formulas: [],
    }, context)
    expect(hasCompleteKnowledgePointCard(partial)).toBe(false)
    expect(hasCompleteKnowledgePointCard(null)).toBe(false)
  })
})
