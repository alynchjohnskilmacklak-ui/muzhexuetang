import { describe, expect, it } from 'vitest'
import {
  isSupportedUserStatus,
  isUserActive,
  isUserDisabled,
  normalizeUserStatus,
  toStoredUserStatus,
} from '@/lib/user-status'

describe('User status normalization', () => {
  it.each(['active', 'ACTIVE'])('accepts active legacy value %s', (status) => {
    expect(normalizeUserStatus(status)).toBe('ACTIVE')
    expect(isUserActive(status)).toBe(true)
    expect(toStoredUserStatus(status)).toBe('active')
  })

  it.each(['disabled', 'DISABLED', 'inactive', 'INACTIVE'])('rejects disabled legacy value %s', (status) => {
    expect(normalizeUserStatus(status)).toBe('DISABLED')
    expect(isUserDisabled(status)).toBe(true)
    expect(toStoredUserStatus(status)).toBe('disabled')
  })

  it('fails closed for missing or unknown values', () => {
    expect(isUserDisabled(undefined)).toBe(true)
    expect(isUserDisabled('unexpected')).toBe(true)
    expect(isSupportedUserStatus('unexpected')).toBe(false)
  })
})
