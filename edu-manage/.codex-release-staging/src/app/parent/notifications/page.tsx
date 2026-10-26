import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
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
  const db = await getRequestPrisma()

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({
      where: { userId, ...visibleNotificationWhere },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    db.notification.count({
      where: { userId, read: false, ...visibleNotificationWhere },
    }),
  ])

  return (
    <ParentNotificationsClient
      notifications={JSON.parse(JSON.stringify(notifications))}
      unreadCount={unreadCount}
      userId={userId}
    />
  )
}
