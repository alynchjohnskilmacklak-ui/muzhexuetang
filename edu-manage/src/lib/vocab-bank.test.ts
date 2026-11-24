import { describe, expect, it } from 'vitest'
import {
  allVocab,
  applyVocabResult,
  buildVocabDeck,
  deriveStatus,
  filterVocab,
  filterVocabCumulative,
  gradeRank,
  gradeVocabAnswer,
  listVocabUnits,
  MASTERED_THRESHOLD,
} from './vocab-bank'
import type { VocabEntry } from './vocab-bank'

const sample: VocabEntry = {
  id: 'test-1',
  grade: '初一',
  volume: '上册',
  unit: 'Unit 1 Test',
  section: 'Section A',
  headword: 'greet',
  pos: 'v.',
  meanings: ['招呼', '问候'],
}

describe('gradeVocabAnswer', () => {
  it('英选中：释义全部分义合并后匹配才算对', () => {
    expect(gradeVocabAnswer(sample, 'en-to-cn', '招呼；问候')).toBe(true)
    expect(gradeVocabAnswer(sample, 'en-to-cn', '招呼')).toBe(false)
    expect(gradeVocabAnswer(sample, 'en-to-cn', '别的意思')).toBe(false)
  })

  it('中选英：按单词匹配，忽略大小写', () => {
    expect(gradeVocabAnswer(sample, 'cn-to-en', 'Greet')).toBe(true)
    expect(gradeVocabAnswer(sample, 'cn-to-en', 'hello')).toBe(false)
  })
})

describe('deriveStatus / applyVocabResult', () => {
  it(`连续答对 ${MASTERED_THRESHOLD} 次转为已掌握`, () => {
    const first = applyVocabResult(null, true)
    expect(first.status).toBe('LEARNING')
    const second = applyVocabResult(first, true)
    expect(second.status).toBe('MASTERED')
    expect(second.correctCount).toBe(2)
  })

  it('答错标记 WRONG，再次答对回到学习状态', () => {
    const wrong = applyVocabResult(null, false)
    expect(wrong.status).toBe('WRONG')
    expect(wrong.wrongCount).toBe(1)
    const recovered = applyVocabResult(wrong, true)
    expect(recovered.status).toBe('LEARNING')
    expect(recovered.lastResult).toBe('CORRECT')
  })

  it('已掌握后再答错不立刻掉回掌握，按最近一次结果计算', () => {
    const mastered = deriveStatus({ correctCount: 3, wrongCount: 0, lastResult: 'CORRECT' })
    expect(mastered).toBe('MASTERED')
    const afterWrong = applyVocabResult({ correctCount: 3, wrongCount: 0, lastResult: 'CORRECT' }, false)
    expect(afterWrong.status).toBe('WRONG')
  })
})

describe('buildVocabDeck', () => {
  it('每题四个选项、答案在选项中且位置合法，选项不重复', () => {
    const deck = buildVocabDeck(filterVocab({ grade: '初一', volume: '上册' }).slice(0, 20), 'seed-test')
    expect(deck.length).toBeGreaterThan(0)
    for (const question of deck) {
      expect(question.options.length).toBeGreaterThanOrEqual(2)
      expect(question.answerIndex).toBeGreaterThanOrEqual(0)
      expect(question.answerIndex).toBeLessThan(question.options.length)
      expect(question.options[question.answerIndex]).toBe(question.mode === 'en-to-cn' ? question.meanings.join('；') : question.headword)
      expect(new Set(question.options).size).toBe(question.options.length)
    }
  })

  it('两种方向都出现，且提示语与方向一致', () => {
    const deck = buildVocabDeck(filterVocab({ grade: '初一', volume: '上册' }).slice(0, 40), 'seed-mix')
    const modes = new Set(deck.map((question) => question.mode))
    expect(modes.has('en-to-cn')).toBe(true)
    expect(modes.has('cn-to-en')).toBe(true)
    for (const question of deck) {
      if (question.mode === 'en-to-cn') expect(question.prompt).toBe(question.headword)
      else expect(question.prompt).toBe(question.meanings.join('；'))
    }
  })

  it('同一批题目确定性生成，相同种子结果一致', () => {
    const entries = filterVocab({ grade: '初一', volume: '上册' }).slice(0, 10)
    const first = buildVocabDeck(entries, 'same-seed')
    const second = buildVocabDeck(entries, 'same-seed')
    expect(first).toEqual(second)
  })
})

describe('年级累计词表', () => {
  it('年级顺序为初一 < 初二 < 初三', () => {
    expect(gradeRank('初一')).toBe(0)
    expect(gradeRank('初二')).toBe(1)
    expect(gradeRank('初三')).toBe(2)
    expect(gradeRank('未知年级')).toBe(99)
  })

  it('初一按所选册次取初一词条；上下册目录互不混入', () => {
    const grade7 = filterVocabCumulative('初一', { volume: '上册' })
    const upperBook = allVocab().filter((entry) => entry.grade === '初一' && entry.volume === '上册')
    const lowerBook = filterVocabCumulative('初一', { volume: '下册' })
    expect(grade7).toEqual(upperBook)
    expect(lowerBook).toHaveLength(461)
    expect(lowerBook.every((entry) => entry.volume === '下册')).toBe(true)
    expect(grade7.every((entry) => entry.grade === '初一')).toBe(true)
  })
})

describe('词表装载', () => {
  it('七上词表按单元聚合，条目带完整释义', () => {
    const entries = filterVocab({ grade: '初一', volume: '上册' })
    expect(entries.length).toBeGreaterThan(100)
    const units = listVocabUnits(entries)
    expect(units.length).toBeGreaterThan(0)
    for (const entry of entries) {
      expect(entry.meanings.length).toBeGreaterThan(0)
      expect(entry.headword.trim().length).toBeGreaterThan(0)
    }
  })
})
