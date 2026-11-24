import { describe, expect, it } from 'vitest'

describe('hours normalization CLI mode', () => {
  it('defaults to dry-run and requires an explicit apply flag to write', async () => {
    const modeApi = await import('./normalization-mode').catch(() => null)

    expect(modeApi?.getNormalizationMode).toBeTypeOf('function')
    expect(modeApi?.getNormalizationMode([])).toBe('dry-run')
    expect(modeApi?.getNormalizationMode(['--dry-run'])).toBe('dry-run')
    expect(modeApi?.getNormalizationMode(['--apply'])).toBe('apply')
  })

  it('rejects contradictory apply and dry-run flags', async () => {
    const modeApi = await import('./normalization-mode').catch(() => null)

    expect(() => modeApi?.getNormalizationMode(['--apply', '--dry-run'])).toThrow(/不能同时使用/)
  })
})
