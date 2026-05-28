import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentScheduleClient } from './client'
import { parentActiveEnrollmentWhere, parentActiveStudentWhere, parentVisibleLessonWhere } from '@/lib/business-visibility'

export const dynamic = 'force-dynamic'

export default async function ParentSchedulePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userId = (session.user as { id: string }).id

  const students = await prisma.student.findMany({
    where: parentActiveStudentWhere(userId),
    select: { id: true, name: true, grade: true },
  })

  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const lessons = await prisma.classLesson.findMany({
    where: {
      ...parentVisibleLessonWhere(userId),
      lessonDate: { gte: monday, lte: sunday },
    },
    include: {
      group: { include: { course: true, teacher: { select: { id: true, name: true } }, room: true, enrollments: { where: parentActiveEnrollmentWhere(userId), include: { student: true } } } },
      teacher: { select: { id: true, name: true } },
    },
    orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
  })

  return <ParentScheduleClient students={JSON.parse(JSON.stringify(students))} lessons={JSON.parse(JSON.stringify(lessons))} />
}
