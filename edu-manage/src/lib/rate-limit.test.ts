import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const redisMocks = vi.hoisted(() => ({ createClient: vi.fn() }))
vi.mock('redis', () => ({ createClient: redisMocks.createClient }))

const originalDriver = process.env.RATE_LIMIT_DRIVER
const originalRedisUrl = process.env.REDIS_URL
const originalNodeEnv = process.env.NODE_ENV
const mutableEnv = process.env as Record<string, string | undefined>

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

afterEach(() => {
  if (originalDriver === undefined) delete process.env.RATE_LIMIT_DRIVER
  else process.env.RATE_LIMIT_DRIVER = originalDriver
  if (originalRedisUrl === undefined) delete process.env.REDIS_URL
  else process.env.REDIS_URL = originalRedisUrl
  if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV
  else mutableEnv.NODE_ENV = originalNodeEnv
})

describe('rate limit route grouping', () => {
  it('cannot be bypassed by changing a dynamic path suffix', async () => {
    const { checkRateLimitSync } = await import('@/lib/rate-limit')
    const ip = `test-${Date.now()}-${Math.random()}`
    for (let index = 0; index < 5; index += 1) {
      expect(checkRateLimitSync(ip, `/api/auth/detect-role/${index}`).allowed).toBe(true)
    }
    expect(checkRateLimitSync(ip, '/api/auth/detect-role/another').allowed).toBe(false)
  })

  it('fails closed when Redis is explicitly required but not configured', async () => {
    process.env.RATE_LIMIT_DRIVER = 'redis'
    delete process.env.REDIS_URL
    const { checkRateLimit } = await import('@/lib/rate-limit')
    await expect(checkRateLimit('test-ip', '/api/auth/login-check')).rejects.toThrow('REDIS_URL')
  })

  it('requires Redis when production uses the auto driver', async () => {
    mutableEnv.NODE_ENV = 'production'
    process.env.RATE_LIMIT_DRIVER = 'auto'
    delete process.env.REDIS_URL
    const { checkRateLimit } = await import('@/lib/rate-limit')

    await expect(checkRateLimit('test-ip', '/api/auth/login-check')).rejects.toThrow('REDIS_URL')
  })

  it('does not fall back to per-process memory when production Redis fails', async () => {
    mutableEnv.NODE_ENV = 'production'
    process.env.RATE_LIMIT_DRIVER = 'auto'
    process.env.REDIS_URL = 'redis://127.0.0.1:6379'
    redisMocks.createClient.mockReturnValue({
      connect: vi.fn().mockResolvedValue(undefined),
      eval: vi.fn().mockRejectedValue(new Error('redis unavailable')),
    })
    const { checkRateLimit } = await import('@/lib/rate-limit')

    await expect(checkRateLimit('test-ip', '/api/auth/login-check')).rejects.toThrow('Redis 限流请求失败')
  })

  it('increments and sets a missing TTL atomically through one Redis script', async () => {
    const evalScript = vi.fn()
      .mockResolvedValueOnce([1, 60])
      .mockResolvedValueOnce([0, 42])
    redisMocks.createClient.mockReturnValue({ connect: vi.fn().mockResolvedValue(undefined), eval: evalScript })
    process.env.RATE_LIMIT_DRIVER = 'redis'
    process.env.REDIS_URL = 'redis://127.0.0.1:6379'
    const { checkRateLimit } = await import('@/lib/rate-limit')

    expect(await checkRateLimit('203.0.113.7', '/api/auth/detect-role', undefined, 1)).toEqual({ allowed: true })
    expect(await checkRateLimit('203.0.113.7', '/api/auth/detect-role', undefined, 1)).toEqual({ allowed: false, retryAfter: 42 })
    expect(evalScript).toHaveBeenCalledTimes(2)
    expect(evalScript.mock.calls[0][0]).toContain("redis.call('INCR', KEYS[1])")
    expect(evalScript.mock.calls[0][0]).toContain("redis.call('EXPIRE', KEYS[1]")
    expect(evalScript.mock.calls[0][1]).toEqual({
      keys: ['203.0.113.7:/api/auth/detect-role'],
      arguments: ['60', '1'],
    })
  })
})
