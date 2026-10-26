import { auth } from '@/lib/auth'
import { getPrismaForDivision } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ClassFeedbackClient } from './client'
import { visibleClassroomFeedbackWhere, visibleTeacherWhere } from '@/lib/business-visibility'
import { PARENT_ACTIVE_CHILD_COOKIE } from '@/constants/membership'
import { getParentChildren, resolveParentChildSelection } from '@/lib/parent-children'
import { resolveFeedbackImageVariants, variantsForFeedback } from '@/lib/file-asset-variants'
import { redactFeedbackForParent } from '@/lib/classroom-feedback/access'
import { feedbackSubject } from '@/lib/classroom-feedback/subject'
import { parseStoredKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { signedFeedbackImageUrls } from '@/lib/classroom-feedback/signed-images'
import { resolveParentFeedbackReadAt } from '@/lib/classroom-feedback/read-state'
import { LearningRecordSwitcher } from '@/components/Parent/LearningRecordSwitcher'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

export default async function ClassFeedbackPage({ searchParams }: { searchParams?: Promise<{ childId?: string; studentId?: string; feedbackId?: string; page?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id
  const division = ((session.user as { division?: string }).division === 'SENIOR' ? 'SENIOR' : 'JUNIOR') as 'JUNIOR' | 'SENIOR'
  const prisma = getPrismaForDivision(division)
  const params = await searchParams
  const requestedChildId = params?.childId || params?.studentId || ''
  const feedbackId = params?.feedbackId || ''
  const requestedPage = Number(params?.page || '1')
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 1000) : 1
  const linkedChildren = await getParentChildren(prisma, userId)
  const storedChildId = (await cookies()).get(PARENT_ACTIVE_CHILD_COOKIE)?.value || ''
  const { selectedChild, invalidChild, studentIds: scopedStudentIds } = resolveParentChildSelection(
    linkedChildren,
    requestedChildId,
    storedChildId,
  )

  // If feedbackId is provided, fetch the specific feedback for auto-open
  const highlightedFeedback = feedbackId && scopedStudentIds.length > 0
    ? await prisma.classroomFeedback.findFirst({
      where: {
        id: feedbackId,
        ...visibleClassroomFeedbackWhere,
        studentIds: { hasSome: scopedStudentIds },
        teacher: visibleTeacherWhere,
      },
      include: {
        teacher: { select: { id: true, name: true, subjects: true } },
        term: { select: { name: true, status: true } },
        parentMessages: {
          where: { parentId: userId },
          include: { replies: { orderBy: { createdAt: 'asc' } } },
          take: 1,
        },
        classLesson: {
          include: {
            group: { include: { course: true, room: true, teacherAssignments: { select: { teacherId: true, subject: true } } } },
          },
        },
      },
      })
    : null

  const feedbackRows = await prisma.classroomFeedback.findMany({
    where: {
      ...visibleClassroomFeedbackWhere,
      studentIds: { hasSome: scopedStudentIds },
      teacher: visibleTeacherWhere,
    },
    include: {
      teacher: { select: { id: true, name: true, subjects: true } },
      term: { select: { name: true, status: true } },
      parentMessages: {
        where: { parentId: userId },
        include: { replies: { orderBy: { createdAt: 'asc' } } },
        take: 1,
      },
      classLesson: { include: { group: { include: { course: true, teacherAssignments: { select: { teacherId: true, subject: true } } } } } },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE + 1,
  })
  const hasMore = feedbackRows.length > PAGE_SIZE
  const feedbacks = feedbackRows.slice(0, PAGE_SIZE)
  const readStateFeedbackIds = [...new Set([...feedbacks, ...(highlightedFeedback ? [highlightedFeedback] : [])].map((feedback) => feedback.id))]
  const parentReadReceipts = readStateFeedbackIds.length
    ? await prisma.notification.findMany({
        where: { userId, relatedType: 'CLASSROOM_FEEDBACK', relatedId: { in: readStateFeedbackIds } },
        select: { relatedId: true, read: true, readAt: true, createdAt: true },
      })
    : []
  const readReceiptsByFeedback = new Map<string, typeof parentReadReceipts>()
  for (const receipt of parentReadReceipts) {
    if (!receipt.relatedId) continue
    const receipts = readReceiptsByFeedback.get(receipt.relatedId) || []
    receipts.push(receipt)
    readReceiptsByFeedback.set(receipt.relatedId, receipts)
  }

  const unlinkedGroupIds = [...new Set([...feedbacks, ...(highlightedFeedback ? [highlightedFeedback] : [])]
    .filter((feedback) => !feedback.classLesson && feedback.feedbackGroupId)
    .map((feedback) => feedback.feedbackGroupId!))]
  const unlinkedGroups = unlinkedGroupIds.length ? await prisma.classGroup.findMany({
    where: { id: { in: unlinkedGroupIds }, deletedAt: null },
    select: { id: true, course: { select: { subject: true } }, teacherAssignments: { select: { teacherId: true, subject: true } } },
  }) : []
  const groupById = new Map(unlinkedGroups.map((group) => [group.id, group]))
  const forParent = <T extends typeof feedbacks[number]>(feedback: T) => ({
    ...redactFeedbackForParent(feedback, scopedStudentIds),
    parentReadAt: resolveParentFeedbackReadAt(feedback.parentReadAt, readReceiptsByFeedback.get(feedback.id) || []),
    resolvedSubject: feedbackSubject(feedback.classLesson, feedback.teacherId,
      feedback.feedbackGroupId ? groupById.get(feedback.feedbackGroupId) : null,
      parseStoredKnowledgeCard(feedback.knowledgeCard)?.subject),
    knowledgeDetail: parseStoredKnowledgeCard(feedback.knowledgeCard),
  })
  const parentFeedbacks = feedbacks.map(forParent)
    .sort((left, right) => {
      const leftCurrent = left.term?.status === 'ACTIVE' ? 0 : 1
      const rightCurrent = right.term?.status === 'ACTIVE' ? 0 : 1
      return leftCurrent - rightCurrent || right.createdAt.getTime() - left.createdAt.getTime()
    })
  const parentHighlightedFeedback = highlightedFeedback
    ? forParent(highlightedFeedback)
    : null
  const allImageUrls = [...parentFeedbacks, ...(parentHighlightedFeedback ? [parentHighlightedFeedback] : [])]
    .flatMap((feedback) => feedback.imageUrls)
  const imageVariantMap = await resolveFeedbackImageVariants(prisma, allImageUrls)
  const priorityFeedbacks = [...parentFeedbacks.slice(0, 12), ...(parentHighlightedFeedback ? [parentHighlightedFeedback] : [])]
  const priorityThumbnailKeys = priorityFeedbacks.flatMap((feedback) =>
    variantsForFeedback(feedback.imageUrls, imageVariantMap)
      .map((image) => image.thumbnailUrl || image.previewUrl || image.originalUrl))
  const signedThumbnails = await signedFeedbackImageUrls(priorityThumbnailKeys)
  const withImages = <T extends { imageUrls: string[] }>(feedback: T) => {
    const images = variantsForFeedback(feedback.imageUrls, imageVariantMap)
    return {
      ...feedback,
      images,
      signedThumbnails: Object.fromEntries(images
        .map((image) => image.thumbnailUrl || image.previewUrl || image.originalUrl)
        .filter((key) => signedThumbnails[key])
        .map((key) => [key, signedThumbnails[key]])),
    }
  }

  return <div>
    <LearningRecordSwitcher />
    <ClassFeedbackClient
      feedbacks={JSON.parse(JSON.stringify(parentFeedbacks.map(withImages)))}
      highlightedFeedback={parentHighlightedFeedback ? JSON.parse(JSON.stringify(withImages(parentHighlightedFeedback))) : null}
      linkedChildren={linkedChildren.map(({ id, name, grade, membershipLevel }) => ({ id, name, grade, membershipLevel }))}
      activeChildId={requestedChildId === 'all' ? 'all' : selectedChild?.id || ''}
      invalidChild={invalidChild}
      page={page}
      hasMore={hasMore}
    />
  </div>
}
