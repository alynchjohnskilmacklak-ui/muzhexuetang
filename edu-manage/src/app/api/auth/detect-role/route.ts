import { NextRequest, NextResponse } from 'next/server'
import { detectLoginRole } from '@/lib/login-accounts'
import { apiHandler } from '@/lib/api-handler'

export const POST = apiHandler(async (req: NextRequest) => {
  const { email } = await req.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ role: null })
  }
  const role = await detectLoginRole(email.trim().toLowerCase())
  // 只返回角色类型，不暴露具体账号是否存在
  return NextResponse.json({ role })
})
