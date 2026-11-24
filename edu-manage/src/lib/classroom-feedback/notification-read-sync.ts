import type { Prisma } from '@prisma/client'
import { parentLinkedStudentWhere } from '@/lib/business-visibility'

type FeedbackNotificationReference = {
  type?: string | null
  relatedType?: string | null
  relatedId?: string | null
}

type FeedbackReadSyncDb = Pick<
  Prisma.TransactionClient,
  'student' | 'classroomFeedback' | 'feedbackParentReadReceipt'
>

export async function resetFeedbackReadReceiptsForParents(
  db: FeedbackReadSyncDb,
  feedbackId: string,
  parentUserIds: string[],
): Promise<void> {
  const uniqueParentIds = [...new Set(parentUserIds.filter(Boolean))]
  await Promise.all(uniqueParentIds.map((parentUserId) => db.feedbackParentReadReceipt.upsert({
    where: { feedbackId_parentUserId: { feedbackId, parentUserId } },
    create: { feedbackId, parentUserId, readAt: null },
    update: { readAt: null },
  })))
}

/**
 * Keep notification reads and the receipt-based classroom-feedback unread
 * count in sync. Only published feedback linked to this parent's active
 * student records can receive a read receipt.
 */
export async function markFeedbackReadFromNotifications(
  db: FeedbackReadSyncDb,
  parentUserId: string,
  notifications: FeedbackNotificationReference[],
  readAt = new Date(),
): Promise<number> {
  const feedbackIds = [...new Set(notifications
    .filter((item) => item.relatedType === 'CLASSROOM_FEEDBACK'
      || (!item.relatedType && item.type === 'CLASSROOM_FEEDBACK'))
    .map((item) => item.relatedId)
    .filter((id): id is string => typeof id === 'string' && id.length > 0))]
  if (feedbackIds.length === 0) return 0

  const students = await db.student.findMany({
    where: parentLinkedStudentWhere(parentUserId),
    select: { id: true },
  })
  const studentIds = students.map((student) => student.id)
  if (studentIds.length === 0) return 0

  const feedbacks = await db.classroomFeedback.findMany({
    where: {
      id: { in: feedbackIds },
      status: 'PUBLISHED',
      deletedAt: null,
      studentIds: { hasSome: studentIds },
    },
    select: { id: true },
  })

  await Promise.all(feedbacks.map((feedback) => db.feedbackParentReadReceipt.upsert({
    where: { feedbackId_parentUserId: { feedbackId: feedback.id, parentUserId } },
    create: { feedbackId: feedback.id, parentUserId, readAt },
    update: { readAt },
  })))

  return feedbacks.length
}
