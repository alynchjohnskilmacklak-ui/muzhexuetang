import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { apiHandler } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [total, fullTime, partTime, avgRating] = await Promise.all([
    prisma.teacher.count({ where: { status: 'ACTIVE' } }),
    prisma.teacher.count({ where: { status: 'ACTIVE', employmentType: 'FULL_TIME' } }),
    prisma.teacher.count({ where: { status: 'ACTIVE', employmentType: 'PART_TIME' } }),
    prisma.teacher.aggregate({ where: { status: 'ACTIVE' }, _avg: { rating: true } }),
  ])

  return NextResponse.json({
    total,
    fullTime,
    partTime,
    monthlyHours: 0,
    avgRating: Math.round((avgRating._avg.rating || 0) * 10) / 10,
    needSchedule: 0,
  })
})
