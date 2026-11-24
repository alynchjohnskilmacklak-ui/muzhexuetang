import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildCredentialAccountKey,
  checkCredentialRateLimit,
  recordCredentialFailure,
  resetCredentialRateLimitsForTests,
} from './login-rate-limit'

describe('credential account lockout scope', () => {
  beforeEach(() => resetCredentialRateLimitsForTests())

  it('does not let failures from one IP lock the same account for another IP', () => {
    const firstIpKey = buildCredentialAccountKey('parent', 'JUNIOR', 'parent@example.com', '203.0.113.10')
    const secondIpKey = buildCredentialAccountKey('parent', 'JUNIOR', 'parent@example.com', '203.0.113.20')

    for (let attempt = 0; attempt < 10; attempt += 1) recordCredentialFailure(firstIpKey, 1_000 + attempt)

    expect(checkCredentialRateLimit('203.0.113.10', firstIpKey, 2_000)).toEqual({ allowed: false, code: 'ACCOUNT_LOCKED' })
    expect(checkCredentialRateLimit('203.0.113.20', secondIpKey, 2_000)).toEqual({ allowed: true })
  })

  it('does not create an account-wide lock when the trusted IP is unavailable', () => {
    const key = buildCredentialAccountKey('parent', 'JUNIOR', 'parent@example.com', 'unknown')
    for (let attempt = 0; attempt < 20; attempt += 1) recordCredentialFailure(key, 1_000 + attempt)

    expect(checkCredentialRateLimit('unknown', key, 2_000)).toEqual({ allowed: true })
  })
})
