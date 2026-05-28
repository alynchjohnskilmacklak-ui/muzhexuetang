import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ClassFeedbackClient } from './client'
import { parentLinkedStudentWhere, visibleClassroomFeedbackWhere, visibleTeacherWhere } from '@/lib/business-visibility'

export const dynamic = 'force-dynamic'

export default async function ClassFeedbackPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id

  const studentIds = (
    await prisma.student.findMany({
      where: parentLinkedStudentWhere(userId),
      select: { id: true },
    })
  ).map(s => s.id)

  const feedbacks = await prisma.classroomFeedback.findMany({
    where: {
      ...visibleClassroomFeedbackWhere,
      studentIds: { hasSome: studentIds },
      teacher: visibleTeacherWhere,
    },
    include: {
      teacher: { select: { id: true, name: true } },
      classLesson: { include: { group: { include: { course: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return <ClassFeedbackClient feedbacks={JSON.parse(JSON.stringify(feedbacks))} />
}
