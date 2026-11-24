import { afterEach, describe, expect, it } from 'vitest'
import { getTrustedClientIp } from './request-ip'

const originalNodeEnv = process.env.NODE_ENV
const mutableEnv = process.env as Record<string, string | undefined>

afterEach(() => {
  if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV
  else mutableEnv.NODE_ENV = originalNodeEnv
})

describe('getTrustedClientIp', () => {
  it('uses only the address written by the reverse proxy', () => {
    mutableEnv.NODE_ENV = 'test'
    const headers = new Headers({
      'x-real-ip': '198.51.100.17',
      'x-forwarded-for': '203.0.113.8, 198.51.100.17',
    })

    expect(getTrustedClientIp(headers)).toBe('198.51.100.17')
  })

  it('keeps local development usable when no proxy address is present', () => {
    mutableEnv.NODE_ENV = 'development'
    expect(getTrustedClientIp(new Headers({ 'x-forwarded-for': '203.0.113.8' }))).toBe('unknown')
  })

  it('fails closed in production when the trusted proxy address is absent or invalid', () => {
    mutableEnv.NODE_ENV = 'production'

    expect(() => getTrustedClientIp(new Headers({ 'x-forwarded-for': '203.0.113.8' }))).toThrow('TRUSTED_CLIENT_IP_MISSING')
    expect(() => getTrustedClientIp(new Headers({ 'x-real-ip': 'not-an-ip' }))).toThrow('TRUSTED_CLIENT_IP_MISSING')
  })
})
