import { NextRequest, NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import {
  parentVisibleExamPaperWhere,
  parentVisibleNotificationWhere,
  parentVisiblePerformancePostWhere,
  visibleNotificationWhere,
} from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { notificationReadData, unreadNotificationWhere } from '@/lib/notification-read-state'
import { markFeedbackReadFromNotifications } from '@/lib/classroom-feedback/notification-read-sync'
import type { Prisma } from '@prisma/client'

export const POST = apiHandler(async (req: NextRequest) => {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sessionUser = session.user as { id: string; role?: string }
  if (sessionUser.role !== 'parent') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }
 
  const prisma = await getRequestPrisma()
  const userId = sessionUser.id

  const body = await req.json()
  const id = typeof body?.id === 'string' ? body.id.trim() : ''
  const all = body?.all === true
  const archived = body?.archived === true
  const notificationScope = archived
    ? { status: 'ARCHIVED' as const, deletedAt: null }
    : visibleNotificationWhere
  const parentNotificationScope = parentVisibleNotificationWhere(userId)
  const relatedTypes: string[] = []
  if (Array.isArray(body?.relatedTypes)) {
    const candidates: unknown[] = body.relatedTypes
    for (const value of candidates) {
      if (typeof value !== 'string') continue
      const relatedType = value.trim()
      if (relatedType && !relatedTypes.includes(relatedType)) relatedTypes.push(relatedType)
    }
  }

  let selectedWhere: Prisma.NotificationWhereInput
  if (all) {
    selectedWhere = { userId, ...unreadNotificationWhere, ...notificationScope, AND: [parentNotificationScope] }
  } else if (id) {
    selectedWhere = {
      // 单条已读同时支持历史归档页中的通知。
      id, userId, status: { in: ['ACTIVE', 'ARCHIVED'] }, deletedAt: null, ...unreadNotificationWhere,
      AND: [parentNotificationScope],
    }
  } else if (relatedTypes.length > 0) {
    // 按分类批量已读（如 feedback 类：课堂反馈/成长反馈/表现更新）
    selectedWhere = {
      userId,
      ...unreadNotificationWhere,
      ...notificationScope,
      AND: [
        parentNotificationScope,
        { OR: [
          { relatedType: { in: relatedTypes } },
          { relatedType: null, type: { in: relatedTypes } },
        ] },
      ],
    }
  } else {
    return NextResponse.json({ error: '缺少有效的已读操作目标' }, { status: 400 })
  }

  const updatedCount = await prisma.$transaction(async (tx) => {
    const selectedNotifications = await tx.notification.findMany({
      where: selectedWhere,
      select: { type: true, relatedType: true, relatedId: true },
    })
    const result = await tx.notification.updateMany({
      where: selectedWhere,
      data: notificationReadData(),
    })
    if (result.count > 0) {
      await markFeedbackReadFromNotifications(tx, userId, selectedNotifications)

      const relatedIdsByType = new Map<string, string[]>()
      for (const notification of selectedNotifications) {
        const relatedType = notification.relatedType || notification.type
        if (!notification.relatedId || !relatedType) continue
        const ids = relatedIdsByType.get(relatedType) || []
        if (!ids.includes(notification.relatedId)) ids.push(notification.relatedId)
        relatedIdsByType.set(relatedType, ids)
      }

      const performanceIds = [
        ...(relatedIdsByType.get('PERFORMANCE_FEEDBACK') || []),
        ...(relatedIdsByType.get('PERFORMANCE_UPDATE') || []),
      ]
      const paperIds = [
        ...(relatedIdsByType.get('EXAM_PAPER') || []),
        ...(relatedIdsByType.get('PAPER_PUBLISHED') || []),
      ]
      const messageIds = [
        ...(relatedIdsByType.get('PARENT_MESSAGE') || []),
        ...(relatedIdsByType.get('PARENT_MESSAGE_REPLY') || []),
      ]

      await Promise.all([
        performanceIds.length
          ? tx.performancePost.updateMany({
              where: {
                id: { in: performanceIds },
                isReadByParent: false,
                ...parentVisiblePerformancePostWhere(userId),
                visibility: { in: ['PARENT_ONLY', 'CLASS_PUBLIC'] },
              },
              data: { isReadByParent: true },
            })
          : Promise.resolve(null),
        paperIds.length
          ? tx.examPaper.updateMany({
              where: {
                id: { in: paperIds },
                isReadByParent: false,
                ...parentVisibleExamPaperWhere(userId),
              },
              data: { isReadByParent: true, readAt: new Date() },
            })
          : Promise.resolve(null),
        messageIds.length
          ? tx.parentMessageReply.updateMany({
              where: {
                isReadByParent: false,
                role: { not: 'parent' },
                message: { id: { in: messageIds }, parentId: userId },
              },
              data: { isReadByParent: true },
            })
          : Promise.resolve(null),
      ])
    }
    return result.count
  })

  // Return the authoritative active unread count. The client list is paginated,
  // so subtracting only the rows currently loaded leaves stale badges behind.
  const unreadCount = await prisma.notification.count({
    where: { userId, ...unreadNotificationWhere, ...visibleNotificationWhere, AND: [parentNotificationScope] },
  })

  return NextResponse.json({ success: true, updatedCount, unreadCount })
})
