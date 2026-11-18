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
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id
  const prisma = await getRequestPrisma()

  const linkedChildren = await getParentChildren(prisma, userId)
  const requestedChildId = query?.childId || query?.studentId || ''
  const storedChildId = (await cookies()).get(PARENT_ACTIVE_CHILD_COOKIE)?.value || ''
  const { selectedChild, invalidChild, studentIds: scopedStudentIds } = resolveParentChildSelection(
    linkedChildren,
    requestedChildId,
    storedChildId,
  )
  if (invalidChild) notFound()

  const feedback = await prisma.classroomFeedback.findFirst({
    where: {
      id,
      ...visibleClassroomFeedbackWhere,
      studentIds: { hasSome: scopedStudentIds },
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

  const matchingChildren = linkedChildren.filter((child) =>
    child.recordIds.some((recordId) => feedback.studentIds.includes(recordId)),
  )
  const feedbackStudentScope = selectedChild
    ? selectedChild.recordIds
    : matchingChildren.length === 1
      ? matchingChildren[0].recordIds
      : scopedStudentIds
  const redactedFeedback = redactFeedbackForParent(feedback, feedbackStudentScope)
  // With an "all children" view, never attach the first child's rating to a multi-child group feedback.
  const parentFeedback = selectedChild || matchingChildren.length === 1
    ? redactedFeedback
    : { ...redactedFeedback, studentRating: null }
  const unlinkedGroup = !feedback.classLesson && feedback.feedbackGroupId
    ? await prisma.classGroup.findFirst({
        where: { id: feedback.feedbackGroupId, deletedAt: null },
        select: { course: { select: { subject: true } }, teacherAssignments: { select: { teacherId: true, subject: true } } },
      })
    : null
  const imageVariantMap = await resolveFeedbackImageVariants(prisma, parentFeedback.imageUrls)
  const images = variantsForFeedback(parentFeedback.imageUrls, imageVariantMap)
  const thumbnailKeys = [...new Set(images.map((image) => image.thumbnailUrl || image.previewUrl || image.originalUrl))]
  const signedThumbnails = await signedFeedbackImageUrls(thumbnailKeys)
  const feedbackWithImages = {
    ...parentFeedback,
    displayStudentName: selectedChild?.name || (matchingChildren.length === 1 ? matchingChildren[0].name : null),
    resolvedSubject: feedbackSubject(feedback.classLesson, feedback.teacherId, unlinkedGroup,
      parseStoredKnowledgeCard(feedback.knowledgeCard)?.subject),
    images,
    signedThumbnails,
  }

  return <FeedbackDetailClient feedback={JSON.parse(JSON.stringify(feedbackWithImages))} />
}
