import { NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })


  const prisma = await getRequestPrisma()
  const rows = await prisma.student.groupBy({
    by: ['grade'],
    where: { status: { not: 'INACTIVE' } },
    _count: { _all: true },
  })

  const counts: Record<string, number> = {}
  for (const row of rows) {
    counts[row.grade || '未设年级'] = row._count._all
  }

  return NextResponse.json(counts)
})
