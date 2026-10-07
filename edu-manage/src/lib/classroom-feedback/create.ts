import type { Prisma } from '@prisma/client'
import { TEACHER_LOG_ACTIONS } from '@/lib/teacher-log-actions'

type FeedbackStudent = {
  id: string
  name: string
  parentId: string | null
  parentUserId: string | null
}

type CreateFeedbackInput = {
  data: Prisma.ClassroomFeedbackUncheckedCreateInput
  actorUserId: string
  teacherName: string
  students: FeedbackStudent[]
  knowledgePoints: string[]
  imageUrls: string[]
  status: 'PUBLISHED' | 'DRAFT'
  source: 'admin' | 'teacher'
  detailFallback: string
  notificationLabel?: string
  notificationContent: string
  metadata?: Record<string, string | number | boolean | null>
}

function isMissingFeedbackContextColumn(error: unknown) {
  const err = error as { code?: string; meta?: { column?: string }; message?: string }
  const text = `${err?.meta?.column || ''} ${err?.message || ''}`
  return err?.code === 'P2022' && /feedbackCourseType|feedbackGroupId|termId/.test(text)
}

async function createClassroomFeedbackCompat(
  tx: Prisma.TransactionClient,
  data: Prisma.ClassroomFeedbackUncheckedCreateInput,
) {
  try {
    return await tx.classroomFeedback.create({ data })
  } catch (error) {
    if (!isMissingFeedbackContextColumn(error)) throw error
    const legacyData = { ...data }
    delete legacyData.feedbackCourseType
    delete legacyData.feedbackGroupId
    delete legacyData.termId
    console.warn('[feedback] course context columns missing; creating legacy feedback without course context')
    return tx.classroomFeedback.create({ data: legacyData })
  }
}

/**
 * Authoritative persistence workflow for classroom feedback.
 *
 * Route handlers remain responsible for authentication and scope resolution;
 * this function keeps the database write, badge, notification and audit-log
 * side effects identical for teacher and administrator entry points.
 */
export async function createClassroomFeedbackWithSideEffects(
  tx: Prisma.TransactionClient,
  input: CreateFeedbackInput,
) {
  const created = await createClassroomFeedbackCompat(tx, input.data)
  const teacherId = input.data.teacherId
  const badge = typeof input.data.badge === 'string' ? input.data.badge : ''

  if (input.status === 'PUBLISHED' && badge) {
    for (const student of input.students) {
      await tx.achievementBadge.create({
        data: {
          studentId: student.id,
          teacherId,
          badgeType: badge,
          description: input.data.summary || input.data.overallComment || input.data.lessonContent || null,
        },
      })
    }
  }

  if (input.status === 'PUBLISHED') {
    for (const student of input.students) {
      const parentUserId = student.parentId || student.parentUserId
      if (!parentUserId) continue
      await tx.notification.create({
        data: {
          userId: parentUserId,
          type: 'CLASSROOM_FEEDBACK',
          title: `${input.teacherName}老师发布了${input.notificationLabel || '课堂反馈'}`,
          content: `${student.name}: ${input.notificationContent}`.slice(0, 80),
          link: '/parent/class-feedback',
          relatedType: 'CLASSROOM_FEEDBACK',
          relatedId: created.id,
          href: `/parent/class-feedback/${created.id}`,
        },
      })
    }
  }

  await tx.activityLog.create({
    data: {
      userId: input.actorUserId,
      teacherId,
      action: input.status === 'PUBLISHED'
        ? TEACHER_LOG_ACTIONS.CLASSROOM_FEEDBACK_PUBLISH
        : TEACHER_LOG_ACTIONS.CLASSROOM_FEEDBACK_DRAFT,
      detail: `${input.students.length}名学员 · ${input.knowledgePoints.join('/') || input.data.overallComment || input.data.lessonContent || input.detailFallback}`,
      entityType: 'ClassroomFeedback',
      entityId: created.id,
      metadata: {
        status: input.status,
        source: input.source,
        studentCount: input.students.length,
        imageCount: input.imageUrls.length,
        feedbackCourseType: input.data.feedbackCourseType || null,
        feedbackGroupId: input.data.feedbackGroupId || null,
        ...input.metadata,
      },
    },
  })

  return created
}
