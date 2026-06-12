interface Bucket { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

const RATE_RULES: Array<{ prefix: string; rpm: number }> = [
  { prefix: '/api/auth/detect-role',           rpm: 5   },
  { prefix: '/api/auth/login-check',           rpm: 20  },
  { prefix: '/api/ai',                         rpm: 10  },
  { prefix: '/api/exam-papers/recognize',      rpm: 6   },
  { prefix: '/api/class-groups',               rpm: 20  },
  { prefix: '/api/attendance/submit',          rpm: 20  },
  { prefix: '/api/admin/attendance',           rpm: 20  },
  { prefix: '/api/feedback',                   rpm: 20  },
  { prefix: '/api/upload',                     rpm: 15  },
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

export function checkRateLimit(
  ip: string,
  path: string
): { allowed: boolean; retryAfter?: number } {
  const rpm = getRpm(path)
  const key = `${ip}:${path}`
  const now = Date.now()

  let bucket = buckets.get(key)
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 1, resetAt: now + 60_000 }
    buckets.set(key, bucket)
  } else if (bucket.count >= rpm) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  } else {
    bucket.count += 1
  }

  if (buckets.size > 20_000) {
    for (const [k, v] of buckets) {
      if (now >= v.resetAt) buckets.delete(k)
    }
  }
  return { allowed: true }
}
