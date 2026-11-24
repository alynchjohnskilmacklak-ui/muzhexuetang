import type { PrismaClient } from '@prisma/client'
import { parentActiveEnrollmentWhere, parentLinkedStudentWhere, parentVisibleLessonWhere } from '@/lib/business-visibility'
import { getLocalDayRange, localDateKey } from '@/lib/date/local-day'
import { hasSubmittedLessonAttendance } from '@/lib/attendance-submission'
import { resolveLessonStudentIds } from '@/lib/lesson-roster'

export type ParentDailyFeedbackReadiness = {
  pendingAttendanceCount: number
  pendingFeedbackCount: number
  pendingLessonCount: number
}

function currentShanghaiMinutes(date: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0)
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0)
  return hour * 60 + minute
}

function timeToMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return hour * 60 + minute
}

/**
 * Match the teacher portal's feedback checklist for this parent and local day.
 * A lesson becomes feedback-eligible only after attendance has been submitted;
 * only this parent's rostered children can hold up their digest.
 */
export async function getParentDailyFeedbackReadiness(
  prisma: PrismaClient,
  parentUserId: string,
  date: string,
  now = new Date(),
): Promise<ParentDailyFeedbackReadiness> {
  const { start, end } = getLocalDayRange(date)
  const linkedStudents = await prisma.student.findMany({
    where: parentLinkedStudentWhere(parentUserId),
    select: { id: true },
  })
  const linkedStudentIds = new Set(linkedStudents.map((student) => student.id))
  if (linkedStudentIds.size === 0) return { pendingAttendanceCount: 0, pendingFeedbackCount: 0, pendingLessonCount: 0 }

  const lessons = await prisma.classLesson.findMany({
    where: {
      ...parentVisibleLessonWhere(parentUserId),
      status: { notIn: ['CANCELLED', 'POSTPONED'] },
      lessonDate: { gte: start, lt: end },
    },
    select: {
      id: true,
      groupId: true,
      teacherId: true,
      lessonDate: true,
      startTime: true,
      endTime: true,
      status: true,
      attendanceSubmittedAt: true,
      lessonStudents: { select: { studentId: true } },
      attendances: { select: { studentId: true } },
      classroomFeedbacks: {
        where: { status: 'PUBLISHED', deletedAt: null },
        select: { studentIds: true },
      },
      group: {
        select: {
          teacherId: true,
          enrollments: {
            where: parentActiveEnrollmentWhere(parentUserId),
            select: { studentId: true },
          },
        },
      },
    },
  })

  const legacyGroupIds = [...new Set(lessons.map((lesson) => lesson.groupId).filter((id): id is string => Boolean(id)))]
  const legacyFeedbacks = legacyGroupIds.length
    ? await prisma.classroomFeedback.findMany({
        where: {
          classLessonId: null,
          feedbackGroupId: { in: legacyGroupIds },
          studentIds: { hasSome: [...linkedStudentIds] },
          status: 'PUBLISHED',
          deletedAt: null,
          createdAt: { gte: start, lt: end },
        },
        select: { feedbackGroupId: true, teacherId: true, studentIds: true },
      })
    : []

  let pendingAttendanceCount = 0
  let pendingFeedbackCount = 0
  const pendingLessonIds = new Set<string>()

  for (const lesson of lessons) {
    const fullRoster = resolveLessonStudentIds(
      lesson.lessonStudents.map((row) => row.studentId),
      lesson.group?.enrollments.map((row) => row.studentId) ?? [],
      lesson.lessonDate,
      now,
    )
    const parentRoster = fullRoster.filter((studentId) => linkedStudentIds.has(studentId))
    if (parentRoster.length === 0) continue

    // Only lessons that have ended count as pending teacher updates. The
    // digest task can still be created; this count adds a note to its content.
    const endMinutes = timeToMinutes(lesson.endTime)
    const lessonIsDue = date !== localDateKey(now)
      || endMinutes === null
      || endMinutes <= currentShanghaiMinutes(now)
    if (!lessonIsDue) continue

    const attendanceSubmitted = hasSubmittedLessonAttendance({
      attendanceSubmittedAt: lesson.attendanceSubmittedAt,
      status: lesson.status,
      attendances: lesson.attendances,
      expectedStudentIds: fullRoster,
    })
    if (!attendanceSubmitted) {
      pendingAttendanceCount += parentRoster.length
      pendingLessonIds.add(lesson.id)
      continue
    }

    const feedbacked = new Set(lesson.classroomFeedbacks.flatMap((feedback) => feedback.studentIds))
    const lessonTeacherId = lesson.teacherId || lesson.group?.teacherId
    for (const feedback of legacyFeedbacks) {
      if (feedback.feedbackGroupId !== lesson.groupId || feedback.teacherId !== lessonTeacherId) continue
      for (const studentId of feedback.studentIds) feedbacked.add(studentId)
    }

    for (const studentId of parentRoster) {
      if (feedbacked.has(studentId)) continue
      pendingFeedbackCount += 1
      pendingLessonIds.add(lesson.id)
    }
  }

  return { pendingAttendanceCount, pendingFeedbackCount, pendingLessonCount: pendingLessonIds.size }
}
