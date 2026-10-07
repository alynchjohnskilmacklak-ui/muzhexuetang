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
  { prefix: '/api/auth/forgot-password',       rpm: 5   },
  { prefix: '/api/auth/reset-password',        rpm: 10  },
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

export function getRule(path: string): { prefix: string; rpm: number } {
  for (const rule of RATE_RULES) {
    if (path.startsWith(rule.prefix)) return rule
  }
  return { prefix: '/api', rpm: 200 }
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
  while (memBuckets.size > 50_000) {
    const oldestKey = memBuckets.keys().next().value as string | undefined
    if (!oldestKey) break
    memBuckets.delete(oldestKey)
  }
  return { allowed: true }
}

// ---- Redis driver (lazy) ----

let _redisClient: unknown = null
let _redisInitFailed = false

function isExplicitRedisDriver(): boolean {
  return process.env.RATE_LIMIT_DRIVER?.toLowerCase() === 'redis'
}

async function getRedis(): Promise<unknown | null> {
  if (_redisClient) return _redisClient
  if (_redisInitFailed) {
    if (isExplicitRedisDriver()) {
      throw new Error('[rate-limit] Redis 初始化此前已失败，显式 Redis 模式拒绝降级')
    }
    return null
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('redis') as { createClient: (opts: Record<string, unknown>) => { connect(): Promise<void>; incr(k: string): Promise<number>; expire(k: string, s: number): Promise<void>; ttl(k: string): Promise<number> } }
    const client = createClient({ url: process.env.REDIS_URL })
    await client.connect()
    _redisClient = client
    return client
  } catch (error) {
    _redisInitFailed = true
    if (isExplicitRedisDriver()) {
      throw new Error('[rate-limit] RATE_LIMIT_DRIVER=redis，但 Redis 初始化失败', { cause: error })
    }
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
  } catch (error) {
    if (isExplicitRedisDriver()) {
      throw new Error('[rate-limit] Redis 限流请求失败，拒绝静默降级', { cause: error })
    }
    return memCheck(key, rpm)
  }
}

// ---- public API ----

function resolveDriver(): 'redis' | 'memory' {
  const configured = (process.env.RATE_LIMIT_DRIVER || 'auto').toLowerCase()
  if (configured === 'redis') {
    if (!process.env.REDIS_URL) {
      throw new Error('[rate-limit] RATE_LIMIT_DRIVER=redis 时必须配置 REDIS_URL')
    }
    return 'redis'
  }
  if (configured === 'memory') return 'memory'
  if (configured !== 'auto') {
    throw new Error(`[rate-limit] 不支持的 RATE_LIMIT_DRIVER: ${configured}`)
  }
  // auto
  return process.env.REDIS_URL ? 'redis' : 'memory'
}

export async function checkRateLimit(
  ip: string,
  path: string,
  tenant?: string,
  rpmOverride?: number,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const rule = getRule(path)
  const rpm = rpmOverride ?? rule.rpm
  const segment = tenant ? `rate:${tenant}:${rule.prefix}` : rule.prefix
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
  const rule = getRule(path)
  return memCheck(`${ip}:${rule.prefix}`, rule.rpm)
}
