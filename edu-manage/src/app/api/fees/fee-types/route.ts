import { NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = await getRequestPrisma()
  const types = await db.feeType.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
    select: { id: true, name: true },
  })
  return NextResponse.json(types)
})
