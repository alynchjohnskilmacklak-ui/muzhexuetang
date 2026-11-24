import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { FeedbackDetailClient } from './client'
import { visibleClassroomFeedbackWhere, visibleTeacherWhere } from '@/lib/business-visibility'
import { PARENT_ACTIVE_CHILD_COOKIE } from '@/constants/membership'
import { getParentChildren, resolveParentChildSelection } from '@/lib/parent-children'
import { resolveFeedbackImageVariants, variantsForFeedback } from '@/lib/file-asset-variants'
import { redactFeedbackForParent } from '@/lib/classroom-feedback/access'
import { feedbackSubject } from '@/lib/classroom-feedback/subject'
import { parseStoredKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { signedFeedbackImageUrls } from '@/lib/classroom-feedback/signed-images'
import { getStudentFeedbackRating } from '@/lib/classroom-feedback/feedback-followup'
import { normalizeKnowledgeMasteryLevel, type KnowledgeProgressEntry } from '@/lib/classroom-feedback/knowledge-progress'
import { PICK_RESULT_LABELS, isPickResult } from '@/lib/classroom-interaction'
import { projectParentFeedbackReadState } from '@/lib/classroom-feedback/read-state'
import { annotateConsecutiveLessons } from '@/lib/classroom-feedback/feedback-session-grouping'

export const dynamic = 'force-dynamic'

export default async function FeedbackDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ childId?: string; studentId?: string }>
}) {
  const { id } = await params
  const query = await searchParams
  const session = await auth()
  if (!session?.user) {
    const queryString = query?.childId ? `?childId=${encodeURIComponent(query.childId)}` : ''
    const returnTo = `/parent/class-feedback/${encodeURIComponent(id)}${queryString}`
    redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`)
  }
  const userId = (session.user as { id: string }).id
  const [prisma, cookieStore] = await Promise.all([getRequestPrisma(), cookies()])
  const linkedChildren = await getParentChildren(prisma, userId)
  const requestedChildId = query?.childId || query?.studentId || ''
  const storedChildId = cookieStore.get(PARENT_ACTIVE_CHILD_COOKIE)?.value || ''
  const { selectedChild, invalidChild, studentIds: scopedStudentIds } = resolveParentChildSelection(
    linkedChildren,
    requestedChildId,
    storedChildId,
  )
  if (invalidChild) notFound()

  const manualRecipientReceipt = await prisma.feedbackParentReadReceipt.findUnique({
    where: { feedbackId_parentUserId: { feedbackId: id, parentUserId: userId } },
    select: { feedbackId: true, readAt: true, createdAt: true },
  })
  const feedbackAccessScopes = [
    ...(scopedStudentIds.length ? [{ studentIds: { hasSome: scopedStudentIds } }] : []),
    ...(manualRecipientReceipt ? [{ isSingleSession: true, studentIds: { isEmpty: true } }] : []),
  ]

  const feedback = await prisma.classroomFeedback.findFirst({
    where: {
      id,
      ...visibleClassroomFeedbackWhere,
      OR: feedbackAccessScopes,
      teacher: visibleTeacherWhere,
    },
    include: {
      teacher: {
        select: {
          id: true, name: true, subjects: true, avatar: true, gender: true,
          tierLevel: true, bio: true, university: true, major: true,
        },
      },
      classLesson: {
        include: {
          group: { include: { course: true, room: true, teacherAssignments: { select: { teacherId: true, subject: true } } } },
        },
      },
    },
  })

  if (!feedback) notFound()

  const manualDirectFeedback = Boolean(
    manualRecipientReceipt && feedback.isSingleSession && feedback.studentIds.length === 0,
  )
  const matchingChildren = linkedChildren.filter((child) =>
    child.recordIds.some((recordId) => feedback.studentIds.includes(recordId)),
  )
  const feedbackStudentScope = manualDirectFeedback
    ? ['__single_session_manual__']
    : selectedChild
      ? selectedChild.recordIds
      : matchingChildren.length === 1
        ? matchingChildren[0].recordIds
        : scopedStudentIds
  const matchedFeedbackStudentIds = feedback.studentIds.filter((studentId) => feedbackStudentScope.includes(studentId))
  const selectedStudentId = matchedFeedbackStudentIds.length === 1 ? matchedFeedbackStudentIds[0] : null
  const redactedFeedback = redactFeedbackForParent(feedback, feedbackStudentScope)
  // With an "all children" view, never attach the first child's rating to a multi-child group feedback.
  const visibleParentFeedback = manualDirectFeedback || selectedChild || matchingChildren.length === 1
    ? redactedFeedback
    : { ...redactedFeedback, studentRating: null }
  const parentFeedback = projectParentFeedbackReadState(
    visibleParentFeedback,
    manualRecipientReceipt
      ? [{
          read: manualRecipientReceipt.readAt !== null,
          readAt: manualRecipientReceipt.readAt,
          createdAt: manualRecipientReceipt.createdAt,
        }]
      : [],
  )
  const lessonId = feedback.classLesson?.id || feedback.classLessonId || null
  const targetStudentIds = selectedStudentId
    ? [selectedStudentId]
    : matchedFeedbackStudentIds.length > 0
      ? matchedFeedbackStudentIds
      : selectedChild
        ? [selectedChild.id]
        : []
  const picksPromise = lessonId && targetStudentIds.length > 0
    ? prisma.classroomPick.findMany({
        where: {
          lessonId,
          studentId: targetStudentIds.length === 1 ? targetStudentIds[0] : { in: targetStudentIds },
          parentVisible: true,
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true, result: true, comment: true, questionLabel: true, createdAt: true },
      })
    : Promise.resolve([])
  const unlinkedGroupPromise = !feedback.classLesson && feedback.feedbackGroupId
    ? prisma.classGroup.findFirst({
        where: { id: feedback.feedbackGroupId, deletedAt: null },
        select: { course: { select: { subject: true } }, teacherAssignments: { select: { teacherId: true, subject: true } } },
      })
    : Promise.resolve(null)
  const consecutiveSessionPromise = feedback.classLesson?.groupId && feedback.classLesson?.lessonDate
    ? prisma.classLesson.findMany({
        where: {
          groupId: feedback.classLesson.groupId,
          lessonDate: feedback.classLesson.lessonDate,
          deletedAt: null,
        },
        orderBy: { startTime: 'asc' },
        select: {
          id: true,
          groupId: true,
          lessonDate: true,
          startTime: true,
          endTime: true,
          teacherId: true,
          subject: true,
          group: { select: { course: { select: { subject: true } } } },
        },
      })
    : Promise.resolve([])
  const [classroomPicks, unlinkedGroup, imageVariantMap, consecutiveLessons] = await Promise.all([
    picksPromise,
    unlinkedGroupPromise,
    resolveFeedbackImageVariants(prisma, parentFeedback.imageUrls),
    consecutiveSessionPromise,
  ])
  let consecutiveSessionLabel: string | null = null
  if (feedback.classLesson?.id && consecutiveLessons.length > 1) {
    const consecutiveMap = annotateConsecutiveLessons(consecutiveLessons.map((l) => ({
      id: l.id,
      groupId: l.groupId,
      lessonDate: l.lessonDate?.toISOString().slice(0, 10),
      startTime: l.startTime,
      endTime: l.endTime,
      teacherId: l.teacherId,
      subject: l.subject || l.group?.course?.subject || null,
    })))
    const meta = consecutiveMap.get(feedback.classLesson.id)
    if (meta?.isConsecutive) {
      consecutiveSessionLabel = `连堂大课 ${meta.totalInSession}课时 · ${meta.sessionSpan}`
    }
  }
  // 家长端展示有作答评语或作答结果的随堂提问互动
  const visiblePicks = classroomPicks.filter(
    (pick) =>
      pick.result === 'CORRECT' ||
      pick.result === 'PARTIAL' ||
      pick.result === 'NEEDS_WORK' ||
      Boolean(pick.comment?.trim()),
  )
  const interaction = visiblePicks.length
    ? {
        pickCount: visiblePicks.length,
        correctCount: visiblePicks.filter((pick) => pick.result === 'CORRECT').length,
        partialCount: visiblePicks.filter((pick) => pick.result === 'PARTIAL').length,
        needsWorkCount: visiblePicks.filter((pick) => pick.result === 'NEEDS_WORK').length,
        items: visiblePicks.map((pick) => {
          const tags = (pick.comment ?? '')
            .split(/[、\n]/)
            .map((item) => item.trim())
            .filter(Boolean)
          return {
            id: pick.id,
            result: pick.result,
            resultLabel: pick.result && isPickResult(pick.result)
              ? PICK_RESULT_LABELS[pick.result as keyof typeof PICK_RESULT_LABELS] ?? ''
              : pick.result || '',
            comment: pick.comment,
            tags,
            questionLabel: pick.questionLabel,
            createdAt: pick.createdAt.toISOString(),
          }
        }),
      }
    : null
  const currentKnowledgeCard = parseStoredKnowledgeCard(feedback.knowledgeCard)
  const currentSubject = feedbackSubject(
    feedback.classLesson,
    feedback.teacherId,
    unlinkedGroup,
    currentKnowledgeCard?.subject,
    feedback.subjectSnapshot,
  )
  const currentGroupId = feedback.classLesson?.groupId || feedback.feedbackGroupId
  const mayShowSelectedChild = Boolean(selectedChild || matchingChildren.length === 1)
  const trendStudentId = mayShowSelectedChild ? selectedStudentId : null
  const historyScope = currentGroupId
    ? {
        OR: [
          { id: feedback.id },
          { feedbackGroupId: currentGroupId },
          { classLesson: { is: { groupId: currentGroupId } } },
        ],
      }
    : feedback.isSingleSession && currentSubject
      ? { isSingleSession: true, subjectSnapshot: currentSubject }
      : { id: feedback.id }
  const historyRowsPromise = trendStudentId
    ? prisma.classroomFeedback.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
          createdAt: { lte: feedback.createdAt },
          studentIds: { hasSome: feedbackStudentScope },
          ...historyScope,
        },
        select: {
          id: true,
          teacherId: true,
          studentIds: true,
          studentRatings: true,
          knowledgePoints: true,
          knowledgeCard: true,
          createdAt: true,
          sessionDate: true,
          isSingleSession: true,
          subjectSnapshot: true,
          feedbackGroupId: true,
          classLesson: {
            select: {
              lessonDate: true,
              subject: true,
              group: {
                select: {
                  course: { select: { subject: true } },
                  teacherAssignments: { select: { teacherId: true, subject: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
    : Promise.resolve([])
  const images = variantsForFeedback(parentFeedback.imageUrls, imageVariantMap)
  const thumbnailKeys = [...new Set(images.map((image) => image.thumbnailUrl || image.previewUrl || image.originalUrl))]
  const [historyRows, signedThumbnails] = await Promise.all([
    historyRowsPromise,
    signedFeedbackImageUrls(thumbnailKeys),
  ])
  const knowledgeProgressEntries: KnowledgeProgressEntry[] = historyRows.flatMap((row) => {
    const rowStudentId = row.studentIds.find((studentId) => feedbackStudentScope.includes(studentId))
    if (!rowStudentId) return []
    const rating = getStudentFeedbackRating(row.studentRatings, rowStudentId, row.studentIds)
    const masteryLevel = normalizeKnowledgeMasteryLevel(rating?.masteryLevel)
    if (!masteryLevel) return []

    const card = parseStoredKnowledgeCard(row.knowledgeCard)
    const subject = feedbackSubject(
      row.classLesson,
      row.teacherId,
      row.feedbackGroupId === currentGroupId ? unlinkedGroup : null,
      card?.subject,
      row.subjectSnapshot,
    )
    if (!currentSubject || subject !== currentSubject) return []

    const topic = row.knowledgePoints.find((point) => point.trim())?.trim() || card?.topic || ''
    if (!topic) return []
    return [{
      feedbackId: row.id,
      date: (row.classLesson?.lessonDate || row.sessionDate || row.createdAt).toISOString(),
      topic,
      masteryLevel,
    }]
  })
  const feedbackWithImages = {
    ...parentFeedback,
    consecutiveSessionLabel,
    selectedStudentId,
    displayStudentName: manualDirectFeedback
      ? feedback.studentNameSnapshot
      : selectedChild?.name || (matchingChildren.length === 1 ? matchingChildren[0].name : null),
    resolvedSubject: currentSubject,
    knowledgeProgressEntries,
    interaction,
    images,
    signedThumbnails,
  }

  return <FeedbackDetailClient feedback={JSON.parse(JSON.stringify(feedbackWithImages))} />
}
