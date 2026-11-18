import { NextResponse } from 'next/server'
import { getRequestPrisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-user'
import { parentLinkedStudentWhere, parentVisibleExamPaperWhere, parentVisiblePerformancePostWhere, visibleNotificationWhere } from '@/lib/business-visibility'
import { apiHandler } from '@/lib/api-handler'
import { summarizeParentMessageWorkflow } from '@/lib/parent-message-workflow'
import { unreadNotificationWhere } from '@/lib/notification-read-state'
import { standaloneParentNotificationWhere, sumParentUnreadItems } from '@/lib/parent-unread'

export const dynamic = 'force-dynamic'

export const GET = apiHandler(async () => {
  const user = await getCurrentUser()
  if (!user || user.role !== 'parent') {
    return NextResponse.json({ error: '无权限' }, { status: 403 })
  }


  const prisma = await getRequestPrisma()
  const activeStudentIds = (
    await prisma.student.findMany({
      where: parentLinkedStudentWhere(user.id),
      select: { id: true },
    })
  ).map(student => student.id)

  const [papers, posts, notifications, standaloneNotifications, feedbacks, studyHallHomework, messageRows, notificationByType] = await Promise.all([
    prisma.examPaper.count({
      where: {
        ...parentVisibleExamPaperWhere(user.id),
        isReadByParent: false,
      },
    }),
    prisma.performancePost.count({
      where: {
        ...parentVisiblePerformancePostWhere(user.id),
        isReadByParent: false,
        visibility: 'PARENT_ONLY',
      },
    }),
    prisma.notification.count({
      where: { userId: user.id, ...unreadNotificationWhere, ...visibleNotificationWhere },
    }),
    prisma.notification.count({
      where: {
        userId: user.id,
        ...unreadNotificationWhere,
        ...visibleNotificationWhere,
        ...standaloneParentNotificationWhere,
      },
    }),
    prisma.classroomFeedback.count({
      where: {
        status: 'PUBLISHED',
        parentReadAt: null,
        studentIds: { hasSome: activeStudentIds },
      },
    }),
    prisma.notification.count({
      where: {
        userId: user.id,
        ...unreadNotificationWhere,
        relatedType: 'STUDY_HALL_HOMEWORK',
        ...visibleNotificationWhere,
      },
    }),
    prisma.parentMessage.findMany({
      where: { parentId: user.id },
      select: {
        status: true,
        replies: {
          select: {
            role: true,
            createdAt: true,
            isReadByParent: true,
            isReadByTeacher: true,
          },
        },
      },
    }),
    prisma.notification.groupBy({
      by: ['relatedType'],
      where: { userId: user.id, ...unreadNotificationWhere, ...visibleNotificationWhere },
      _count: { _all: true },
    }),
  ])

  const messages = summarizeParentMessageWorkflow(messageRows).unreadForParent
  const total = sumParentUnreadItems({ papers, posts, notifications: standaloneNotifications, feedbacks, messages })

  // 未读通知按类型分组（key 为 relatedType 或 '__NONE__'，值为计数）
  const notificationsByType = Object.fromEntries(
    notificationByType.map((row) => [row.relatedType || '__NONE__', row._count._all]),
  )

  // studyHallHomework 是 notifications 的子集，保留单独字段供专题角标使用，但总数只计一次。
  return NextResponse.json({ papers, posts, notifications, standaloneNotifications, notificationsByType, feedbacks, studyHallHomework, messages, total }, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
})
