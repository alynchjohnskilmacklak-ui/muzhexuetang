import { NextRequest, NextResponse } from 'next/server'
import { detectLoginRole } from '@/lib/login-accounts'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ role: null })
    }
    const role = await detectLoginRole(email.trim().toLowerCase())
    return NextResponse.json({ role })
  } catch {
    return NextResponse.json({ role: null })
  }
}
