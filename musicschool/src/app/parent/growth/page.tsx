import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentGrowthClient } from './client'
import {
  parentLinkedStudentWhere,
  visibleClassroomFeedbackWhere,
  visiblePerformancePostWhere,
  visibleTeacherWhere,
} from '@/lib/business-visibility'

export const dynamic = 'force-dynamic'

export default async function ParentGrowthPage({ searchParams }: { searchParams: Promise<{ date?: string; feedbackId?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id
  const sp = await searchParams

  const students = await prisma.student.findMany({
    where: parentLinkedStudentWhere(userId),
    select: { id: true, name: true },
  })
  const studentIds = students.map(s => s.id)

  // If feedbackId is provided, fetch that specific feedback item
  let highlightedFeedback: any = null
  if (sp.feedbackId) {
    // Try classroom feedback first
    highlightedFeedback = await prisma.classroomFeedback.findFirst({
      where: { id: sp.feedbackId, ...visibleClassroomFeedbackWhere, teacher: visibleTeacherWhere, studentIds: { hasSome: studentIds } },
      include: { teacher: { select: { name: true } } },
    })
    if (!highlightedFeedback) {
      // Try performance post
      highlightedFeedback = await prisma.performancePost.findFirst({
        where: { id: sp.feedbackId, ...visiblePerformancePostWhere, teacher: visibleTeacherWhere, studentId: { in: studentIds } },
        include: { student: { select: { name: true } }, teacher: { select: { name: true } } },
      })
    }
  }

  // Performance posts
  const postsWhere: any = {
    studentId: { in: studentIds },
    ...visiblePerformancePostWhere,
    teacher: visibleTeacherWhere,
  }
  if (sp.date) {
    const d = new Date(sp.date + 'T00:00:00')
    const nextD = new Date(d.getTime() + 86400000)
    postsWhere.createdAt = { gte: d, lt: nextD }
  }
  const posts = await prisma.performancePost.findMany({
    where: postsWhere,
    include: { student: { select: { name: true } }, teacher: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: sp.date ? 50 : 30,
  })

  // Classroom feedbacks with date filter
  const cfWhere: any = { ...visibleClassroomFeedbackWhere, teacher: visibleTeacherWhere, studentIds: { hasSome: studentIds } }
  if (sp.date) {
    const d = new Date(sp.date + 'T00:00:00')
    const nextD = new Date(d.getTime() + 86400000)
    cfWhere.createdAt = { gte: d, lt: nextD }
  }
  const classroomFeedbacks = await prisma.classroomFeedback.findMany({
    where: cfWhere,
    include: { teacher: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: sp.date ? 50 : 30,
  })

  // Achievement badges
  const badgesWhere: any = { studentId: { in: studentIds } }
  if (sp.date) {
    const d = new Date(sp.date + 'T00:00:00')
    const nextD = new Date(d.getTime() + 86400000)
    badgesWhere.earnedAt = { gte: d, lt: nextD }
  }
  const badges = await prisma.achievementBadge.findMany({
    where: badgesWhere,
    include: { student: { select: { name: true } }, teacher: { select: { name: true } } },
    orderBy: { earnedAt: 'desc' },
    take: sp.date ? 50 : 30,
  })

  // Grade records
  const gradesWhere: any = { studentId: { in: studentIds } }
  if (sp.date) {
    const d = new Date(sp.date + 'T00:00:00')
    const nextD = new Date(d.getTime() + 86400000)
    gradesWhere.createdAt = { gte: d, lt: nextD }
  }
  const grades = await prisma.gradeRecord.findMany({
    where: gradesWhere,
    include: { student: { select: { name: true } }, assessment: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: sp.date ? 50 : 20,
  })

  // Highlights
  const highlightsWhere: any = { studentId: { in: studentIds }, pushedToParent: true }
  if (sp.date) {
    const d = new Date(sp.date + 'T00:00:00')
    const nextD = new Date(d.getTime() + 86400000)
    highlightsWhere.createdAt = { gte: d, lt: nextD }
  }
  const highlights = await prisma.classHighlight.findMany({
    where: highlightsWhere,
    include: { student: { select: { name: true } }, teacher: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: sp.date ? 50 : 20,
  })

  return (
    <ParentGrowthClient
      students={JSON.parse(JSON.stringify(students))}
      posts={JSON.parse(JSON.stringify(posts))}
      classroomFeedbacks={JSON.parse(JSON.stringify(classroomFeedbacks))}
      badges={JSON.parse(JSON.stringify(badges))}
      grades={JSON.parse(JSON.stringify(grades))}
      highlights={JSON.parse(JSON.stringify(highlights))}
      highlightedFeedback={JSON.parse(JSON.stringify(highlightedFeedback))}
      filterDate={sp.date || null}
    />
  )
}
