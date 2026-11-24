import type { PrismaClient } from '@prisma/client'
import { getLocalDayRange, localDateKey } from '@/lib/date/local-day'

export type LessonFeedbackBlockReason = 'LEAVE' | 'ABSENT'

export type LessonFeedbackRoster = {
  id: string
  lessonDate: Date
  studentIds: string[]
}

export type LessonAttendanceStatus = {
  lessonId: string | null
  studentId: string
  status: string
}

export type ActiveLeaveRequest = {
  studentId: string
  lessonId: string | null
  leaveDate: Date | string
  status: string
  deletedAt?: Date | string | null
}

/** Return only roster students who still need feedback and are not blocked. */
export function resolvePendingFeedbackStudentIds(
  studentIds: string[],
  coveredStudentIds: string[],
  blockReasons: Record<string, LessonFeedbackBlockReason>,
) {
  const covered = new Set(coveredStudentIds)
  const blocked = new Set(Object.keys(blockReasons))
  return [...new Set(studentIds.filter(Boolean))]
    .filter((studentId) => !covered.has(studentId) && !blocked.has(studentId))
}

/**
 * Resolve which roster students cannot receive feedback for this lesson.
 * A recorded attendance result is authoritative: PRESENT/LATE/MAKEUP permits
 * feedback even if a leave request is still pending; LEAVE/ABSENT blocks it.
 */
export function resolveLessonFeedbackBlockReasons(input: {
  lessonId: string
  lessonDate: Date
  studentIds: string[]
  attendances: LessonAttendanceStatus[]
  leaveRequests: ActiveLeaveRequest[]
}): Record<string, LessonFeedbackBlockReason> {
  const attendanceByStudent = new Map(
    input.attendances
      .filter((attendance) => attendance.lessonId === input.lessonId)
      .map((attendance) => [attendance.studentId, attendance.status.toUpperCase()]),
  )
  const lessonDay = localDateKey(input.lessonDate)
  const blockReasons: Record<string, LessonFeedbackBlockReason> = {}

  for (const studentId of input.studentIds) {
    const attendanceStatus = attendanceByStudent.get(studentId)
    if (attendanceStatus === 'LEAVE' || attendanceStatus === 'ABSENT') {
      blockReasons[studentId] = attendanceStatus
      continue
    }
    if (attendanceStatus === 'PRESENT' || attendanceStatus === 'LATE' || attendanceStatus === 'MAKEUP') {
      continue
    }

    const hasActiveLeaveRequest = input.leaveRequests.some((request) => {
      if (request.studentId !== studentId || request.deletedAt != null) return false
      if (!['pending', 'approved'].includes(request.status.toLowerCase())) return false
      if (request.lessonId === input.lessonId) return true
      return request.lessonId == null && localDateKey(request.leaveDate) === lessonDay
    })
    if (hasActiveLeaveRequest) blockReasons[studentId] = 'LEAVE'
  }

  return blockReasons
}

/** Batch-load lesson attendance and active leave requests for one or more rosters. */
export async function loadLessonFeedbackBlockReasons(
  prisma: PrismaClient,
  lessons: LessonFeedbackRoster[],
  options: { attendanceRecords?: LessonAttendanceStatus[] } = {},
) {
  const normalizedLessons = lessons
    .map((lesson) => ({ ...lesson, studentIds: [...new Set(lesson.studentIds.filter(Boolean))] }))
    .filter((lesson) => lesson.id && lesson.studentIds.length > 0)
  const results = new Map<string, Record<string, LessonFeedbackBlockReason>>()
  if (!normalizedLessons.length) return results

  const lessonIds = normalizedLessons.map((lesson) => lesson.id)
  const studentIds = [...new Set(normalizedLessons.flatMap((lesson) => lesson.studentIds))]
  const localDays = normalizedLessons.map((lesson) => localDateKey(lesson.lessonDate)).sort()
  const dateRange = {
    start: getLocalDayRange(localDays[0]).start,
    end: getLocalDayRange(localDays[localDays.length - 1]).end,
  }

  const [attendances, leaveRequests] = await Promise.all([
    options.attendanceRecords
      ? Promise.resolve(options.attendanceRecords)
      : prisma.attendance.findMany({
          where: {
            lessonId: { in: lessonIds },
            studentId: { in: studentIds },
            deletedAt: null,
          },
          select: { lessonId: true, studentId: true, status: true },
      }),
    prisma.leaveRequest.findMany({
      where: {
        studentId: { in: studentIds },
        status: { in: ['pending', 'approved'] },
        deletedAt: null,
        OR: [
          { lessonId: { in: lessonIds } },
          { lessonId: null, leaveDate: { gte: dateRange.start, lt: dateRange.end } },
        ],
      },
      select: { studentId: true, lessonId: true, leaveDate: true, status: true, deletedAt: true },
    }),
  ])

  for (const lesson of normalizedLessons) {
    results.set(lesson.id, resolveLessonFeedbackBlockReasons({
      lessonId: lesson.id,
      lessonDate: lesson.lessonDate,
      studentIds: lesson.studentIds,
      attendances,
      leaveRequests,
    }))
  }
  return results
}
