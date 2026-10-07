import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { getRequestDivision } from '@/lib/division'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
  const prisma = await getRequestPrisma()
  const division = getRequestDivision(user, req.nextUrl.searchParams.get('division'))
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekStart = new Date(todayStart.getTime() - ((now.getDay() + 6) % 7) * 86400000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const day30 = new Date(todayStart.getTime() - 29 * 86400000)

  // 家长用户（该 division 下）
  const parentUsers = await prisma.user.findMany({
    where: { role: 'parent', division },
    select: { id: true, name: true },
  })
  const parentIds = parentUsers.map((u) => u.id)

  const whereBase = {
    success: true,
    userId: { in: parentIds.length ? parentIds : ['__NONE__'] },
  }

  const [todayCount, weekCount, monthCount, day30Count, records] = await Promise.all([
    prisma.loginRecord.count({ where: { ...whereBase, createdAt: { gte: todayStart } } }),
    prisma.loginRecord.count({ where: { ...whereBase, createdAt: { gte: weekStart } } }),
    prisma.loginRecord.count({ where: { ...whereBase, createdAt: { gte: monthStart } } }),
    prisma.loginRecord.count({ where: { ...whereBase, createdAt: { gte: day30 } } }),
    prisma.loginRecord.groupBy({
      by: ['userId'],
      where: { ...whereBase, createdAt: { gte: day30 } },
      _count: { _all: true },
      _max: { createdAt: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 10,
    }),
  ])

  // 近 30 天每日登录趋势
  const trendMap: Record<string, number> = {}
  const dayRows = await prisma.loginRecord.findMany({
    where: { ...whereBase, createdAt: { gte: day30 } },
    select: { createdAt: true },
  })
  dayRows.forEach((r) => {
    const key = r.createdAt.toLocaleDateString('sv-SE')
    trendMap[key] = (trendMap[key] || 0) + 1
  })
  const trend: { date: string; count: number }[] = []
  for (let i = 0; i < 30; i += 1) {
    const d = new Date(day30.getTime() + i * 86400000)
    const key = d.toLocaleDateString('sv-SE')
    trend.push({ date: key.slice(5), count: trendMap[key] || 0 })
  }

  const ranking = records.map((r) => {
    const pu = parentUsers.find((u) => u.id === r.userId)
    return {
      userId: r.userId,
      name: pu?.name || '未命名家长',
      count: r._count._all,
      lastAt: r._max.createdAt,
    }
  })

  const summary = {
    today: todayCount,
    week: weekCount,
    month: monthCount,
    day30: day30Count,
    activeParents: new Set(records.map((r) => r.userId)).size,
  }

  return NextResponse.json({ summary, trend, ranking, parentTotal: parentIds.length })
})
