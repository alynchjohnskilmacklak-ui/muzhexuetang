import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { visibleNotificationWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { notificationReadData, unreadNotificationWhere } from '@/lib/notification-read-state'

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 
  const prisma = await getRequestPrisma()
  const userId = (session.user as { id: string }).id

  const { id, all, relatedTypes } = await req.json()

  if (all) {
    await prisma.notification.updateMany({
      where: { userId, ...unreadNotificationWhere, ...visibleNotificationWhere },
      data: notificationReadData(),
    })
  } else if (id) {
    await prisma.notification.updateMany({
      where: { id, userId, ...visibleNotificationWhere },
      data: notificationReadData(),
    })
  } else if (Array.isArray(relatedTypes) && relatedTypes.length > 0) {
    // 按分类批量已读（如 feedback 类：课堂反馈/成长反馈/表现更新）
    await prisma.notification.updateMany({
      where: { userId, relatedType: { in: relatedTypes }, ...unreadNotificationWhere, ...visibleNotificationWhere },
      data: notificationReadData(),
    })
  }

  return NextResponse.json({ success: true })
})
