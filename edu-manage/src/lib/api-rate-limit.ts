const buckets = new Map<string, { count: number; resetAt: number }>()

const LIMITS: Record<string, { rpm: number }> = {
  '/api/ai/chat': { rpm: 10 },
  '/api/upload': { rpm: 20 },
  '/api/teacher/attendance': { rpm: 30 },
  default: { rpm: 300 },
}

export function checkRateLimit(ip: string, path: string): { allowed: boolean; retryAfter?: number } {
  const config = LIMITS[path] || LIMITS.default
  const key = `${ip}:${path}`
  const now = Date.now()
  const resetAt = now + 60_000

  const bucket = buckets.get(key)
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt })
    if (buckets.size > 10_000) {
      for (const [bucketKey, value] of buckets.entries()) {
        if (now >= value.resetAt) buckets.delete(bucketKey)
      }
    }
    return { allowed: true }
  }

  if (bucket.count >= config.rpm) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count += 1
  return { allowed: true }
}
