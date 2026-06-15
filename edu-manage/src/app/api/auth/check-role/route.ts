import { NextRequest, NextResponse } from 'next/server'
import { getPrismaForDivision, isDualDbEnabled, prisma } from '@/lib/prisma'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

function resolveDb(division: string | null | undefined) {
  if (!isDualDbEnabled()) return prisma
  if (division !== 'JUNIOR' && division !== 'SENIOR') return null
  return getPrismaForDivision(division)
}

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const division = typeof body.division === 'string' ? body.division : undefined
  if (!email) return NextResponse.json({ role: null })

  const db = resolveDb(division)
  if (!db) {
    return NextResponse.json({ error: 'Missing division' }, { status: 400 })
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { role: true },
  })

  return NextResponse.json({ role: user?.role || null })
})
