import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { visibleNotificationWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { getLocalDayRange, todayLocal } from '@/lib/date/local-day'

export const GET = apiHandler(async () => {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }


  const prisma = await getRequestPrisma()
  const { start: todayStart, end: todayEnd } = getLocalDayRange(todayLocal())

  const [todaySent, totalSent, totalFailed] = await Promise.all([
    prisma.notification.count({
      where: { pushStatus: 'sent', createdAt: { gte: todayStart, lt: todayEnd }, ...visibleNotificationWhere },
    }),
    prisma.notification.count({ where: { pushStatus: 'sent', ...visibleNotificationWhere } }),
    prisma.notification.count({ where: { pushStatus: { in: ['failed', 'no_bind', 'limit_today'] }, ...visibleNotificationWhere } }),
  ])

  return NextResponse.json({ todaySent, totalSent, totalFailed })
})
