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

  const body = await req.json()
  const id = typeof body?.id === 'string' ? body.id.trim() : ''
  const all = body?.all === true
  const relatedTypes: string[] = []
  if (Array.isArray(body?.relatedTypes)) {
    const candidates: unknown[] = body.relatedTypes
    for (const value of candidates) {
      if (typeof value !== 'string') continue
      const relatedType = value.trim()
      if (relatedType && !relatedTypes.includes(relatedType)) relatedTypes.push(relatedType)
    }
  }

  if (all) {
    await prisma.notification.updateMany({
      where: { userId, ...unreadNotificationWhere, ...visibleNotificationWhere },
      data: notificationReadData(),
    })
  } else if (id) {
    await prisma.notification.updateMany({
      // 单条已读同时支持历史归档页中的通知。
      where: { id, userId, status: { in: ['ACTIVE', 'ARCHIVED'] }, deletedAt: null, ...unreadNotificationWhere },
      data: notificationReadData(),
    })
  } else if (relatedTypes.length > 0) {
    // 按分类批量已读（如 feedback 类：课堂反馈/成长反馈/表现更新）
    await prisma.notification.updateMany({
      where: {
        userId,
        ...unreadNotificationWhere,
        ...visibleNotificationWhere,
        OR: [
          { relatedType: { in: relatedTypes } },
          { relatedType: null, type: { in: relatedTypes } },
        ],
      },
      data: notificationReadData(),
    })
  } else {
    return NextResponse.json({ error: '缺少有效的已读操作目标' }, { status: 400 })
  }

  return NextResponse.json({ success: true })
})
