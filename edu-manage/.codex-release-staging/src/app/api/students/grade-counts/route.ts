import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'
import { resolveAdminTermScope } from '@/lib/admin-term-scope'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })


  const prisma = await getRequestPrisma()
  const { searchParams } = new URL(req.url)
  const division = getRequestDivision(session.user as Record<string, unknown> | undefined, searchParams.get('division'))
  const requestedTermId = searchParams.get('termId')?.trim() || null
  const selectedTerm = await resolveAdminTermScope(prisma, division, req)
  if (requestedTermId && !selectedTerm) return NextResponse.json({ error: '运营批次不存在' }, { status: 404 })
  if (!selectedTerm) return NextResponse.json({})
  const rows = await prisma.student.groupBy({
    by: ['grade'],
    where: {
      division,
      status: { not: 'INACTIVE' },
      termMemberships: { some: { termId: selectedTerm.id } },
    },
    _count: { _all: true },
  })

  const counts: Record<string, number> = {}
  for (const row of rows) {
    counts[row.grade || '未设年级'] = row._count._all
  }

  return NextResponse.json(counts)
})
