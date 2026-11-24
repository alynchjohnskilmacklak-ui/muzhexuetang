import { describe, expect, it } from 'vitest'
import { isAuthorizedCronRequest } from './cron-auth'

describe('isAuthorizedCronRequest', () => {
  it('accepts the configured bearer secret', () => {
    expect(isAuthorizedCronRequest('Bearer cron-secret', 'cron-secret')).toBe(true)
  })

  it('rejects a health token, query-only token, malformed header, or missing secret', () => {
    expect(isAuthorizedCronRequest('Bearer health-secret', 'cron-secret')).toBe(false)
    expect(isAuthorizedCronRequest(null, 'cron-secret')).toBe(false)
    expect(isAuthorizedCronRequest('cron-secret', 'cron-secret')).toBe(false)
    expect(isAuthorizedCronRequest('Bearer cron-secret', undefined)).toBe(false)
  })

  it('rejects a same-prefix token with a different length or value', () => {
    expect(isAuthorizedCronRequest('Bearer cron-secret-extra', 'cron-secret')).toBe(false)
    expect(isAuthorizedCronRequest('Bearer cr0n-secret', 'cron-secret')).toBe(false)
  })
})
