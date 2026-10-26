import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { requireFeeAdminScope } from '@/lib/fee-admin-scope'
import { getPrismaForDivision, getRequestPrisma, isDualDbEnabled } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function findActiveFeeTypes(db: ReturnType<typeof getPrismaForDivision>) {
  return db.feeType.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
    select: { id: true, name: true },
  })
}

export const GET = apiHandler(async (req: NextRequest) => {
  const { division } = await requireFeeAdminScope(req.nextUrl.searchParams.get('division'))
  if (division === 'all' && isDualDbEnabled()) {
    const lists = await Promise.all([
      findActiveFeeTypes(getPrismaForDivision('JUNIOR')),
      findActiveFeeTypes(getPrismaForDivision('SENIOR')),
    ])
    const types = [...new Map(lists.flat().map(type => [type.name, type])).values()]
    return NextResponse.json(types)
  }

  const db = isDualDbEnabled()
    ? getPrismaForDivision(division === 'all' ? 'JUNIOR' : division)
    : await getRequestPrisma()
  const types = await findActiveFeeTypes(db)
  return NextResponse.json(types)
})
