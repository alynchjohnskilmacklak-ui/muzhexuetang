import { describe, expect, it } from 'vitest'
import { shouldSearchChoices, shouldUseInlineChoices } from './choice-thresholds'

describe('choice control thresholds', () => {
  it('keeps one to four options inline and switches at five', () => {
    expect([1, 2, 3, 4].map(shouldUseInlineChoices)).toEqual([true, true, true, true])
    expect(shouldUseInlineChoices(5)).toBe(false)
    expect(shouldUseInlineChoices(0)).toBe(false)
  })

  it('adds search only after ten options', () => {
    expect(shouldSearchChoices(10)).toBe(false)
    expect(shouldSearchChoices(11)).toBe(true)
  })
})
