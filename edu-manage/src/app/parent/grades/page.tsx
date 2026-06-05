import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import ExamClient from './client'
import { parentActiveStudentWhere, parentVisibleExamPaperWhere, visibleClassGroupWhere } from '@/lib/business-visibility'

export const dynamic = 'force-dynamic'

export default async function ParentGradesPage({ searchParams }: { searchParams?: Promise<{ childId?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const parentId = (session.user as { id: string }).id
  const params = await searchParams
  const childId = params?.childId || ''
  const children = await prisma.student.findMany({
    where: parentActiveStudentWhere(parentId),
    select: { id: true },
  })
  const childIds = children.map((student) => student.id)
  const scopedChildIds = childId && childIds.includes(childId) ? [childId] : childIds
  const papers = await prisma.examPaper.findMany({
    where: { ...parentVisibleExamPaperWhere(parentId), studentId: { in: scopedChildIds } },
    include: {
      student: { select: { id: true, name: true, grade: true } },
      teacher: { select: { id: true, name: true } },
      questions: { orderBy: { order: 'asc' } },
      reactions: { select: { id: true, type: true, userId: true } },
      comments: { include: { author: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'asc' } },
    },
    orderBy: { paperDate: 'desc' },
  })
  const feedbacks = childIds.length ? await prisma.classroomFeedback.findMany({
    where: {
      status: 'PUBLISHED',
      studentIds: { hasSome: scopedChildIds },
      teacher: { status: { not: 'RESIGNED' } },
      classLesson: { group: visibleClassGroupWhere },
    },
    include: {
      teacher: { select: { id: true, name: true } },
      classLesson: { include: { group: { include: { course: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  }) : []

  return <ExamClient papers={JSON.parse(JSON.stringify(papers))} feedbacks={JSON.parse(JSON.stringify(feedbacks))} parentId={parentId} />
}
