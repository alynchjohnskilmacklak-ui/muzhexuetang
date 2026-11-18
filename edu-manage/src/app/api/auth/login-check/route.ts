import { NextRequest, NextResponse } from 'next/server'
import { precheckLoginAccount, type LoginRole } from '@/lib/login-accounts'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email : ''
  const loginRole = typeof body.loginRole === 'string' ? body.loginRole as LoginRole : null
  const division = typeof body.division === 'string' ? body.division : undefined
  const identifierType = body.identifierType === 'phone' ? 'phone' : 'email'

  if (!loginRole || !['admin', 'teacher', 'parent'].includes(loginRole)) {
    return NextResponse.json(
      { ok: false, error: '账号信息暂不可用，请检查账号和登录入口后重试', code: 'LOGIN_CHECK_FAILED' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  const result = await precheckLoginAccount(email, loginRole, division, identifierType)
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: '账号信息暂不可用，请检查账号和登录入口后重试', code: 'LOGIN_CHECK_FAILED' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } })
})
