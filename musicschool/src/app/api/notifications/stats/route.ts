import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { visibleNotificationWhere } from '@/lib/business-visibility'

export async function GET() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [todaySent, totalSent, totalFailed] = await Promise.all([
    prisma.notification.count({
      where: { pushStatus: 'sent', createdAt: { gte: today }, ...visibleNotificationWhere },
    }),
    prisma.notification.count({ where: { pushStatus: 'sent', ...visibleNotificationWhere } }),
    prisma.notification.count({ where: { pushStatus: 'failed', ...visibleNotificationWhere } }),
  ])

  return NextResponse.json({ todaySent, totalSent, totalFailed })
}
