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

  const studentIds = students.map(s => s.id)

  const enrollments = await db.enrollment.findMany({
    where: {
      studentId: { in: studentIds },
      status: 'ACTIVE',
    },
    include: {
      group: {
        include: {
          teacherAssignments: {
            include: {
              teacher: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  })

  const teacherMap = new Map<string, {
    id: string
    name: string
    subjects: string[]
    studentIds: string[]
  }>()

  for (const enrollment of enrollments) {
    for (const assignment of enrollment.group.teacherAssignments) {
      const teacher = assignment.teacher
      const subject = assignment.subject || ''
      const existing = teacherMap.get(teacher.id)
      if (existing) {
        if (subject && !existing.subjects.includes(subject)) existing.subjects.push(subject)
        if (!existing.studentIds.includes(enrollment.studentId)) existing.studentIds.push(enrollment.studentId)
      } else {
        teacherMap.set(teacher.id, {
          id: teacher.id,
          name: teacher.name,
          subjects: subject ? [subject] : [],
          studentIds: [enrollment.studentId],
        })
      }
    }
  }

  const teachers = Array.from(teacherMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'zh'))

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
      teachers={teachers}
      initialMessages={JSON.parse(JSON.stringify(messages))}
    />
  )
}