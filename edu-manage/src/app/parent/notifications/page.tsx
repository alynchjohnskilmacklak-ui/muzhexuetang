import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentNotificationsClient } from './client'
import {
  visibleNotificationWhere,
} from '@/lib/business-visibility'

export const dynamic = 'force-dynamic'

export default async function ParentNotificationsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id

  const notifications = await prisma.notification.findMany({
    where: { userId, ...visibleNotificationWhere },
    orderBy: { createdAt: 'desc' },
    take: 150,
  })

  const filteredNotifications = notifications.slice(0, 100)

  // Mark all as read counter
  const unreadCount = filteredNotifications.filter(n => !n.read).length

  return (
    <ParentNotificationsClient
      notifications={JSON.parse(JSON.stringify(filteredNotifications))}
      unreadCount={unreadCount}
      userId={userId}
    />
  )
}
