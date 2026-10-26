import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRequestPrisma } from '@/lib/prisma'
import { ParentMessagesClient } from './client'
import { parentActiveStudentWhere } from '@/lib/business-visibility'

export const dynamic = 'force-dynamic'

export default async function ParentMessagesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id
  const db = await getRequestPrisma()

  const students = await db.student.findMany({
    where: parentActiveStudentWhere(userId),
    select: { id: true, name: true, grade: true },
  })

  const teacherRecommendations = Object.fromEntries(await Promise.all(students.map(async (student) => {
    const [recentLesson, enrollments] = await Promise.all([
      db.classLesson.findFirst({
        where: {
          status: { not: 'CANCELLED' },
          group: { enrollments: { some: { studentId: student.id, status: 'ACTIVE' } } },
        },
        orderBy: [{ lessonDate: 'desc' }, { startTime: 'desc' }],
        select: {
          subject: true,
          teacher: { select: { id: true, name: true } },
          group: {
            select: {
              teacher: { select: { id: true, name: true } },
              course: { select: { subject: true } },
              teacherAssignments: { select: { subject: true, teacher: { select: { id: true, name: true } } } },
            },
          },
        },
      }),
      db.enrollment.findMany({
        where: { studentId: student.id, status: 'ACTIVE', group: { status: { not: 'ARCHIVED' } } },
        orderBy: { enrolledAt: 'desc' },
        select: {
          group: {
            select: {
              teacher: { select: { id: true, name: true } },
              course: { select: { subject: true } },
              teacherAssignments: { select: { subject: true, teacher: { select: { id: true, name: true } } } },
            },
          },
        },
      }),
    ])

    const candidates: Array<{ id: string; name: string; subject: string | null; source: 'lesson' | 'group' }> = []
    const add = (teacher: { id: string; name: string } | null | undefined, subject: string | null | undefined, source: 'lesson' | 'group') => {
      if (!teacher || candidates.some((candidate) => candidate.id === teacher.id)) return
      candidates.push({ id: teacher.id, name: teacher.name, subject: subject || null, source })
    }
    if (recentLesson) {
      const directTeacher = recentLesson.teacher || recentLesson.group.teacher
      const directAssignment = recentLesson.group.teacherAssignments.find((assignment) => assignment.teacher.id === directTeacher?.id)
      add(directTeacher, recentLesson.subject || directAssignment?.subject || recentLesson.group.course.subject, 'lesson')
      for (const assignment of recentLesson.group.teacherAssignments) add(assignment.teacher, assignment.subject || recentLesson.group.course.subject, 'lesson')
    }
    for (const enrollment of enrollments) {
      for (const assignment of enrollment.group.teacherAssignments) add(assignment.teacher, assignment.subject || enrollment.group.course.subject, 'group')
      add(enrollment.group.teacher, enrollment.group.course.subject, 'group')
    }
    return [student.id, candidates] as const
  })))

  const messages = await db.parentMessage.findMany({
    where: { parentId: userId },
    include: {
      student: { select: { id: true, name: true } },
      teacher: { select: { id: true, name: true } },
      replies: { orderBy: { createdAt: 'asc' } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })

  return (
    <ParentMessagesClient
      students={students}
      teacherRecommendations={teacherRecommendations}
      initialMessages={JSON.parse(JSON.stringify(messages))}
    />
  )
}
