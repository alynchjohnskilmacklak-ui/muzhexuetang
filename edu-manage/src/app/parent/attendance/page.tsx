import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentAttendanceClient } from './client'
import { parentLinkedStudentWhere } from '@/lib/business-visibility'

export const dynamic = 'force-dynamic'

export default async function ParentAttendancePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userId = (session.user as { id: string }).id

  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1)

  const records = await prisma.attendance.findMany({
    where: {
      student: parentLinkedStudentWhere(userId),
      createdAt: { gte: monthStart, lt: monthEnd },
    },
    include: {
      student: { select: { id: true, name: true } },
      lesson: { include: { group: { select: { id: true, name: true, course: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const students = await prisma.student.findMany({
    where: parentLinkedStudentWhere(userId),
    select: { id: true, name: true },
  })

  return (
    <ParentAttendanceClient
      records={JSON.parse(JSON.stringify(records))}
      students={JSON.parse(JSON.stringify(students))}
    />
  )
}
