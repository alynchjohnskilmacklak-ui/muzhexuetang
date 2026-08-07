import { describe, expect, it } from 'vitest'
import { checkRateLimitSync } from '@/lib/rate-limit'

describe('rate limit route grouping', () => {
  it('cannot be bypassed by changing a dynamic path suffix', () => {
    const ip = `test-${Date.now()}-${Math.random()}`
    for (let index = 0; index < 5; index += 1) {
      expect(checkRateLimitSync(ip, `/api/auth/detect-role/${index}`).allowed).toBe(true)
    }
    expect(checkRateLimitSync(ip, '/api/auth/detect-role/another').allowed).toBe(false)
  })
})

