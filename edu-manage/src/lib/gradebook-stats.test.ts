import { describe, expect, it } from 'vitest'
import { calculateGradeStats, countCompletedGradeEntries, isInvalidGradeScore } from './gradebook-stats'

describe('calculateGradeStats', () => {
  it('calculates count, average, maximum, and minimum', () => {
    expect(calculateGradeStats([59, 60, 90, Number.NaN])).toEqual({ count: 3, average: 69.7, maximum: 90, minimum: 59 })
  })

  it('returns zeroed metrics when no valid scores have been recorded', () => {
    expect(calculateGradeStats([])).toEqual({ count: 0, average: null, maximum: null, minimum: null })
  })
})

describe('grade entry completion', () => {
  it('counts either a score or an explicit absence as complete, but not a blank row', () => {
    expect(countCompletedGradeEntries(['a', 'b', 'c'], { a: '88', c: '' }, { b: true })).toBe(2)
    expect(countCompletedGradeEntries(['a'], { a: '   ' }, {})).toBe(0)
  })

  it('rejects non-numeric and out-of-range scores while accepting empty input for unfinished rows', () => {
    expect(isInvalidGradeScore('abc', 100)).toBe(true)
    expect(isInvalidGradeScore('1e2', 100)).toBe(true)
    expect(isInvalidGradeScore('   ', 100)).toBe(false)
    expect(isInvalidGradeScore(' 88.5 ', 100)).toBe(false)
    expect(isInvalidGradeScore('-1', 100)).toBe(true)
    expect(isInvalidGradeScore('101', 100)).toBe(true)
    expect(isInvalidGradeScore('', 100)).toBe(false)
  })
})
