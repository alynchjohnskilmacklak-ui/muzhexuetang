import { NextRequest, NextResponse } from 'next/server'
import { validateLoginAccount, type LoginRole } from '@/lib/login-accounts'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
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
}
