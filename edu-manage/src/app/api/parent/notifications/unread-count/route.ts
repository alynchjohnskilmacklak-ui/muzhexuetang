import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { visibleNotificationWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'

export const GET = apiHandler(async () => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const count = await prisma.notification.count({
    where: { userId, readAt: null, ...visibleNotificationWhere },
  })
  return NextResponse.json({ count })
})
