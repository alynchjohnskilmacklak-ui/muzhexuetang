import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await auth()
  const user = session?.user as { role?: string } | undefined
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(10, Number(searchParams.get('limit') || '50')))
  const successParam = searchParams.get('success')
  const search = searchParams.get('search')?.trim()

  const where: any = {}
  if (successParam === 'true') where.success = true
  if (successParam === 'false') where.success = false
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const lockWindowStart = new Date(Date.now() - 30 * 60 * 1000)

  const [records, total, todayTotal, todayFail, recentFailures] = await Promise.all([
    prisma.loginRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, role: true, status: true },
        },
      },
    }),
    prisma.loginRecord.count({ where }),
    prisma.loginRecord.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.loginRecord.count({ where: { success: false, createdAt: { gte: todayStart } } }),
    prisma.loginRecord.groupBy({
      by: ['email'],
      where: {
        success: false,
        failReason: { not: 'locked' },
        createdAt: { gte: lockWindowStart },
      },
      _count: { email: true },
    }),
  ])

  const lockedCount = recentFailures.filter((item) => item._count.email >= 5).length

  return NextResponse.json({
    records: records.map((record) => ({
      id: record.id,
      email: record.email,
      success: record.success,
      failReason: record.failReason,
      ip: record.ip,
      device: record.device,
      os: record.os,
      browser: record.browser,
      createdAt: record.createdAt,
      userId: record.userId,
      userName: record.user?.name,
      userRole: record.user?.role,
      userStatus: record.user?.status,
    })),
    total,
    stats: { todayTotal, todayFail, lockedCount },
  })
}
