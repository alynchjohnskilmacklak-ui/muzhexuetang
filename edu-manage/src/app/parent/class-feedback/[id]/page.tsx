import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { FeedbackDetailClient } from './client'
import { parentLinkedStudentWhere, visibleClassroomFeedbackWhere, visibleTeacherWhere } from '@/lib/business-visibility'
import { resolveFeedbackImageVariants, variantsForFeedback } from '@/lib/file-asset-variants'
import { redactFeedbackForParent } from '@/lib/classroom-feedback/access'

export const dynamic = 'force-dynamic'

export default async function FeedbackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id
  const prisma = await getRequestPrisma()

  const studentIds = (
    await prisma.student.findMany({
      where: parentLinkedStudentWhere(userId),
      select: { id: true },
    })
  ).map(s => s.id)

  const feedback = await prisma.classroomFeedback.findFirst({
    where: {
      id,
      ...visibleClassroomFeedbackWhere,
      studentIds: { hasSome: studentIds },
      teacher: visibleTeacherWhere,
    },
    include: {
      teacher: { select: { id: true, name: true, subjects: true } },
      classLesson: {
        include: {
          group: { include: { course: true, room: true } },
        },
      },
    },
  })

  if (!feedback) notFound()

  const parentFeedback = redactFeedbackForParent(feedback, studentIds)
  const imageVariantMap = await resolveFeedbackImageVariants(prisma, parentFeedback.imageUrls)
  const feedbackWithImages = {
    ...parentFeedback,
    images: variantsForFeedback(parentFeedback.imageUrls, imageVariantMap),
  }

  return <FeedbackDetailClient feedback={JSON.parse(JSON.stringify(feedbackWithImages))} />
}
