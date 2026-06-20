/**
 * 统一限流工具。
 * - 有 REDIS_URL → Redis 限流（跨进程/多实例可靠）
 * - 无 REDIS_URL → 内存 token bucket（本地开发、单实例可用）
 *
 * 环境变量:
 *   REDIS_URL          — Redis 连接字符串
 *   RATE_LIMIT_DRIVER  — "redis" | "memory" | "auto"（默认 auto）
 */

interface Bucket { count: number; resetAt: number }
const memBuckets = new Map<string, Bucket>()

const RATE_RULES: Array<{ prefix: string; rpm: number }> = [
  { prefix: '/api/auth/detect-role',           rpm: 5   },
  { prefix: '/api/auth/login-check',           rpm: 20  },
  { prefix: '/api/auth/login-status',          rpm: 10  },
  { prefix: '/api/auth/check-role',            rpm: 10  },
  { prefix: '/api/auth/change-password',       rpm: 5   },
  { prefix: '/api/ai',                         rpm: 10  },
  { prefix: '/api/teacher/ai-feedback',        rpm: 6   },
  { prefix: '/api/exam-papers/recognize',      rpm: 6   },
  { prefix: '/api/class-groups',               rpm: 20  },
  { prefix: '/api/admin/attendance',           rpm: 20  },
  { prefix: '/api/feedback',                   rpm: 20  },
  { prefix: '/api/upload',                     rpm: 15  },
  { prefix: '/api/materials/upload',           rpm: 10  },
  { prefix: '/api/volunteer/schools',          rpm: 500 },
  { prefix: '/api/parent/unread-counts',       rpm: 200 },
  { prefix: '/api/parent/today',               rpm: 200 },
  { prefix: '/api/teacher/dashboard',          rpm: 200 },
  { prefix: '/api',                            rpm: 200 },
]

function getRpm(path: string): number {
  for (const rule of RATE_RULES) {
    if (path.startsWith(rule.prefix)) return rule.rpm
  }
  return 200
}

// ---- memory driver ----

function memCheck(key: string, rpm: number): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const bucket = memBuckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    memBuckets.set(key, { count: 1, resetAt: now + 60_000 })
  } else if (bucket.count >= rpm) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  } else {
    bucket.count += 1
  }

  if (memBuckets.size > 20_000) {
    for (const [k, v] of memBuckets) {
      if (now >= v.resetAt) memBuckets.delete(k)
    }
  }
  return { allowed: true }
}

// ---- Redis driver (lazy) ----

let _redisClient: unknown = null
let _redisInitFailed = false

async function getRedis(): Promise<unknown | null> {
  if (_redisClient) return _redisClient
  if (_redisInitFailed) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('redis') as { createClient: (opts: Record<string, unknown>) => { connect(): Promise<void>; incr(k: string): Promise<number>; expire(k: string, s: number): Promise<void>; ttl(k: string): Promise<number> } }
    const client = createClient({ url: process.env.REDIS_URL })
    await client.connect()
    _redisClient = client
    return client
  } catch {
    _redisInitFailed = true
    console.warn('[rate-limit] Redis 不可用，降级为内存限流')
    return null
  }
}

async function redisCheck(key: string, rpm: number): Promise<{ allowed: boolean; retryAfter?: number }> {
  const redis = await getRedis()
  if (!redis) return memCheck(key, rpm)

  const r = redis as { incr(k: string): Promise<number>; expire(k: string, s: number): Promise<void>; ttl(k: string): Promise<number> }
  try {
    const count = await r.incr(key)
    if (count === 1) {
      await r.expire(key, 60)
    }
    if (count > rpm) {
      const ttl = await r.ttl(key)
      return { allowed: false, retryAfter: Math.max(1, ttl) }
    }
    return { allowed: true }
  } catch {
    return memCheck(key, rpm)
  }
}

// ---- public API ----

function resolveDriver(): 'redis' | 'memory' {
  const configured = process.env.RATE_LIMIT_DRIVER || 'auto'
  if (configured === 'redis') return 'redis'
  if (configured === 'memory') return 'memory'
  // auto
  return process.env.REDIS_URL ? 'redis' : 'memory'
}

export async function checkRateLimit(
  ip: string,
  path: string,
  tenant?: string,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const rpm = getRpm(path)
  const segment = tenant ? `rate:${tenant}:${path}` : path
  const key = `${ip}:${segment}`

  if (resolveDriver() === 'redis') {
    return redisCheck(key, rpm)
  }
  return memCheck(key, rpm)
}

/** 同步版本（兼容旧调用，仅内存限流） */
export function checkRateLimitSync(
  ip: string,
  path: string,
): { allowed: boolean; retryAfter?: number } {
  const rpm = getRpm(path)
  return memCheck(`${ip}:${path}`, rpm)
}
