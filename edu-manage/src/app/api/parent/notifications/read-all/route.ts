import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { parentVisibleNotificationWhere, visibleNotificationWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { notificationReadData, unreadNotificationWhere } from '@/lib/notification-read-state'
import { markFeedbackReadFromNotifications } from '@/lib/classroom-feedback/notification-read-sync'

export const PATCH = apiHandler(async () => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sessionUser = session.user as { id: string; role?: string }
  if (sessionUser.role !== 'parent') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
 
  const prisma = await getRequestPrisma()
  const userId = sessionUser.id
  const where = {
    userId,
    ...unreadNotificationWhere,
    ...visibleNotificationWhere,
    AND: [parentVisibleNotificationWhere(userId)],
  }

  const updatedCount = await prisma.$transaction(async (tx) => {
    const selectedNotifications = await tx.notification.findMany({
      where,
      select: { type: true, relatedType: true, relatedId: true },
    })
    const result = await tx.notification.updateMany({
      where,
      data: notificationReadData(),
    })
    if (result.count > 0) {
      await markFeedbackReadFromNotifications(tx, userId, selectedNotifications)
    }
    return result.count
  })

  const unreadCount = await prisma.notification.count({
    where: { userId, ...unreadNotificationWhere, ...visibleNotificationWhere, AND: [parentVisibleNotificationWhere(userId)] },
  })
  return NextResponse.json({ success: true, updatedCount, unreadCount }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
})
