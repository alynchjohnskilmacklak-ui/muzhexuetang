type Bucket = { count: number; resetAt: number; lockedUntil?: number }

const globalForLoginLimits = globalThis as unknown as {
  credentialIpBuckets?: Map<string, Bucket>
  credentialAccountBuckets?: Map<string, Bucket>
}

const ipBuckets = globalForLoginLimits.credentialIpBuckets ?? new Map<string, Bucket>()
const accountBuckets = globalForLoginLimits.credentialAccountBuckets ?? new Map<string, Bucket>()

globalForLoginLimits.credentialIpBuckets = ipBuckets
globalForLoginLimits.credentialAccountBuckets = accountBuckets

const IP_LIMIT = 20
const IP_WINDOW_MS = 60_000
const ACCOUNT_LIMIT = 10
const ACCOUNT_WINDOW_MS = 300_000
const ACCOUNT_LOCK_MS = 900_000

export type LoginRateLimitResult = {
  allowed: boolean
  code?: 'RATE_LIMITED' | 'ACCOUNT_LOCKED'
}

function pruneExpired(map: Map<string, Bucket>, now: number) {
  if (map.size <= 10_000) return
  for (const [key, value] of map) {
    if (now >= value.resetAt && (!value.lockedUntil || now >= value.lockedUntil)) {
      map.delete(key)
    }
    if (map.size <= 9_000) break
  }
}

/** Authoritative in-process rate limit for the NextAuth credentials endpoint. */
export function checkCredentialRateLimit(ip: string, accountKey: string, now = Date.now()): LoginRateLimitResult {
  const ipBucket = ipBuckets.get(ip)
  if (!ipBucket || now >= ipBucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS })
  } else {
    if (ipBucket.count >= IP_LIMIT) return { allowed: false, code: 'RATE_LIMITED' }
    ipBucket.count += 1
  }

  const accountBucket = accountBuckets.get(accountKey)
  if (accountBucket?.lockedUntil && now < accountBucket.lockedUntil) {
    return { allowed: false, code: 'ACCOUNT_LOCKED' }
  }
  if (accountBucket && now < accountBucket.resetAt && accountBucket.count >= ACCOUNT_LIMIT) {
    accountBucket.lockedUntil = now + ACCOUNT_LOCK_MS
    return { allowed: false, code: 'ACCOUNT_LOCKED' }
  }
  if (accountBucket && now >= accountBucket.resetAt) accountBuckets.delete(accountKey)

  pruneExpired(ipBuckets, now)
  pruneExpired(accountBuckets, now)
  return { allowed: true }
}

export function recordCredentialFailure(accountKey: string, now = Date.now()) {
  const bucket = accountBuckets.get(accountKey)
  if (!bucket || now >= bucket.resetAt) {
    accountBuckets.set(accountKey, { count: 1, resetAt: now + ACCOUNT_WINDOW_MS })
    return
  }
  bucket.count += 1
}

export function clearCredentialFailures(accountKey: string) {
  accountBuckets.delete(accountKey)
}

export function buildCredentialAccountKey(role: string, division: string | undefined, email: string) {
  const scopedDivision = division === 'SENIOR' ? 'SENIOR' : 'JUNIOR'
  return `${scopedDivision}:${role}:${email.trim().toLowerCase()}`
}

export function resetCredentialRateLimitsForTests() {
  ipBuckets.clear()
  accountBuckets.clear()
}
