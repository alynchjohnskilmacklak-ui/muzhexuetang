import { describe, expect, it } from 'vitest'
import { hashActivationToken, isStrongActivationPassword } from './parent-activation'

describe('parent activation security', () => {
  it('stores a deterministic hash instead of the raw token', () => {
    const token = 'single-use-secret-token'
    expect(hashActivationToken(token)).toHaveLength(64)
    expect(hashActivationToken(token)).not.toContain(token)
    expect(hashActivationToken(token)).toBe(hashActivationToken(token))
  })

  it('requires at least eight characters with letters and numbers', () => {
    expect(isStrongActivationPassword('parent2026')).toBe(true)
    expect(isStrongActivationPassword('12345678')).toBe(false)
    expect(isStrongActivationPassword('abcdefgh')).toBe(false)
    expect(isStrongActivationPassword('a1short')).toBe(false)
  })
})
