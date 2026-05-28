import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json()
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!email) return NextResponse.json({ role: null })

  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  })

  return NextResponse.json({ role: user?.role || null })
})
