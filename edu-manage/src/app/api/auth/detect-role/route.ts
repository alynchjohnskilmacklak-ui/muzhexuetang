import { NextRequest, NextResponse } from 'next/server'
import { detectLoginRole } from '@/lib/login-accounts'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

const buckets = new Map<string, { count: number; resetAt: number }>()
const LIMIT = 5
const WINDOW_MS = 60_000

function ipLimited(req: NextRequest): boolean {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '0.0.0.0'
  const now = Date.now()
  const b = buckets.get(ip)
  if (!b || now >= b.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) { if (now >= v.resetAt) buckets.delete(k) }
    }
    return false
  }
  if (b.count >= LIMIT) return true
  b.count++
  return false
}

export const POST = apiHandler(async (req: NextRequest) => {
  if (ipLimited(req)) {
    return NextResponse.json({ role: null }, { status: 429, headers: { 'Retry-After': '60' } })
  }

  const { email } = await req.json().catch(() => ({ email: '' }))
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ role: null })
  }

  const role = await detectLoginRole(email.trim().toLowerCase())

  // 不向未登录请求返回 admin 身份，防止攻击者探测管理员账号。
  // 家长/教师可返回（用于前端自动切换登录入口），admin 一律返回 null。
  if (role === 'admin') {
    return NextResponse.json({ role: null })
  }
  return NextResponse.json({ role })
})
