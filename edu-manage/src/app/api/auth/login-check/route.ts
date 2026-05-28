import { NextRequest, NextResponse } from 'next/server'
import { validateLoginAccount, type LoginRole } from '@/lib/login-accounts'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

const ipBuckets = new Map<string, { count: number; resetAt: number }>()
const IP_LIMIT = 20
const IP_WINDOW_MS = 60_000

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

  if (!loginRole || !['admin', 'teacher', 'parent'].includes(loginRole)) {
    return NextResponse.json({ ok: false, error: '请选择登录身份' }, { status: 400 })
  }

  const result = await validateLoginAccount(email, password, loginRole, { recordAttempt: true })
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error, code: result.code }, { status: 400 })

  return NextResponse.json({ ok: true })
})
