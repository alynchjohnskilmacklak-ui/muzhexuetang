import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
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
  const db = await getRequestPrisma()

  const notification = await db.notification.findFirst({
    where: { id, userId, ...visibleNotificationWhere },
  })

  if (!notification) redirect('/parent/notifications')

  const parentStudentIds = (
    await db.student.findMany({
      where: parentLinkedStudentWhere(userId),
      select: { id: true },
    })
  ).map((student) => student.id)

  // Mark as read on server side
  if (!notification.read) {
    await db.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    })
  }

  // If notification has a relatedType/relatedId, fetch the related data
  let relatedData: unknown = null
  if (notification.relatedType && notification.relatedId) {
    switch (notification.relatedType) {
      case 'CLASSROOM_FEEDBACK': {
        relatedData = await db.classroomFeedback.findFirst({
          where: { id: notification.relatedId, ...visibleClassroomFeedbackWhere, studentIds: { hasSome: parentStudentIds } },
          include: {
            teacher: { select: { id: true, name: true } },
            classLesson: { include: { group: { include: { course: true } } } },
          },
        })
        break
      }
      case 'PERFORMANCE_FEEDBACK': {
        relatedData = await db.performancePost.findFirst({
          where: { id: notification.relatedId, ...visiblePerformancePostWhere, studentId: { in: parentStudentIds } },
          include: {
            student: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } },
          },
        })
        break
      }
      case 'EXAM_PAPER': {
        relatedData = await db.examPaper.findFirst({
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

  return (
    <NotificationDetailClient
      notification={JSON.parse(JSON.stringify(notification))}
      relatedData={relatedData ? JSON.parse(JSON.stringify(relatedData)) : null}
    />
  )
}
