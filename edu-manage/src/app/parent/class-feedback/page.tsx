import { auth } from '@/lib/auth'
import { getPrismaForDivision } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ClassFeedbackClient } from './client'
import { parentLinkedStudentWhere, visibleClassroomFeedbackWhere, visibleTeacherWhere } from '@/lib/business-visibility'
import { resolveFeedbackImageVariants, variantsForFeedback } from '@/lib/file-asset-variants'
import { redactFeedbackForParent } from '@/lib/classroom-feedback/access'
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
        parentMessages: {
          where: { parentId: userId },
          include: { replies: { orderBy: { createdAt: 'asc' } } },
          take: 1,
        },
        classLesson: {
          include: {
            group: { include: { course: true, room: true } },
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
      parentMessages: {
        where: { parentId: userId },
        include: { replies: { orderBy: { createdAt: 'asc' } } },
        take: 1,
      },
      classLesson: { include: { group: { include: { course: true, teacherAssignments: { select: { teacherId: true, subject: true } } } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const parentFeedbacks = feedbacks.map((feedback) => redactFeedbackForParent(feedback, scopedStudentIds))
  const parentHighlightedFeedback = highlightedFeedback
    ? redactFeedbackForParent(highlightedFeedback, scopedStudentIds)
    : null
  const allImageUrls = [...parentFeedbacks, ...(parentHighlightedFeedback ? [parentHighlightedFeedback] : [])]
    .flatMap((feedback) => feedback.imageUrls)
  const imageVariantMap = await resolveFeedbackImageVariants(prisma, allImageUrls)
  const withImages = <T extends { imageUrls: string[] }>(feedback: T) => ({
    ...feedback,
    images: variantsForFeedback(feedback.imageUrls, imageVariantMap),
  })

  return <div>
    <LearningRecordSwitcher />
    <ClassFeedbackClient
      feedbacks={JSON.parse(JSON.stringify(parentFeedbacks.map(withImages)))}
      highlightedFeedback={parentHighlightedFeedback ? JSON.parse(JSON.stringify(withImages(parentHighlightedFeedback))) : null}
    />
  </div>
}
