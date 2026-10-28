import { afterEach, describe, expect, it } from 'vitest'
import { initSessionEvents } from '@/lib/session-events'

const originalDriver = process.env.SESSION_EVENT_DRIVER
const originalRedisUrl = process.env.REDIS_URL

afterEach(() => {
  if (originalDriver === undefined) delete process.env.SESSION_EVENT_DRIVER
  else process.env.SESSION_EVENT_DRIVER = originalDriver
  if (originalRedisUrl === undefined) delete process.env.REDIS_URL
  else process.env.REDIS_URL = originalRedisUrl
})

describe('session event driver configuration', () => {
  it('fails closed when Redis is explicitly required but not configured', async () => {
    process.env.SESSION_EVENT_DRIVER = 'redis'
    delete process.env.REDIS_URL
    await expect(initSessionEvents()).rejects.toThrow('REDIS_URL')
  })
})
