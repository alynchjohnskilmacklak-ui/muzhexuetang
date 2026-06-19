import { auth } from '@/lib/auth'
import { getPrismaForDivision } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentProfileClient } from './client'

export const dynamic = 'force-dynamic'

export default async function ParentProfilePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id
  const division = ((session.user as { division?: string }).division === 'SENIOR' ? 'SENIOR' : 'JUNIOR') as 'JUNIOR' | 'SENIOR'
  const prisma = getPrismaForDivision(division)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  })

  if (!user) redirect('/login')

  const students = await prisma.student.findMany({
    where: { parentUserId: userId, status: { not: 'INACTIVE' } },
    include: {
      mainTeacher: { select: { id: true, name: true } },
      enrollments: {
        where: { status: 'ACTIVE' },
        include: {
          group: {
            include: {
              teacher: { select: { name: true } },
              teacherAssignments: { include: { teacher: { select: { name: true } } } },
            },
          },
        },
        take: 20,
      },
    },
  })

  // Gather teachers from enrollments (not old Schedule)
  const studentInfo = students.map(s => {
    const teacherSet = new Set<string>()
    if (s.mainTeacher?.name) teacherSet.add(s.mainTeacher.name)
    s.enrollments.forEach(enr => {
      if (enr.group?.teacher?.name) teacherSet.add(enr.group.teacher.name)
      enr.group?.teacherAssignments?.forEach(a => {
        if (a.teacher?.name) teacherSet.add(a.teacher.name)
      })
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
