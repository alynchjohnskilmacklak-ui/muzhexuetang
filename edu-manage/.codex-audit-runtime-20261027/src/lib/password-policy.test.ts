import { describe, expect, it } from 'vitest'
import { getPasswordPolicyError, validatePassword } from '@/lib/password-policy'
import { generateTemporaryPassword } from '@/lib/temporary-password'

describe('password policy', () => {
  it('accepts a strong password with letters and numbers', () => {
    expect(validatePassword('Muzhe2026Safe!')).toEqual({ valid: true, errors: [] })
  })

  it.each(['123456', 'abcdefghij', '1234567890', 'Pass 2026 Safe'])('rejects weak password %s', (password) => {
    expect(getPasswordPolicyError(password)).toBeTruthy()
  })

  it('rejects passwords containing account identifiers', () => {
    expect(validatePassword('teacher13800138000A', { identifiers: ['13800138000'] }).valid).toBe(false)
  })

  it('generates unique policy-compliant temporary passwords', () => {
    const generated = new Set(Array.from({ length: 25 }, () => generateTemporaryPassword()))
    expect(generated.size).toBe(25)
    for (const password of generated) expect(validatePassword(password).valid).toBe(true)
  })
})
