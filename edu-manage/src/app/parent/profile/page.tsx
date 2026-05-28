import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentProfileClient } from './client'

export const dynamic = 'force-dynamic'

export default async function ParentProfilePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })

  if (!user) redirect('/login')

  const students = await prisma.student.findMany({
    where: { parentId: userId, status: { not: 'INACTIVE' } },
    include: {
      mainTeacher: { select: { id: true, name: true } },
      schedules: {
        where: { schedule: { status: { not: 'cancelled' } } },
        include: { schedule: { include: { teacher: { select: { id: true, name: true } } } } },
        take: 50,
      },
    },
  })

  // Gather all teachers for each student
  const studentInfo = students.map(s => {
    const teacherSet = new Set<string>()
    if (s.mainTeacher?.name) teacherSet.add(s.mainTeacher.name)
    s.schedules.forEach(sch => {
      if (sch.schedule?.teacher?.name) teacherSet.add(sch.schedule.teacher.name)
    })
    return {
      id: s.id,
      name: s.name,
      grade: s.grade,
      school: s.school,
      teachers: [...teacherSet],
    }
  })

  return (
    <ParentProfileClient
      user={JSON.parse(JSON.stringify(user))}
      studentInfo={JSON.parse(JSON.stringify(studentInfo))}
    />
  )
}
