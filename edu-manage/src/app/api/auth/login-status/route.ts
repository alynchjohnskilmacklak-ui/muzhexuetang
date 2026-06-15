import { NextRequest, NextResponse } from 'next/server'
import { getLoginStatus } from '@/lib/login-accounts'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email : ''
  const division = typeof body.division === 'string' ? body.division : undefined

  if (!email) return NextResponse.json({ locked: false, failCount: 0, remaining: 5 })

  return NextResponse.json(await getLoginStatus(email, division))
})
