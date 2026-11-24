import { NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import {
  parentLinkedStudentWhere,
  parentVisibleNotificationWhere,
  parentVisibleExamPaperWhere,
  parentVisiblePerformancePostWhere,
  visibleNotificationWhere,
} from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { notificationReadData, unreadNotificationWhere } from '@/lib/notification-read-state'
import { parentUnreadClassroomFeedbackWhere } from '@/lib/parent-unread'

export const dynamic = 'force-dynamic'

export const POST = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'parent') return NextResponse.json({ error: '无权限' }, { status: 403 })

  const prisma = await getRequestPrisma()
  const studentIds = (await prisma.student.findMany({
    where: parentLinkedStudentWhere(user.id),
    select: { id: true },
  })).map((student) => student.id)
  const unreadFeedbackIds = studentIds.length
    ? (await prisma.classroomFeedback.findMany({
        where: parentUnreadClassroomFeedbackWhere(user.id, studentIds),
        select: { id: true },
      })).map((feedback) => feedback.id)
    : []
  const now = new Date()

  const updated = await prisma.$transaction(async (tx) => {
    const [papers, posts, notifications, messages] = await Promise.all([
      tx.examPaper.updateMany({
        where: { ...parentVisibleExamPaperWhere(user.id), isReadByParent: false },
        data: { isReadByParent: true, readAt: now },
      }),
      tx.performancePost.updateMany({
        where: {
          ...parentVisiblePerformancePostWhere(user.id),
          isReadByParent: false,
          visibility: { in: ['PARENT_ONLY', 'CLASS_PUBLIC'] },
        },
        data: { isReadByParent: true },
      }),
      tx.notification.updateMany({
        where: {
          userId: user.id,
          ...unreadNotificationWhere,
          ...visibleNotificationWhere,
          AND: [parentVisibleNotificationWhere(user.id)],
        },
        data: notificationReadData(),
      }),
      tx.parentMessageReply.updateMany({
        where: {
          isReadByParent: false,
          role: { not: 'parent' },
          message: { parentId: user.id },
        },
        data: { isReadByParent: true },
      }),
    ])

    if (unreadFeedbackIds.length) {
      await tx.feedbackParentReadReceipt.createMany({
        data: unreadFeedbackIds.map((feedbackId) => ({ feedbackId, parentUserId: user.id, readAt: now })),
        skipDuplicates: true,
      })
      await tx.feedbackParentReadReceipt.updateMany({
        where: { parentUserId: user.id, feedbackId: { in: unreadFeedbackIds }, readAt: null },
        data: { readAt: now },
      })
    }

    return {
      papers: papers.count,
      posts: posts.count,
      notifications: notifications.count,
      feedbacks: unreadFeedbackIds.length,
      messages: messages.count,
    }
  })

  return NextResponse.json({ success: true, updated }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
})
