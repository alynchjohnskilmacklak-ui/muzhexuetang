import { describe, expect, it } from 'vitest'
import { getKnowledgePointOptions } from './subject-knowledge-points'

describe('subject knowledge point catalogue', () => {
  it.each([
    ['初一', '语文', 132], ['初一', '数学', 59], ['初一', '英语', 129], ['初一', '生物', 30],
    ['初二', '语文', 83], ['初二', '数学', 29], ['初二', '英语', 47], ['初二', '物理', 31], ['初二', '生物', 47],
    ['初三', '数学', 56], ['初三', '英语', 30], ['初三', '物理', 222], ['初三', '化学', 101],
    ['高一', '数学', 130], ['高一', '英语', 16], ['高一', '化学', 67], ['高一', '物理', 68],
  ])('%s %s contains %i entries', (grade, subject, expected) => {
    expect(getKnowledgePointOptions(subject, grade)).toHaveLength(expected)
  })
})
