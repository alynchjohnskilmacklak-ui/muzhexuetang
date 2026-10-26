import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { visibleNotificationWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { notificationReadData } from '@/lib/notification-read-state'

export const PATCH = apiHandler(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const prisma = await getRequestPrisma()
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = (session.user as { id: string }).id

  const notification = await prisma.notification.findFirst({
    where: { id, userId, ...visibleNotificationWhere },
  })
  if (!notification) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await prisma.notification.update({
    where: { id },
    data: notificationReadData(),
  })
  return NextResponse.json({ success: true })
})
