import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { PARENT_ACTIVE_CHILD_COOKIE } from '@/constants/membership'
import { parentLinkedStudentWhere, visibleClassLessonWhere } from '@/lib/business-visibility'
import { getParentChildren } from '@/lib/parent-children'
import { resolveParentChildId } from '@/lib/parent-child-selection'
import { dateRangeDays, getLocalDayRange, localDateKey, todayLocal } from '@/lib/date/local-day'
import { resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'
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

  const today = todayLocal()
  const upcomingDateKeys = dateRangeDays(today, 15)
  const upcomingStart = getLocalDayRange(upcomingDateKeys[0]).start
  const upcomingEnd = getLocalDayRange(upcomingDateKeys[upcomingDateKeys.length - 1]).end

  const childStudentIds = students.flatMap(s => s.recordIds)

  const upcomingLessons = await db.classLesson.findMany({
    where: {
      ...visibleClassLessonWhere,
      lessonDate: { gte: upcomingStart, lt: upcomingEnd },
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
          teacherAssignments: { select: { teacherId: true, subject: true } },
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
    where: { student: parentLinkedStudentWhere(userId), deletedAt: null },
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
        const subject = lesson.subject
          || lesson.group.teacherAssignments.find((assignment) => assignment.teacherId === lesson.teacherId || assignment.teacherId === lesson.group.teacherId)?.subject
          || lesson.group.course?.subject
          || lesson.group.course?.name
          || '课程'
        const dateKey = localDateKey(lesson.lessonDate)
        const mmdd = dateKey.slice(5).replace('-', '/')
        const eligibleStudentIds = resolveSubjectLessonStudentIds(
          lesson.lessonStudents.map((item) => item.studentId),
          lesson.group.enrollments,
          lesson.subject
            || lesson.group.teacherAssignments.find((assignment) => assignment.teacherId === lesson.teacherId || assignment.teacherId === lesson.group.teacherId)?.subject
            || lesson.group.course?.subject,
          lesson.lessonDate,
        )
        return {
          id: lesson.id,
          dateKey,
          title: `${mmdd} ${lesson.startTime}-${lesson.endTime} · ${subject}`,
          studentIds: students.filter((student) => student.recordIds.some((id) => eligibleStudentIds.includes(id))).map((student) => student.id),
        }
      })}
      leaveRequests={leaveRequests.map(lr => ({
        id: lr.id,
        studentName: lr.student.name,
        courseName: lr.lesson?.group.course.name || '未指定课程',
        leaveDate: localDateKey(lr.leaveDate),
        reason: lr.reason,
        status: lr.status,
        replyNote: lr.replyNote,
        createdAt: lr.createdAt.toISOString(),
      }))}
    />
  )
}
