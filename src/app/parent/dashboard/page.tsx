import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentDashboardClient } from './client'

export default async function ParentDashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userId = (session.user as { id: string }).id

  const students = await prisma.student.findMany({
    where: { parentId: userId },
    include: {
      grades: { include: { course: true }, orderBy: { date: 'desc' }, take: 3 },
      fees: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })

  const allFees = students.flatMap(s => s.fees.map(f => ({
    ...f,
    studentName: s.name,
  })))

  const upcomingClasses = await prisma.schedule.findMany({
    where: { students: { some: { student: { parentId: userId } } } },
    include: { course: true, teacher: true, students: { include: { student: true } } },
    take: 5,
    orderBy: { startTime: 'asc' },
  })

  const children = students.map(s => ({
    id: s.id,
    name: s.name,
    courseNames: s.grades.map(g => g.course?.name || '').filter(Boolean),
    avgScore: s.grades.length > 0
      ? Math.round(s.grades.reduce((acc, g) => acc + g.score, 0) / s.grades.length)
      : 0,
    totalGrades: s.grades.length,
  }))

  const totalPaid = allFees.filter(f => f.status === 'paid').reduce((s, f) => s + f.amount, 0)
  const totalPending = allFees.filter(f => f.status === 'pending').reduce((s, f) => s + f.amount, 0)
  const overallAvgScore = children.length > 0
    ? Math.round(children.reduce((s, c) => s + c.avgScore, 0) / children.length)
    : 0

  return (
    <ParentDashboardClient
      childrenList={children}
      allFees={allFees}
      upcomingClasses={upcomingClasses.map(s => ({
        key: s.id,
        course: s.course?.name || s.title,
        student: s.students.length > 0 ? '子女' : '',
        time: s.startTime.toLocaleString('zh-CN'),
        teacher: s.teacher?.name || '',
        room: s.roomId || '',
      }))}
      stats={{ totalPaid, totalPending, avgScore: overallAvgScore, childrenCount: students.length }}
    />
  )
}
