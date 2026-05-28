import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentNotificationsClient } from './client'
import {
  parentLinkedStudentWhere,
  visibleClassroomFeedbackWhere,
  visibleNotificationWhere,
  visiblePerformancePostWhere,
} from '@/lib/business-visibility'

export const dynamic = 'force-dynamic'

export default async function ParentNotificationsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id

  const notifications = await prisma.notification.findMany({
    where: { userId, ...visibleNotificationWhere },
    orderBy: { createdAt: 'desc' },
    take: 150,
  })

  const parentStudentIds = (
    await prisma.student.findMany({
      where: parentLinkedStudentWhere(userId),
      select: { id: true },
    })
  ).map((student) => student.id)

  const examPaperIds = notifications
    .filter((notification) => notification.relatedType === 'EXAM_PAPER' && notification.relatedId)
    .map((notification) => notification.relatedId!)
  const performancePostIds = notifications
    .filter((notification) => notification.relatedType === 'PERFORMANCE_FEEDBACK' && notification.relatedId)
    .map((notification) => notification.relatedId!)
  const classroomFeedbackIds = notifications
    .filter((notification) => notification.relatedType === 'CLASSROOM_FEEDBACK' && notification.relatedId)
    .map((notification) => notification.relatedId!)

  const [visiblePapers, visiblePosts, visibleFeedbacks] = await Promise.all([
    examPaperIds.length
      ? prisma.examPaper.findMany({
        where: { id: { in: examPaperIds }, status: 'PUBLISHED', studentId: { in: parentStudentIds } },
        select: { id: true },
      })
      : [],
    performancePostIds.length
      ? prisma.performancePost.findMany({
        where: { id: { in: performancePostIds }, ...visiblePerformancePostWhere, studentId: { in: parentStudentIds } },
        select: { id: true },
      })
      : [],
    classroomFeedbackIds.length
      ? prisma.classroomFeedback.findMany({
        where: { id: { in: classroomFeedbackIds }, ...visibleClassroomFeedbackWhere, studentIds: { hasSome: parentStudentIds } },
        select: { id: true },
      })
      : [],
  ])

  const visibleRelatedIds = {
    EXAM_PAPER: new Set(visiblePapers.map((item) => item.id)),
    PERFORMANCE_FEEDBACK: new Set(visiblePosts.map((item) => item.id)),
    CLASSROOM_FEEDBACK: new Set(visibleFeedbacks.map((item) => item.id)),
  }

  const filteredNotifications = notifications.filter((notification) => {
    if (!notification.relatedType || !notification.relatedId) return true
    const idSet = visibleRelatedIds[notification.relatedType as keyof typeof visibleRelatedIds]
    return idSet ? idSet.has(notification.relatedId) : true
  }).slice(0, 100)

  // Mark all as read counter
  const unreadCount = filteredNotifications.filter(n => !n.read).length

  return (
    <ParentNotificationsClient
      notifications={JSON.parse(JSON.stringify(filteredNotifications))}
      unreadCount={unreadCount}
      userId={userId}
    />
  )
}
