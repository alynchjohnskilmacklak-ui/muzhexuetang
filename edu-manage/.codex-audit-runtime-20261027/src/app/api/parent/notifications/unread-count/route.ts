import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { visibleNotificationWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { unreadNotificationWhere } from '@/lib/notification-read-state'

export const GET = apiHandler(async () => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 
  const prisma = await getRequestPrisma()
  const userId = (session.user as { id: string }).id

  const count = await prisma.notification.count({
    where: { userId, ...unreadNotificationWhere, ...visibleNotificationWhere },
  })
  return NextResponse.json({ count })
})
