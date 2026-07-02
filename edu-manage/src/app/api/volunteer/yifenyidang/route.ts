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

  const rows = records.map((record) => {
    const rankStart = record.cumulative - record.count + 1
    const rankEnd = record.cumulative
    return [record.score, record.count, record.cumulative, rankStart, rankEnd]
  })
  const total = records.at(-1)?.cumulative ?? 0

  return NextResponse.json({
    year,
    total,
    minScore: records.at(-1)?.score ?? null,
    maxScore: records[0]?.score ?? null,
    rows,
  }, {
    headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300' },
  })
})
