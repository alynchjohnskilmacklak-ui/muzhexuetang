import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { NotificationDetailClient } from './client'
import {
  parentLinkedStudentWhere,
  parentVisibleNotificationWhere,
  visibleClassroomFeedbackWhere,
  visiblePerformancePostWhere,
} from '@/lib/business-visibility'
import { redactFeedbackForParent } from '@/lib/classroom-feedback/access'

export const dynamic = 'force-dynamic'

export default async function NotificationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id
  if ((session.user as { role?: string }).role !== 'parent') redirect('/parent/notifications')
  const db = await getRequestPrisma()

  const notification = await db.notification.findFirst({
    where: {
      id,
      userId,
      status: { in: ['ACTIVE', 'ARCHIVED'] },
      deletedAt: null,
      AND: [parentVisibleNotificationWhere(userId)],
    },
    select: {
      id: true,
      userId: true,
      type: true,
      title: true,
      content: true,
      relatedType: true,
      relatedId: true,
      href: true,
      link: true,
      read: true,
      readAt: true,
      createdAt: true,
    },
  })

  if (!notification) redirect('/parent/notifications')

  const parentStudentIds = (
    await db.student.findMany({
      where: parentLinkedStudentWhere(userId),
      select: { id: true },
    })
  ).map((student) => student.id)

  // If notification has a relatedType/relatedId, fetch the related data
  let relatedData: unknown = null
  const sourceBackedTypes = new Set([
    'CLASSROOM_FEEDBACK',
    'PERFORMANCE_FEEDBACK',
    'PERFORMANCE_UPDATE',
    'EXAM_PAPER',
    'PAPER_PUBLISHED',
  ])
  const relatedType = notification.relatedType || (sourceBackedTypes.has(notification.type) ? notification.type : null)
  let relatedReadSource: 'feedback' | 'performance' | 'paper' | null = null
  if (relatedType && notification.relatedId) {
    switch (relatedType) {
      case 'CLASSROOM_FEEDBACK': {
        const feedback = await db.classroomFeedback.findFirst({
          where: { id: notification.relatedId, ...visibleClassroomFeedbackWhere, studentIds: { hasSome: parentStudentIds } },
          include: {
            teacher: { select: { id: true, name: true } },
            classLesson: { include: { group: { include: { course: true } } } },
          },
        })
        if (feedback) {
          relatedData = redactFeedbackForParent(feedback, parentStudentIds)
          relatedReadSource = 'feedback'
        }
        break
      }
      case 'PERFORMANCE_FEEDBACK':
      case 'PERFORMANCE_UPDATE': {
        const post = await db.performancePost.findFirst({
          where: {
            id: notification.relatedId,
            ...visiblePerformancePostWhere,
            studentId: { in: parentStudentIds },
            visibility: { in: ['PARENT_ONLY', 'CLASS_PUBLIC'] },
          },
          include: {
            student: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } },
          },
        })
        relatedData = post
        if (post) relatedReadSource = 'performance'
        break
      }
      case 'EXAM_PAPER':
      case 'PAPER_PUBLISHED': {
        const paper = await db.examPaper.findFirst({
          where: { id: notification.relatedId, status: 'PUBLISHED', deletedAt: null, studentId: { in: parentStudentIds } },
          include: {
            student: { select: { id: true, name: true } },
            teacher: { select: { id: true, name: true } },
          },
        })
        relatedData = paper
        if (paper) relatedReadSource = 'paper'
        break
      }
      default:
        break
    }
  }

  const readAt = new Date()
  await db.$transaction(async (tx) => {
    if (!notification.read) {
      await tx.notification.updateMany({
        where: {
          id: notification.id,
          userId,
          status: { in: ['ACTIVE', 'ARCHIVED'] },
          deletedAt: null,
          read: false,
          AND: [parentVisibleNotificationWhere(userId)],
        },
        data: { read: true, readAt },
      })
    }

    if (!notification.relatedId || !relatedReadSource) return
    if (relatedReadSource === 'feedback') {
      await tx.feedbackParentReadReceipt.upsert({
        where: { feedbackId_parentUserId: { feedbackId: notification.relatedId, parentUserId: userId } },
        create: { feedbackId: notification.relatedId, parentUserId: userId, readAt },
        update: { readAt },
      })
    } else if (relatedReadSource === 'performance') {
      await tx.performancePost.updateMany({
        where: {
          id: notification.relatedId,
          studentId: { in: parentStudentIds },
          ...visiblePerformancePostWhere,
          visibility: { in: ['PARENT_ONLY', 'CLASS_PUBLIC'] },
        },
        data: { isReadByParent: true },
      })
    } else {
      await tx.examPaper.updateMany({
        where: { id: notification.relatedId, studentId: { in: parentStudentIds }, status: 'PUBLISHED', deletedAt: null },
        data: { isReadByParent: true, readAt },
      })
    }
  })

  const clientNotification = {
    type: notification.type,
    title: notification.title,
    content: notification.content,
    createdAt: notification.createdAt,
    readAt: notification.readAt || (!notification.read ? readAt : null),
    relatedType: relatedType === 'PAPER_PUBLISHED' ? 'EXAM_PAPER' : relatedType,
    relatedId: notification.relatedId,
    href: notification.href || notification.link,
  }

  return (
    <NotificationDetailClient
      notification={JSON.parse(JSON.stringify(clientNotification))}
      relatedData={relatedData ? JSON.parse(JSON.stringify(relatedData)) : null}
    />
  )
}
