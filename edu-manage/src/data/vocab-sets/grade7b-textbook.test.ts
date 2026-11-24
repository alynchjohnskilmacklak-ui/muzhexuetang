import { describe, expect, it } from 'vitest'
import { GRADE7B_TEXTBOOK_VOCAB } from './grade7b-textbook'

describe('人教版七年级下册教材词表', () => {
  it('覆盖 Unit 1–8 和词表印刷页 97–105', () => {
    expect(new Set(GRADE7B_TEXTBOOK_VOCAB.map((entry) => entry.unit))).toEqual(
      new Set(Array.from({ length: 8 }, (_, index) => `Unit ${index + 1}`)),
    )
    expect(new Set(GRADE7B_TEXTBOOK_VOCAB.map((entry) => entry.sourcePage))).toEqual(
      new Set(Array.from({ length: 9 }, (_, index) => 97 + index)),
    )
    expect(GRADE7B_TEXTBOOK_VOCAB.length).toBe(461)
    expect(Object.fromEntries(
      [...new Set(GRADE7B_TEXTBOOK_VOCAB.map((entry) => entry.unit))]
        .map((unit) => [unit, GRADE7B_TEXTBOOK_VOCAB.filter((entry) => entry.unit === unit).length]),
    )).toEqual({
      'Unit 1': 48,
      'Unit 2': 58,
      'Unit 3': 55,
      'Unit 4': 58,
      'Unit 5': 64,
      'Unit 6': 62,
      'Unit 7': 50,
      'Unit 8': 66,
    })
    expect(Object.fromEntries(
      [...new Set(GRADE7B_TEXTBOOK_VOCAB.map((entry) => entry.sourcePage))]
        .sort((left, right) => (left ?? 0) - (right ?? 0))
        .map((page) => [page, GRADE7B_TEXTBOOK_VOCAB.filter((entry) => entry.sourcePage === page).length]),
    )).toEqual({ 97: 52, 98: 56, 99: 53, 100: 58, 101: 64, 102: 53, 103: 59, 104: 60, 105: 6 })
  })

  it('所有词条都有年级、册次、词性和释义，且单元内没有重复词头', () => {
    const identities = new Set<string>()
    const ids = new Set<string>()

    for (const entry of GRADE7B_TEXTBOOK_VOCAB) {
      expect(entry.grade).toBe('初一')
      expect(entry.volume).toBe('下册')
      expect(entry.headword.trim()).not.toBe('')
      expect(entry.pos.trim()).not.toBe('')
      expect(entry.meanings.length).toBeGreaterThan(0)
      expect(entry.meanings.every((meaning) => meaning.trim().length > 0)).toBe(true)
      expect(entry.sourcePage).toBeGreaterThanOrEqual(97)
      expect(entry.sourcePage).toBeLessThanOrEqual(105)
      expect(entry.bookPage).toBeGreaterThanOrEqual(1)
      expect(entry.bookPage).toBeLessThanOrEqual(63)

      const identity = `${entry.unit}|${entry.headword.trim().toLocaleLowerCase('en-US')}`
      expect(identities.has(identity), identity).toBe(false)
      identities.add(identity)
      expect(ids.has(entry.id), entry.id).toBe(false)
      ids.add(entry.id)
      expect(entry.id.startsWith('g7b-'), entry.id).toBe(true)
    }
  })

  it('包含图片中容易漏掉的短语、词形、专名和末页词条', () => {
    const words = new Set(GRADE7B_TEXTBOOK_VOCAB.map((entry) => `${entry.unit}|${entry.headword.toLocaleLowerCase('en-US')}`))
    for (const key of [
      'Unit 1|take care of',
      'Unit 1|Antarctica',
      'Unit 2|absent from',
      'Unit 2|make sb’s/the bed',
      'Unit 3|hardly ever',
      'Unit 3|skateboarding',
      'Unit 4|fish and chips',
      'Unit 5|Dragon Boat Festival',
      'Unit 6|Mount Huangshan',
      'Unit 7|wastewater',
      'Unit 8|once upon a time',
      'Unit 8|succeed in doing sth',
      'Unit 8|Hans Christian Andersen',
    ]) {
      const separator = key.indexOf('|')
      const normalizedKey = `${key.slice(0, separator)}|${key.slice(separator + 1).toLocaleLowerCase('en-US')}`
      expect(words.has(normalizedKey), key).toBe(true)
    }

    const unit3 = GRADE7B_TEXTBOOK_VOCAB.filter((entry) => entry.unit === 'Unit 3')
    expect(unit3.every((entry) => typeof entry.bookPage === 'number' && entry.bookPage <= 23)).toBe(true)

    const page105 = GRADE7B_TEXTBOOK_VOCAB.filter((entry) => entry.sourcePage === 105)
    expect(page105.map((entry) => entry.headword)).toEqual([
      'anyone',
      'instead of',
      'succeed in doing sth',
      'himself',
      'in the end',
      'Hans Christian Andersen',
    ])
  })
})
