import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentGradesClient } from './client'

export default async function ParentGradesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userId = (session.user as { id: string }).id

  const grades = await prisma.grade.findMany({
    where: { student: { parentId: userId } },
    include: { student: true, course: true },
    orderBy: { date: 'desc' },
  })

  const gradeData = grades.map(g => ({
    key: g.id,
    student: g.student.name,
    course: g.course?.name || '',
    score: g.score,
    type: g.type,
    date: g.date.toISOString().split('T')[0],
  }))

  const studentNames = [...new Set(grades.map(g => g.student.name))]

  return <ParentGradesClient gradeData={gradeData} studentNames={studentNames} />
}
