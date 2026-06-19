import { auth } from '@/lib/auth'
import { getPrismaForDivision } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ClassFeedbackClient } from './client'
import { parentLinkedStudentWhere, visibleClassroomFeedbackWhere, visibleTeacherWhere } from '@/lib/business-visibility'

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
  let highlightedFeedback: any = null
  if (feedbackId && scopedStudentIds.length > 0) {
    highlightedFeedback = await prisma.classroomFeedback.findFirst({
      where: {
        id: feedbackId,
        ...visibleClassroomFeedbackWhere,
        studentIds: { hasSome: scopedStudentIds },
        teacher: visibleTeacherWhere,
      },
      include: {
        teacher: { select: { id: true, name: true } },
        classLesson: {
          include: {
            group: { include: { course: true, room: true } },
          },
        },
      },
    })
  }

  const feedbacks = await prisma.classroomFeedback.findMany({
    where: {
      ...visibleClassroomFeedbackWhere,
      studentIds: { hasSome: scopedStudentIds },
      teacher: visibleTeacherWhere,
    },
    include: {
      teacher: { select: { id: true, name: true } },
      classLesson: { include: { group: { include: { course: true, teacherAssignments: { select: { teacherId: true, subject: true } } } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return <ClassFeedbackClient
    feedbacks={JSON.parse(JSON.stringify(feedbacks))}
    highlightedFeedback={highlightedFeedback ? JSON.parse(JSON.stringify(highlightedFeedback)) : null}
  />
}
