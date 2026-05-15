import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentScheduleClient } from './client'

export default async function ParentSchedulePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userId = (session.user as { id: string }).id

  const schedules = await prisma.schedule.findMany({
    where: { students: { some: { student: { parentId: userId } } } },
    include: { course: true, teacher: true, students: { include: { student: true } } },
    orderBy: { startTime: 'asc' },
  })

  const events = schedules.map(s => ({
    id: s.id,
    title: `${s.course?.name || s.title}\n${s.students.map(ss => ss.student.name).join(',')} | ${s.teacher?.name || ''}`,
    start: s.startTime.toISOString(),
    end: s.endTime.toISOString(),
    backgroundColor: s.color || '#1677ff',
  }))

  const studentNames = [...new Set(schedules.flatMap(s => s.students.map(ss => ss.student.name)))]

  const listData = schedules.map(s => ({
    key: s.id,
    student: s.students.map(ss => ss.student.name).join(', '),
    course: s.course?.name || s.title,
    time: `${s.startTime.toLocaleString('zh-CN')} - ${s.endTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`,
    teacher: s.teacher?.name || '',
    room: s.roomId || '',
  }))

  return <ParentScheduleClient events={events} studentNames={studentNames} listData={listData} />
}
