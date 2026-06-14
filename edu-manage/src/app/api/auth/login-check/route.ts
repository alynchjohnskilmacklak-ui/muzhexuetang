import { NextRequest, NextResponse } from 'next/server'
import { validateLoginAccount, type LoginRole } from '@/lib/login-accounts'
import { parseUserAgent } from '@/lib/device'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

const ipBuckets = new Map<string, { count: number; resetAt: number }>()
const accountBuckets = new Map<string, { count: number; resetAt: number; lockedUntil?: number }>()
const IP_LIMIT = 20
const IP_WINDOW_MS = 60_000
const ACCOUNT_LIMIT = 10
const ACCOUNT_WINDOW_MS = 300_000
const ACCOUNT_LOCK_MS = 900_000

function checkIpLimit(req: NextRequest): boolean {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || '0.0.0.0'
  const now = Date.now()
  const bucket = ipBuckets.get(ip)

  if (!bucket || now >= bucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS })
    if (ipBuckets.size > 10_000) {
      const oldest = [...ipBuckets.entries()]
        .filter(([, value]) => now >= value.resetAt)
        .slice(0, 1000)
      oldest.forEach(([key]) => ipBuckets.delete(key))
    }
    return true
  }
  if (bucket.count >= IP_LIMIT) return false
  bucket.count++
  return true
}

function checkAccountLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const bucket = accountBuckets.get(identifier)

  if (bucket?.lockedUntil && now < bucket.lockedUntil) {
    return { allowed: false, retryAfter: Math.ceil((bucket.lockedUntil - now) / 1000) }
  }

  if (!bucket || now >= bucket.resetAt) {
    accountBuckets.set(identifier, { count: 0, resetAt: now + ACCOUNT_WINDOW_MS })
    return { allowed: true }
  }

  if (bucket.count >= ACCOUNT_LIMIT) {
    const lockedUntil = now + ACCOUNT_LOCK_MS
    accountBuckets.set(identifier, { ...bucket, lockedUntil })
    return { allowed: false, retryAfter: Math.ceil(ACCOUNT_LOCK_MS / 1000) }
  }

  return { allowed: true }
}

function recordAccountFailure(identifier: string) {
  const now = Date.now()
  const bucket = accountBuckets.get(identifier)
  if (!bucket || now >= bucket.resetAt) {
    accountBuckets.set(identifier, { count: 1, resetAt: now + ACCOUNT_WINDOW_MS })
    return
  }
  accountBuckets.set(identifier, { ...bucket, count: bucket.count + 1 })
}

function clearAccountLimit(identifier: string) {
  accountBuckets.delete(identifier)
}

export const POST = apiHandler(async (req: NextRequest) => {
  if (!checkIpLimit(req)) {
    return NextResponse.json(
      { ok: false, error: '请求过于频繁，请稍后再试' },
      { status: 429, headers: { 'Retry-After': '60' } },
    )
  }

  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const loginRole = typeof body.loginRole === 'string' ? body.loginRole as LoginRole : null
  const division = typeof body.division === 'string' ? body.division : undefined

  if (!loginRole || !['admin', 'teacher', 'parent'].includes(loginRole)) {
    return NextResponse.json({ ok: false, error: '请选择登录身份' }, { status: 400 })
  }

  const accountKey = `${loginRole}:${email.trim().toLowerCase()}`
  const accountLimit = checkAccountLimit(accountKey)
  if (!accountLimit.allowed) {
    return NextResponse.json(
      { ok: false, error: '该账号尝试过于频繁，请稍后再试', code: 'ACCOUNT_LOCKED' },
      { status: 429, headers: accountLimit.retryAfter ? { 'Retry-After': String(accountLimit.retryAfter) } : {} },
    )
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '未知'
  const ua = req.headers.get('user-agent') || ''
  const { device, os, browser } = parseUserAgent(ua)
  const meta = { ip, userAgent: ua, device, os, browser }

  const result = await validateLoginAccount(email, password, loginRole, { recordAttempt: true }, meta, division)
  if (!result.ok) {
    recordAccountFailure(accountKey)
    return NextResponse.json({ ok: false, error: result.error, code: result.code }, { status: 400 })
  }

  clearAccountLimit(accountKey)
  return NextResponse.json({ ok: true })
})
