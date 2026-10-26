import { NextRequest, NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api-handler'
import { getCurrentUser } from '@/lib/get-user'
import { getRequestPrisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async (request: NextRequest) => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const prisma = await getRequestPrisma()
  const limitValue = Number(request.nextUrl.searchParams.get('limit') || 50)
  const take = Number.isFinite(limitValue) ? Math.min(100, Math.max(1, Math.trunc(limitValue))) : 50
  const events = await prisma.courseChangeEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take,
  })
  const eventIds = events.map((event) => event.id)
  const notifications = eventIds.length
    ? await prisma.notification.findMany({
        where: { relatedType: 'COURSE_CHANGE_EVENT', relatedId: { in: eventIds } },
        select: { relatedId: true, userId: true, pushStatus: true, pushError: true, sentAt: true, read: true },
      })
    : []
  const notificationsByEvent = new Map<string, typeof notifications>()
  for (const notification of notifications) {
    if (!notification.relatedId) continue
    const current = notificationsByEvent.get(notification.relatedId) || []
    current.push(notification)
    notificationsByEvent.set(notification.relatedId, current)
  }

  return NextResponse.json({
    events: events.map((event) => {
      const rows = notificationsByEvent.get(event.id) || []
      const pushStatusCounts = rows.reduce<Record<string, number>>((counts, row) => {
        const status = row.pushStatus || 'none'
        counts[status] = (counts[status] || 0) + 1
        return counts
      }, {})
      return {
        ...event,
        delivery: {
          expectedInApp: event.notificationCount,
          createdInApp: rows.length,
          pushStatusCounts,
          failed: rows.filter((row) => row.pushError || row.pushStatus === 'failed').map((row) => ({ userId: row.userId, error: row.pushError })),
          readCount: rows.filter((row) => row.read).length,
        },
      }
    }),
  }, { headers: { 'Cache-Control': 'private, no-store' } })
})
