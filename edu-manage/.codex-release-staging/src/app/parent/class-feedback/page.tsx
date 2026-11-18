import { auth } from '@/lib/auth'
import { getPrismaForDivision } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ClassFeedbackClient } from './client'
import { parentLinkedStudentWhere, visibleClassroomFeedbackWhere, visibleTeacherWhere } from '@/lib/business-visibility'
import { resolveFeedbackImageVariants, variantsForFeedback } from '@/lib/file-asset-variants'
import { redactFeedbackForParent } from '@/lib/classroom-feedback/access'
import { feedbackSubject } from '@/lib/classroom-feedback/subject'
import { parseStoredKnowledgeCard } from '@/lib/classroom-feedback/knowledge-point-cards'
import { signedFeedbackImageUrls } from '@/lib/classroom-feedback/signed-images'
import { LearningRecordSwitcher } from '@/components/Parent/LearningRecordSwitcher'

export const dynamic = 'force-dynamic'

export default async function ClassFeedbackPage({ searchParams }: { searchParams?: Promise<{ childId?: string; feedbackId?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id
  const division = ((session.user as { division?: string }).division === 'SENIOR' ? 'SENIOR' : 'JUNIOR') as 'JUNIOR' | 'SENIOR'
  const prisma = getPrismaForDivision(division)
  const params = await searchParams
  const childId = params?.childId || ''
  const feedbackId = params?.feedbackId || ''

  const studentIds = (
    await prisma.student.findMany({
      where: parentLinkedStudentWhere(userId),
      select: { id: true },
    })
  ).map(s => s.id)
  const scopedStudentIds = childId && studentIds.includes(childId) ? [childId] : studentIds

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

  const feedbacks = await prisma.classroomFeedback.findMany({
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
    take: 100,
  })

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
    />
  </div>
}
