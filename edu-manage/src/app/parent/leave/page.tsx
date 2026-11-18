import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { PARENT_ACTIVE_CHILD_COOKIE } from '@/constants/membership'
import { parentLinkedStudentWhere, visibleClassLessonWhere } from '@/lib/business-visibility'
import { getParentChildren } from '@/lib/parent-children'
import { isParentStudentInLesson } from '@/lib/parent-lesson-visibility'
import { resolveParentChildId } from '@/lib/parent-child-selection'
import { ParentLeaveClient } from './client'

export const dynamic = 'force-dynamic'

export default async function ParentLeavePage({ searchParams }: { searchParams?: Promise<{ childId?: string; studentId?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  const userId = (session.user as { id: string }).id
  const db = await getRequestPrisma()
  const params = await searchParams

  const students = await getParentChildren(db, userId)
  const rememberedStudentId = (await cookies()).get(PARENT_ACTIVE_CHILD_COOKIE)?.value
  const initialSelectedStudentId = resolveParentChildId(students, [params?.childId, params?.studentId, rememberedStudentId])

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  const childStudentIds = students.flatMap(s => s.recordIds)

  const upcomingLessons = await db.classLesson.findMany({
    where: {
      ...visibleClassLessonWhere,
      lessonDate: { gte: now, lte: twoWeeksLater },
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
      group: {
        ...visibleClassLessonWhere.group,
        enrollments: {
          some: {
            studentId: { in: childStudentIds },
            status: 'ACTIVE',
            deletedAt: null,
          },
        },
      },
    },
    include: {
      lessonStudents: { where: { studentId: { in: childStudentIds } }, select: { studentId: true } },
      _count: { select: { lessonStudents: true } },
      group: {
        include: {
          course: { select: { name: true, subject: true } },
          enrollments: {
            where: { studentId: { in: childStudentIds }, status: 'ACTIVE', deletedAt: null },
            select: { studentId: true, subjects: true },
          },
        },
      },
    },
    orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
    take: 30,
  })

  const leaveRequests = await db.leaveRequest.findMany({
    where: { student: parentLinkedStudentWhere(userId) },
    include: {
      student: { select: { name: true } },
      lesson: { include: { group: { include: { course: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return (
    <ParentLeaveClient
      students={students}
      initialSelectedStudentId={initialSelectedStudentId}
      upcomingSchedules={upcomingLessons.map(lesson => {
        const subject = lesson.group.course?.subject || lesson.group.course?.name || '课程'
        const dateStr = lesson.lessonDate.toISOString().slice(0, 10)
        const mmdd = dateStr.slice(5).replace('-', '/')
        const fullTime = lesson.startTime.length === 5 ? lesson.startTime + ':00' : lesson.startTime
        return {
          id: lesson.id,
          title: `${subject} ${lesson.startTime}-${lesson.endTime}（${mmdd}）`,
          startTime: new Date(dateStr + 'T' + fullTime).toISOString(),
          studentIds: students.filter((student) => student.recordIds.some((id) => isParentStudentInLesson(lesson, id))).map((student) => student.id),
        }
      })}
      leaveRequests={leaveRequests.map(lr => ({
        id: lr.id,
        studentName: lr.student.name,
        courseName: lr.lesson?.group.course.name || '未指定课程',
        leaveDate: lr.leaveDate.toISOString(),
        reason: lr.reason,
        status: lr.status,
        replyNote: lr.replyNote,
        createdAt: lr.createdAt.toISOString(),
      }))}
    />
  )
}
