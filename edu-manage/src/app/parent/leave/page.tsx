import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { parentLinkedStudentWhere } from '@/lib/business-visibility'
import { ParentLeaveClient } from './client'

export const dynamic = 'force-dynamic'

export default async function ParentLeavePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id
  const db = await getRequestPrisma()

  const students = await db.student.findMany({
    where: parentLinkedStudentWhere(userId),
    select: { id: true, name: true },
  })

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  const childStudentIds = students.map(s => s.id)

  const upcomingLessons = await db.classLesson.findMany({
    where: {
      lessonDate: { gte: now, lte: twoWeeksLater },
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      group: {
        enrollments: {
          some: {
            studentId: { in: childStudentIds },
            status: 'ACTIVE',
          },
        },
      },
    },
    include: {
      group: {
        include: {
          course: { select: { name: true, subject: true } },
          enrollments: {
            where: { studentId: { in: childStudentIds }, status: 'ACTIVE' },
            select: { studentId: true },
          },
        },
      },
    },
    orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
    take: 30,
  })

  // 去重：同一天同科目只保留一条
  const seenKeys = new Set<string>()
  const deduped = upcomingLessons.filter(lesson => {
    const subject = lesson.group.course?.subject || lesson.group.course?.name || ''
    const key = `${lesson.lessonDate.toISOString().slice(0, 10)}_${subject}_${lesson.startTime}`
    if (seenKeys.has(key)) return false
    seenKeys.add(key)
    return true
  })

  const leaveRequests = await db.leaveRequest.findMany({
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
      upcomingSchedules={deduped.map(lesson => {
        const subject = lesson.group.course?.subject || lesson.group.course?.name || '课程'
        const dateStr = lesson.lessonDate.toISOString().slice(0, 10)
        const mmdd = dateStr.slice(5).replace('-', '/')
        const fullTime = lesson.startTime.length === 5 ? lesson.startTime + ':00' : lesson.startTime
        return {
          id: lesson.id,
          title: `${subject} ${lesson.startTime}-${lesson.endTime}（${mmdd}）`,
          startTime: new Date(dateStr + 'T' + fullTime).toISOString(),
          studentIds: lesson.group.enrollments.map(e => e.studentId),
        }
      })}
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
