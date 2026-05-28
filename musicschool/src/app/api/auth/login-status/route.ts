import { NextRequest, NextResponse } from 'next/server'
import { getLoginStatus } from '@/lib/login-accounts'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email : ''

  if (!email) return NextResponse.json({ locked: false, failCount: 0, remaining: 5 })

  return NextResponse.json(await getLoginStatus(email))
}
