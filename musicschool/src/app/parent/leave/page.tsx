import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentLeaveClient } from './client'

export const dynamic = 'force-dynamic'

export default async function ParentLeavePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id

  const students = await prisma.student.findMany({
    where: { parentId: userId },
    select: { id: true, name: true },
  })

  const now = new Date()
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  const upcomingSchedules = await prisma.schedule.findMany({
    where: {
      startTime: { gte: now, lte: twoWeeksLater },
      students: { some: { student: { parentId: userId } } },
    },
    include: {
      course: { select: { name: true } },
      students: { include: { student: { select: { id: true } } } },
    },
    orderBy: { startTime: 'asc' },
  })

  const leaveRequests = await prisma.leaveRequest.findMany({
    where: { student: { parentId: userId } },
    include: {
      student: { select: { name: true } },
      schedule: { include: { course: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return (
    <ParentLeaveClient
      students={students}
      upcomingSchedules={upcomingSchedules.map(s => ({
        id: s.id,
        title: s.course?.name || s.title,
        startTime: s.startTime.toISOString(),
        studentIds: s.students.map(ss => ss.student.id),
      }))}
      leaveRequests={leaveRequests.map(lr => ({
        id: lr.id,
        studentName: lr.student.name,
        courseName: lr.schedule?.course?.name || '未指定课程',
        leaveDate: lr.leaveDate.toISOString(),
        reason: lr.reason,
        status: lr.status,
        replyNote: lr.replyNote,
        createdAt: lr.createdAt.toISOString(),
      }))}
    />
  )
}
