import type { Prisma } from '@prisma/client'
import { TEACHER_LOG_ACTIONS } from '@/lib/teacher-log-actions'
import { groupFeedbackNotificationRecipients } from './notifications'
import { createNotification } from '@/lib/notifications'
import { qywxEnabled } from '@/lib/qywx'
import { getParentFeedbackDisplaySections } from './parent-feedback-content'

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
  manualRecipient?: { parentUserId: string; studentName: string }
  metadata?: Record<string, string | number | boolean | null>
  additionalLessonIds?: string[]
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

  // For multi-period / consecutive class sessions (连堂小课), automatically mirror the feedback
  // to sister small lessons so that the entire block is recorded as completed without
  // spamming duplicate push notifications or creating duplicate badges.
  if (input.additionalLessonIds && input.additionalLessonIds.length > 0) {
    for (const sisterLessonId of input.additionalLessonIds) {
      if (sisterLessonId && sisterLessonId !== input.data.classLessonId) {
        await createClassroomFeedbackCompat(tx, {
          ...input.data,
          classLessonId: sisterLessonId,
          notifySent: true,
        })
      }
    }
  }

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
    const groupedRecipients = groupFeedbackNotificationRecipients(input.students)
    const recipientMap = new Map<string, { studentIds: string[]; studentNames: string[] }>()
    for (const recipient of groupedRecipients) {
      recipientMap.set(recipient.parentUserId, {
        studentIds: recipient.students.map((student) => student.id),
        studentNames: recipient.students.map((student) => student.name),
      })
    }
    if (input.manualRecipient) {
      const current = recipientMap.get(input.manualRecipient.parentUserId) || { studentIds: [], studentNames: [] }
      current.studentNames.push(input.manualRecipient.studentName)
      recipientMap.set(input.manualRecipient.parentUserId, current)
    }
    const recipients = [...recipientMap.entries()].map(([parentUserId, value]) => ({ parentUserId, ...value }))
    if (recipients.length) {
      await tx.feedbackParentReadReceipt.createMany({
        data: recipients.map(({ parentUserId }) => ({
          feedbackId: created.id,
          parentUserId,
        })),
        skipDuplicates: true,
      })
    }
    for (const { parentUserId, studentIds, studentNames } of recipients) {
      const parentSafeContent = studentNames.map((studentName) => {
        const content = getParentFeedbackDisplaySections({
          lessonContent: input.data.lessonContent,
          overallComment: input.data.overallComment,
          summary: input.data.summary,
          knowledgePoints: input.knowledgePoints,
          homework: input.data.homework,
          tags: input.data.tags,
          studentName,
        }).map((section) => section.content).join(' ').replace(/\s+/g, ' ').trim()
        return `${studentName}：${content || '老师已发布课堂反馈，请点击查看详情。'}`
      }).join('；')
      await createNotification(tx, {
        userId: parentUserId,
        type: 'CLASSROOM_FEEDBACK',
        title: `${input.teacherName}老师发布了${input.notificationLabel || (input.data.isSingleSession ? '单次课程反馈' : '课堂反馈')}`,
        content: parentSafeContent.slice(0, 300),
        studentId: studentIds.length === 1 ? studentIds[0] : null,
        pushStatus: qywxEnabled() ? 'queued' : 'none',
        link: '/parent/class-feedback',
        relatedType: 'CLASSROOM_FEEDBACK',
        relatedId: created.id,
        href: `/parent/class-feedback/${created.id}${studentIds.length === 1 ? `?childId=${encodeURIComponent(studentIds[0])}` : ''}`,
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
      detail: `${input.data.studentNameSnapshot ? `${input.data.studentNameSnapshot} · 单次反馈` : `${input.students.length}名学员`} · ${input.knowledgePoints.join('/') || input.data.overallComment || input.data.lessonContent || input.detailFallback}`,
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
