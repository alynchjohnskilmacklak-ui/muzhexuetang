import { describe, expect, it } from 'vitest'
import { filterVocab, listVocabUnits } from '@/lib/vocab-bank'

describe('八年级下册教材词表', () => {
  const entries = filterVocab({ grade: '初二', volume: '下册' })

  it('收录八个单元以及词表索引第 113–124 页的全部词条', () => {
    expect(entries).toHaveLength(603)
    expect(entries.every((entry) => entry.grade === '初二' && entry.volume === '下册')).toBe(true)
    expect(entries.every((entry) => entry.sourcePage !== undefined && entry.sourcePage >= 113 && entry.sourcePage <= 124)).toBe(true)

    const expectedUnits = Array.from({ length: 8 }, (_, index) => `Unit ${index + 1}`)
    expect(listVocabUnits(entries).map((unit) => unit.unit)).toEqual(expectedUnits)
    expect(new Set(entries.map((entry) => entry.sourcePage))).toEqual(
      new Set(Array.from({ length: 12 }, (_, index) => index + 113)),
    )
    expect(Object.fromEntries(entries.reduce((counts, entry) => {
      counts.set(entry.unit, (counts.get(entry.unit) ?? 0) + 1)
      return counts
    }, new Map<string, number>()))).toEqual({
      'Unit 1': 59,
      'Unit 2': 87,
      'Unit 3': 81,
      'Unit 4': 82,
      'Unit 5': 73,
      'Unit 6': 72,
      'Unit 7': 89,
      'Unit 8': 60,
    })
    expect(Object.fromEntries(entries.reduce((counts, entry) => {
      const page = entry.sourcePage!
      counts.set(page, (counts.get(page) ?? 0) + 1)
      return counts
    }, new Map<number, number>()))).toEqual({
      113: 49, 114: 58, 115: 52, 116: 59, 117: 48, 118: 49,
      119: 49, 120: 50, 121: 52, 122: 46, 123: 40, 124: 51,
    })
  })

  it('覆盖每单元词头、词组和专有名词，且词条字段完整', () => {
    const wordsByUnit = new Map(entries.map((entry) => [`${entry.unit}:${entry.headword.toLocaleLowerCase('en-US')}`, entry]))
    for (const identity of [
      'Unit 1:calligraphy', 'Unit 1:kung fu',
      'Unit 1:mogao caves', 'Unit 2:ourselves',
      'Unit 3:deal with', 'Unit 3:thompson',
      'Unit 4:wonder', 'Unit 4:mount qomolangma',
      'Unit 5:drought', 'Unit 5:japan',
      'Unit 6:shake', 'Unit 6:türkiye',
      'Unit 7:steal', 'Unit 7:journey to the west',
      'Unit 8:make a difference', 'Unit 8:blue sky rescue',
    ]) {
      expect(wordsByUnit.has(identity), identity).toBe(true)
    }

    const identities = entries.map((entry) => `${entry.unit}\u001f${entry.headword.trim().toLocaleLowerCase('en-US')}`)
    expect(new Set(identities).size).toBe(entries.length)
    for (const entry of entries) {
      expect(entry.id).toMatch(/^g8b-/)
      expect(entry.pos.trim().length).toBeGreaterThan(0)
      expect(entry.meanings.length).toBeGreaterThan(0)
      expect(entry.meanings.every((meaning) => meaning.trim().length > 0)).toBe(true)
      expect(entry.bookPage).toBeTypeOf('number')
    }
    expect(entries.filter((entry) => entry.pos === '专有名词' && entry.phrase)).toHaveLength(0)
  })
})
