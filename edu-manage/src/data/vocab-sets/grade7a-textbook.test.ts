import { describe, expect, it } from 'vitest'
import { GRADE7A_TEXTBOOK_VOCAB } from './grade7a-textbook'
import { GRADE7A_COMPLETE_VOCAB } from './index'
import { GRADE7A_VOCAB } from './grade7a'

describe('人教版七年级上册教材词表', () => {
  it('覆盖 Starter Units、Unit 1–7 和参考词表', () => {
    expect(GRADE7A_TEXTBOOK_VOCAB).toHaveLength(428)
    const counts = GRADE7A_TEXTBOOK_VOCAB.reduce<Record<string, number>>((result, entry) => {
      result[entry.unit] = (result[entry.unit] ?? 0) + 1
      return result
    }, {})
    expect(counts).toEqual({
      'Starter Unit 1 Hello!': 48,
      'Starter Unit 2 Keep Tidy!': 52,
      'Starter Unit 3 Welcome!': 39,
      'Unit 1 You and Me': 54,
      "Unit 2 We're Family!": 53,
      'Unit 3 My School': 27,
      'Unit 4 My Favourite Subject': 25,
      'Unit 5 Fun Clubs': 16,
      'Unit 6 A Day in the Life': 13,
      'Unit 7 Happy Birthday!': 22,
      '参考词表·基数词': 30,
      '参考词表·序数词': 30,
      '参考词表·月份': 12,
      '参考词表·星期': 7,
    })
    for (const unit of [
      'Starter Unit 1 Hello!',
      'Starter Unit 2 Keep Tidy!',
      'Starter Unit 3 Welcome!',
      'Unit 1 You and Me',
      "Unit 2 We're Family!",
      'Unit 3 My School',
      'Unit 4 My Favourite Subject',
      'Unit 5 Fun Clubs',
      'Unit 6 A Day in the Life',
      'Unit 7 Happy Birthday!',
    ]) {
      expect(GRADE7A_TEXTBOOK_VOCAB.some((entry) => entry.unit === unit), unit).toBe(true)
    }
  })

  it('与现有词库合并后保留全部旧 ID，并将总词条去重到 629 条', () => {
    const ids = new Set(GRADE7A_COMPLETE_VOCAB.map((entry) => entry.id))
    expect(GRADE7A_COMPLETE_VOCAB).toHaveLength(629)
    expect(GRADE7A_VOCAB.every((entry) => ids.has(entry.id))).toBe(true)
    expect(new Set(GRADE7A_COMPLETE_VOCAB.map((entry) => entry.id)).size).toBe(GRADE7A_COMPLETE_VOCAB.length)
  })

  it('完整词库的旧词条也必须有词性和释义', () => {
    const incomplete = GRADE7A_COMPLETE_VOCAB.filter((entry) => !entry.pos.trim() || entry.meanings.length === 0)
    expect(incomplete.map((entry) => `${entry.unit}/${entry.headword}`)).toEqual([])
  })

  it('参考词表中的数词、月份和星期数量完整', () => {
    const count = (unit: string) => GRADE7A_TEXTBOOK_VOCAB.filter((entry) => entry.unit === unit).length
    expect(count('参考词表·基数词')).toBe(30)
    expect(count('参考词表·序数词')).toBe(30)
    expect(count('参考词表·月份')).toBe(12)
    expect(count('参考词表·星期')).toBe(7)
  })

  it('词条字段完整，单元内词头不重复，且保留教材页码', () => {
    const keys = new Set<string>()
    const ids = new Set<string>()
    for (const entry of GRADE7A_TEXTBOOK_VOCAB) {
      expect(entry.headword.trim()).not.toBe('')
      expect(entry.pos.trim()).not.toBe('')
      expect(entry.meanings.length).toBeGreaterThan(0)
      expect(entry.meanings.every((meaning) => meaning.trim().length > 0)).toBe(true)
      expect(ids.has(entry.id), entry.id).toBe(false)
      ids.add(entry.id)
      expect(entry.sourcePage).toBeGreaterThanOrEqual(119)
      expect(entry.sourcePage).toBeLessThanOrEqual(127)
      if (entry.unit.startsWith('参考词表')) {
        expect(entry.bookPage).toBeUndefined()
      } else {
        expect(entry.bookPage).toBeGreaterThanOrEqual(1)
        expect(entry.bookPage).toBeLessThanOrEqual(72)
      }
      const key = `${entry.unit}|${entry.headword.trim().toLocaleLowerCase('en-US')}`
      expect(keys.has(key), key).toBe(false)
      keys.add(key)
    }
  })

  it('包含各部分开头、末尾和容易遗漏的词形条目', () => {
    const byUnitAndWord = new Set(GRADE7A_TEXTBOOK_VOCAB.map((entry) => `${entry.unit}|${entry.headword.toLowerCase()}`))
    for (const key of [
      'Starter Unit 1 Hello!|hello',
      'Starter Unit 2 Keep Tidy!|sock',
      'Starter Unit 2 Keep Tidy!|nose',
      'Unit 1 You and Me|teacher',
      "Unit 2 We're Family!|fish",
      'Unit 3 My School|email',
      'Unit 3 My School|interesting',
      'Unit 5 Fun Clubs|share',
      'Unit 6 A Day in the Life|o’clock',
      'Unit 7 Happy Birthday!|door',
      '参考词表·基数词|million',
      '参考词表·序数词|millionth',
      '参考词表·月份|december',
      '参考词表·星期|sunday',
    ]) {
      expect(byUnitAndWord.has(key), key).toBe(true)
    }
  })
})
