import { afterEach, describe, expect, it } from 'vitest'
import { checkRateLimitSync } from '@/lib/rate-limit'
import { checkRateLimit } from '@/lib/rate-limit'

const originalDriver = process.env.RATE_LIMIT_DRIVER
const originalRedisUrl = process.env.REDIS_URL

afterEach(() => {
  if (originalDriver === undefined) delete process.env.RATE_LIMIT_DRIVER
  else process.env.RATE_LIMIT_DRIVER = originalDriver
  if (originalRedisUrl === undefined) delete process.env.REDIS_URL
  else process.env.REDIS_URL = originalRedisUrl
})

describe('rate limit route grouping', () => {
  it('cannot be bypassed by changing a dynamic path suffix', () => {
    const ip = `test-${Date.now()}-${Math.random()}`
    for (let index = 0; index < 5; index += 1) {
      expect(checkRateLimitSync(ip, `/api/auth/detect-role/${index}`).allowed).toBe(true)
    }
    expect(checkRateLimitSync(ip, '/api/auth/detect-role/another').allowed).toBe(false)
  })

  it('fails closed when Redis is explicitly required but not configured', async () => {
    process.env.RATE_LIMIT_DRIVER = 'redis'
    delete process.env.REDIS_URL
    await expect(checkRateLimit('test-ip', '/api/auth/login-check')).rejects.toThrow('REDIS_URL')
  })
})
