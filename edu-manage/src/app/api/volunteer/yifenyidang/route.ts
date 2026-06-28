import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getRequestPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
  const requestedYear = Number(new URL(request.url).searchParams.get('year') || 2025)
  const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100 ? requestedYear : 2025
  const prisma = await getRequestPrisma()
  const records = await prisma.yifenYidang.findMany({
    where: { year },
    orderBy: { score: 'desc' },
    select: { score: true, count: true, cumulative: true },
  })

  let previousCumulative = 0
  const rows = records.map((record) => {
    const rankStart = previousCumulative + 1
    const rankEnd = record.cumulative
    previousCumulative = record.cumulative
    return [record.score, record.count, record.cumulative, rankStart, rankEnd]
  })
  const total = records.at(-1)?.cumulative ?? 0

  return NextResponse.json({ total, rows }, {
    headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300' },
  })
})
