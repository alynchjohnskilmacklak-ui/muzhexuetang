import { auth } from '@/lib/auth'
import { getRequestPrisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { ParentScheduleClient } from './client'
import {
  parentActiveEnrollmentWhere,
  parentActiveStudentWhere,
  parentLinkedStudentWhere,
  parentVisibleLessonWhere,
} from '@/lib/business-visibility'
import { normalizeSchedulePeriods } from '@/lib/schedule-periods'
import { calculateIntensiveDeductHours } from '@/lib/intensive-class'
import { localDateColumnValue, todayLocal } from '@/lib/date/local-day'

export const dynamic = 'force-dynamic'

function localDateKey(value: Date) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default async function ParentSchedulePage({ searchParams }: { searchParams?: Promise<{ week?: string }> }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const userId = (session.user as { id: string }).id
  const db = await getRequestPrisma()

  const [students, config] = await Promise.all([db.student.findMany({
    where: parentActiveStudentWhere(userId),
    select: {
      id: true,
      name: true,
      grade: true,
      enrollments: {
        where: { status: 'ACTIVE', group: { intensiveMode: 'INTENSIVE', status: { not: 'ARCHIVED' } } },
        select: {
          id: true,
          totalHours: true,
          usedHours: true,
          remainHours: true,
          group: {
            select: {
              id: true,
              name: true,
              intensiveMode: true,
              teachingType: true,
              course: { select: { name: true, subject: true } },
              teacher: { select: { name: true } },
            },
          },
        },
      },
    },
  }), db.systemConfig.findUnique({ where: { id: 'singleton' }, select: { schedulePeriods: true } })])

  const today = new Date(`${todayLocal()}T00:00:00.000Z`)
  const requestedWeek = (await searchParams)?.week
  const parsedWeek = typeof requestedWeek === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(requestedWeek)
    ? new Date(`${requestedWeek}T00:00:00.000Z`)
    : null
  const selectedDay = parsedWeek && !Number.isNaN(parsedWeek.getTime())
    && parsedWeek.toISOString().slice(0, 10) === requestedWeek
    && Math.abs(parsedWeek.getTime() - today.getTime()) <= 366 * 86400000
    ? parsedWeek : today
  const mondayCalendar = new Date(selectedDay)
  mondayCalendar.setUTCDate(selectedDay.getUTCDate() - (selectedDay.getUTCDay() === 0 ? 6 : selectedDay.getUTCDay() - 1))
  const mondayKey = mondayCalendar.toISOString().slice(0, 10)
  const nextMondayCalendar = new Date(mondayCalendar)
  nextMondayCalendar.setUTCDate(mondayCalendar.getUTCDate() + 7)
  const monday = localDateColumnValue(mondayKey)
  const nextMonday = localDateColumnValue(nextMondayCalendar.toISOString().slice(0, 10))

  const lessons = await db.classLesson.findMany({
    where: {
      ...parentVisibleLessonWhere(userId),
      lessonDate: { gte: monday, lt: nextMonday },
    },
    include: {
      _count: { select: { lessonStudents: true } },
      group: { include: { course: true, teacher: { select: { id: true, name: true } }, teacherAssignments: { select: { teacherId: true, subject: true } }, room: true, enrollments: { where: parentActiveEnrollmentWhere(userId), include: { student: true } } } },
      teacher: { select: { id: true, name: true } },
      lessonStudents: {
        where: { student: parentLinkedStudentWhere(userId) },
        include: { student: { select: { id: true, name: true } } },
      },
    },
    orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
  })

  const cancelledLessons = await db.classLesson.findMany({
    where: {
      deletedAt: null,
      status: 'CANCELLED',
      lessonDate: { gte: monday, lt: nextMonday },
      group: { deletedAt: null, status: { not: 'ARCHIVED' }, enrollments: { some: parentActiveEnrollmentWhere(userId) } },
    },
    include: {
      _count: { select: { lessonStudents: true } },
      group: { include: { course: true, enrollments: { where: parentActiveEnrollmentWhere(userId), include: { student: true } } } },
      lessonStudents: { where: { student: parentLinkedStudentWhere(userId) }, select: { studentId: true } },
    },
    orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
  })

  const historyLessons = await db.classLesson.findMany({
    where: {
      ...parentVisibleLessonWhere(userId),
      group: {
        intensiveMode: 'INTENSIVE',
        status: { not: 'ARCHIVED' },
        enrollments: { some: parentActiveEnrollmentWhere(userId) },
      },
      lessonDate: { lt: nextMonday },
      OR: [
        { attendanceSubmittedAt: { not: null } },
        { intensiveReviewStatus: { in: ['PENDING', 'APPROVED', 'REJECTED'] } },
      ],
    },
    include: {
      group: {
        include: {
          course: true,
          teacher: { select: { id: true, name: true } },
          teacherAssignments: { select: { teacherId: true, subject: true } },
        },
      },
      teacher: { select: { id: true, name: true } },
      lessonStudents: {
        where: { student: parentLinkedStudentWhere(userId) },
        include: { student: { select: { id: true, name: true } } },
      },
      attendances: {
        where: { student: parentLinkedStudentWhere(userId) },
        select: {
          id: true,
          studentId: true,
          status: true,
          actualMinutes: true,
          hoursDeducted: true,
        },
      },
      classroomFeedbacks: {
        where: { status: 'PUBLISHED' },
        select: {
          id: true,
          teacherId: true,
          studentIds: true,
          createdAt: true,
          summary: true,
          overallComment: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      intensiveReviews: {
        select: {
          status: true,
          actualMinutes: true,
          submittedAt: true,
          reviewedAt: true,
        },
        orderBy: { revision: 'desc' },
        take: 1,
      },
    },
    orderBy: [{ lessonDate: 'desc' }, { startTime: 'desc' }],
    take: 30,
  })

  const allowedStudentIds = new Set(students.map((student) => student.id))
  const linkedStudentIds = [...allowedStudentIds]
  const historyGroupIds = [...new Set(historyLessons.map((lesson) => lesson.groupId))]
  const unlinkedFeedbacks = historyGroupIds.length && linkedStudentIds.length
    ? await db.classroomFeedback.findMany({
        where: {
          status: 'PUBLISHED',
          classLessonId: null,
          feedbackGroupId: { in: historyGroupIds },
          studentIds: { hasSome: linkedStudentIds },
        },
        select: {
          id: true,
          teacherId: true,
          feedbackGroupId: true,
          studentIds: true,
          createdAt: true,
          summary: true,
          overallComment: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
    : []
  const [approvedAttendances, activeIntensiveLessonStudents] = linkedStudentIds.length
    ? await Promise.all([
        db.attendance.findMany({
          where: {
            studentId: { in: linkedStudentIds },
            lesson: {
              intensiveReviewStatus: 'APPROVED',
              group: { intensiveMode: 'INTENSIVE' },
            },
          },
          select: {
            studentId: true,
            status: true,
            actualMinutes: true,
            hoursDeducted: true,
            lesson: { select: { groupId: true, actualMinutes: true } },
          },
        }),
        db.classLessonStudent.findMany({
          where: {
            studentId: { in: linkedStudentIds },
            lesson: {
              status: { notIn: ['CANCELLED', 'POSTPONED'] },
              intensiveReviewStatus: { in: ['DRAFT', 'PENDING'] },
              group: { intensiveMode: 'INTENSIVE' },
            },
          },
          select: {
            studentId: true,
            lesson: {
              select: {
                groupId: true,
                intensiveReviewStatus: true,
                attendanceSubmittedAt: true,
              },
            },
          },
        }),
      ])
    : [[], []]
  const summaryMap = new Map<string, {
    studentId: string
    groupId: string
    approvedHours: number
    pendingCount: number
    bookedCount: number
  }>()
  const ensureSummary = (studentId: string, groupId: string) => {
    const key = `${studentId}:${groupId}`
    const existing = summaryMap.get(key)
    if (existing) return existing
    const created = { studentId, groupId, approvedHours: 0, pendingCount: 0, bookedCount: 0 }
    summaryMap.set(key, created)
    return created
  }
  approvedAttendances.forEach((attendance) => {
    const approvedMinutes = Number(attendance.actualMinutes || attendance.lesson?.actualMinutes || 0)
    const approvedTeachingHours = calculateIntensiveDeductHours(attendance.status, approvedMinutes)
    ensureSummary(attendance.studentId, attendance.lesson!.groupId).approvedHours += approvedTeachingHours
  })
  activeIntensiveLessonStudents.forEach((item) => {
    const summary = ensureSummary(item.studentId, item.lesson.groupId)
    if (item.lesson.intensiveReviewStatus === 'PENDING') summary.pendingCount += 1
    else if (item.lesson.intensiveReviewStatus === 'DRAFT' && !item.lesson.attendanceSubmittedAt) summary.bookedCount += 1
  })
  const safeHistoryLessons = historyLessons.map((lesson) => {
    const linked = lesson.classroomFeedbacks
    const legacyCandidates = linked.length ? [] : unlinkedFeedbacks.filter((feedback) => (
      feedback.feedbackGroupId === lesson.groupId
      && feedback.teacherId === (lesson.teacherId || lesson.group.teacherId)
      && localDateKey(feedback.createdAt) === localDateKey(lesson.lessonDate)
    ))
    // 历史反馈仅在同班、同教师、同一天且唯一时回显，避免猜测错误关联。
    const feedbacks = linked.length ? linked : legacyCandidates.length === 1 ? legacyCandidates : []
    return {
    ...lesson,
    classroomFeedbacks: feedbacks.map((feedback) => ({
      ...feedback,
      studentIds: feedback.studentIds.filter((studentId) => allowedStudentIds.has(studentId)),
    })).filter((feedback) => feedback.studentIds.length > 0),
  }})

  return (
    <ParentScheduleClient
      students={JSON.parse(JSON.stringify(students))}
      lessons={JSON.parse(JSON.stringify(lessons))}
      cancelledLessons={JSON.parse(JSON.stringify(cancelledLessons))}
      weekStart={mondayKey}
      historyLessons={JSON.parse(JSON.stringify(safeHistoryLessons))}
      intensiveSummary={[...summaryMap.values()]}
      periods={normalizeSchedulePeriods(config?.schedulePeriods)}
    />
  )
}
