import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { visibleNotificationWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'

export const PATCH = apiHandler(async () => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 
  const prisma = await getRequestPrisma()
  const userId = (session.user as { id: string }).id

  await prisma.notification.updateMany({
    where: { userId, readAt: null, ...visibleNotificationWhere },
    data: { readAt: new Date(), read: true },
  })
  return NextResponse.json({ success: true })
})
