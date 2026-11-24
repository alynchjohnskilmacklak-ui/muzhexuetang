import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearPersonalizedLearningSummaryCache,
  getCachedPersonalizedLearningSummary,
} from './personalized-summary-cache'

const summary = { overview: '阶段总结', strengths: [], focusAreas: [], nextSteps: [] }

describe('personalized learning summary cache', () => {
  beforeEach(() => clearPersonalizedLearningSummaryCache())

  it('reuses a successful summary during the short cache window', async () => {
    const create = vi.fn(async () => summary)

    await expect(getCachedPersonalizedLearningSummary('student-period', create, 1_000)).resolves.toEqual(summary)
    await expect(getCachedPersonalizedLearningSummary('student-period', create, 2_000)).resolves.toEqual(summary)

    expect(create).toHaveBeenCalledTimes(1)
  })

  it('coalesces concurrent generation for the same student period', async () => {
    let resolveSummary: ((value: typeof summary) => void) | undefined
    const create = vi.fn(() => new Promise<typeof summary>((resolve) => { resolveSummary = resolve }))
    const first = getCachedPersonalizedLearningSummary('student-period', create, 1_000)
    const second = getCachedPersonalizedLearningSummary('student-period', create, 1_000)
    await Promise.resolve()

    expect(create).toHaveBeenCalledTimes(1)
    resolveSummary?.(summary)
    await expect(Promise.all([first, second])).resolves.toEqual([summary, summary])
  })

  it('does not cache failed or empty provider results', async () => {
    const create = vi.fn(async () => null)

    await expect(getCachedPersonalizedLearningSummary('student-period', create, 1_000)).resolves.toBeNull()
    await expect(getCachedPersonalizedLearningSummary('student-period', create, 2_000)).resolves.toBeNull()

    expect(create).toHaveBeenCalledTimes(2)
  })
})
