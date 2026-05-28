import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { NotificationDetailClient } from './client'
import {
  parentLinkedStudentWhere,
  visibleClassroomFeedbackWhere,
  visibleNotificationWhere,
  visiblePerformancePostWhere,
} from '@/lib/business-visibility'

export const dynamic = 'force-dynamic'

export default async function NotificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id

  const notification = await prisma.notification.findFirst({
    where: { id, userId, ...visibleNotificationWhere },
  })

  if (!notification) redirect('/parent/notifications')

  const parentStudentIds = (
    await prisma.student.findMany({
      where: parentLinkedStudentWhere(userId),
      select: { id: true },
    })
  ).map((student) => student.id)

  // Mark as read on server side
  if (!notification.read) {
    await prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    })
  }

  // If notification has a relatedType/relatedId, fetch the related data
  let relatedData: unknown = null
  if (notification.relatedType && notification.relatedId) {
    switch (notification.relatedType) {
      case 'CLASSROOM_FEEDBACK': {
        relatedData = await prisma.classroomFeedback.findFirst({
          where: { id: notification.relatedId, ...visibleClassroomFeedbackWhere, studentIds: { hasSome: parentStudentIds } },
          include: {
            teacher: { select: { id: true, name: true } },
            classLesson: { include: { group: { include: { course: true } } } },
          },
        })
        break
      }
      case 'PERFORMANCE_FEEDBACK': {
        relatedData = await prisma.performancePost.findFirst({
          where: { id: notification.relatedId, ...visiblePerformancePostWhere, studentId: { in: parentStudentIds } },
          include: {
            student: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } },
          },
        })
        break
      }
      case 'EXAM_PAPER': {
        relatedData = await prisma.examPaper.findFirst({
          where: { id: notification.relatedId, status: 'PUBLISHED', studentId: { in: parentStudentIds } },
          include: {
            student: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } },
          },
        })
        break
      }
      default:
        break
    }
  }

  if (notification.relatedType && notification.relatedId && !relatedData) {
    notFound()
  }

  return (
    <NotificationDetailClient
      notification={JSON.parse(JSON.stringify(notification))}
      relatedData={JSON.parse(JSON.stringify(relatedData))}
    />
  )
}
