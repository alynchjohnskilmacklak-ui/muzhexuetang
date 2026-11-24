import { describe, expect, it } from 'vitest'
import { filterVocab, listVocabUnits } from '@/lib/vocab-bank'

describe('八年级上册教材词表', () => {
  const entries = filterVocab({ grade: '初二', volume: '上册' })

  it('收录八个单元以及词表索引第 111–122 页的内容', () => {
    expect(entries).toHaveLength(549)
    expect(entries.every((entry) => entry.grade === '初二' && entry.volume === '上册')).toBe(true)
    expect(entries.every((entry) => entry.sourcePage !== undefined && entry.sourcePage >= 111 && entry.sourcePage <= 122)).toBe(true)

    const countBy = (key: 'unit' | 'sourcePage') => entries.reduce<Record<string, number>>((result, entry) => {
      const value = entry[key]
      if (value !== undefined) result[String(value)] = (result[String(value)] ?? 0) + 1
      return result
    }, {})
    expect(countBy('unit')).toEqual({
      'Unit 1': 76,
      'Unit 2': 62,
      'Unit 3': 74,
      'Unit 4': 70,
      'Unit 5': 68,
      'Unit 6': 59,
      'Unit 7': 69,
      'Unit 8': 71,
    })
    expect(countBy('sourcePage')).toEqual({
      111: 41, 112: 51, 113: 50, 114: 50, 115: 54, 116: 51,
      117: 51, 118: 47, 119: 43, 120: 47, 121: 47, 122: 17,
    })

    const expectedUnits = Array.from({ length: 8 }, (_, index) => `Unit ${index + 1}`)
    expect(listVocabUnits(entries).map((unit) => unit.unit)).toEqual(expectedUnits)
    expect(new Set(entries.map((entry) => entry.sourcePage))).toEqual(
      new Set(Array.from({ length: 12 }, (_, index) => index + 111)),
    )
  })

  it('保留每个单元的教材词头、短语和专有名词', () => {
    const wordsByUnit = new Map(entries.map((entry) => [`${entry.unit}:${entry.headword.toLocaleLowerCase('en-US')}`, entry]))
    for (const identity of [
      'Unit 1:landscape', 'Unit 1:seattle',
      'Unit 2:treasure hunt', 'Unit 2:paper-cut',
      'Unit 3:hard-working', 'Unit 3:mark twain',
      'Unit 4:take a walk', 'Unit 4:the arctic ocean',
      'Unit 5:mashed potatoes', 'Unit 5:guoqiao rice noodles',
      'Unit 6:keep on doing sth', 'Unit 6:ai',
      'Unit 7:outer space', 'Unit 7:asimov',
      'Unit 8:face to face', 'Unit 8:jones',
    ]) {
      expect(wordsByUnit.has(identity), identity).toBe(true)
    }
  })

  it('词条字段完整，单元内词头不重复', () => {
    const identities = entries.map((entry) => `${entry.unit}\u001f${entry.headword.trim().toLocaleLowerCase('en-US')}`)
    expect(new Set(identities).size).toBe(entries.length)
    for (const entry of entries) {
      expect(entry.id).toMatch(/^g8a-/)
      expect(entry.pos.trim().length).toBeGreaterThan(0)
      expect(entry.meanings.length).toBeGreaterThan(0)
      expect(entry.meanings.every((meaning) => meaning.trim().length > 0)).toBe(true)
      expect(entry.bookPage).toBeTypeOf('number')
    }
  })
})
