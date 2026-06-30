import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { normalizeSchedulePeriods, SCHEDULE_PERIODS } from '@/lib/schedule-periods'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  const prisma = await getRequestPrisma()
  const config = await prisma.systemConfig.findUnique({ where: { id: 'singleton' }, select: { schedulePeriods: true } })
  return NextResponse.json({ periods: normalizeSchedulePeriods(config?.schedulePeriods ?? SCHEDULE_PERIODS) })
})

export const PUT = apiHandler(async (request: NextRequest) => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const body = await request.json().catch(() => ({})) as { periods?: unknown }
  if (!Array.isArray(body.periods) || body.periods.length === 0) {
    return NextResponse.json({ error: '请至少保留一个时间段' }, { status: 400 })
  }
  const periods = normalizeSchedulePeriods(body.periods)
  if (periods.length !== body.periods.length) {
    return NextResponse.json({ error: '存在名称、类型或起止时间无效的时间段' }, { status: 400 })
  }
  if (!periods.some(period => period.type === 'CLASS')) {
    return NextResponse.json({ error: '请至少保留一个上课节次' }, { status: 400 })
  }
  const hasOverlap = periods.some((period, index) => index > 0 && period.start < periods[index - 1].end)
  if (hasOverlap) return NextResponse.json({ error: '时间段不能重叠' }, { status: 400 })
  if (new Set(periods.map(period => period.id)).size !== periods.length) {
    return NextResponse.json({ error: '时间段标识不能重复' }, { status: 400 })
  }

  const prisma = await getRequestPrisma()
  await prisma.systemConfig.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', schedulePeriods: periods },
    update: { schedulePeriods: periods },
  })
  return NextResponse.json({ periods })
})
