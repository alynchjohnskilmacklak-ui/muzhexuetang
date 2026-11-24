import { enrollmentIncludesSubject } from '@/lib/enrollment-subjects'
import { localDateKey, normalizeTimeHHmm } from '@/lib/date/local-day'
import { chinaClock, resolveLessonSubjectForEnrollment } from '@/lib/enrollment-subject-change'

export type FutureLessonRosterCandidate = {
  id: string
  lessonDate: Date
  startTime: string
  teacherId: string | null
  subject: string | null
  status: string
  deletedAt: Date | null
  attendanceSubmittedAt: Date | null
  hoursDeductedAt: Date | null
  lessonStudents: Array<{ studentId: string }>
  attendances: Array<{ id: string }>
  group: {
    id: string
    name: string
    status: string
    deletedAt: Date | null
    teacherId: string | null
    course: { subject: string | null; isActive: boolean; deletedAt: Date | null }
    teacherAssignments: Array<{ teacherId: string; subject: string | null }>
    enrollments: Array<{
      studentId: string
      status: string
      deletedAt: Date | null
      student: { status: string; deletedAt: Date | null }
      subjects: string[]
    }>
  }
}

export type FutureLessonRosterBackfillPlan = {
  lessonId: string
  groupName: string
  lessonDate: string
  subject: string
  studentIds: string[]
}

/**
 * Plan missing snapshots only for lessons that have not started and have no
 * attendance history. It is deliberately read-only; the CLI decides whether
 * to apply the returned rows after an explicit --apply flag.
 */
export function planFutureLessonRosterBackfill(
  lessons: FutureLessonRosterCandidate[],
  now = new Date(),
): FutureLessonRosterBackfillPlan[] {
  const clock = chinaClock(now)
  const plans: FutureLessonRosterBackfillPlan[] = []

  for (const lesson of lessons) {
    const lessonDay = localDateKey(lesson.lessonDate)
    if (
      lesson.status !== 'SCHEDULED'
      || lesson.deletedAt
      || lesson.attendanceSubmittedAt
      || lesson.hoursDeductedAt
      || lesson.lessonStudents.length > 0
      || lesson.attendances.length > 0
      || lessonDay < clock.day
      || (lessonDay === clock.day && normalizeTimeHHmm(lesson.startTime) <= clock.time)
      || lesson.group.deletedAt
      || lesson.group.status === 'ARCHIVED'
      || lesson.group.course.deletedAt
      || !lesson.group.course.isActive
    ) continue

    const subject = resolveLessonSubjectForEnrollment(lesson, {
      teacherId: lesson.group.teacherId,
      courseSubject: lesson.group.course.subject,
      teacherAssignments: lesson.group.teacherAssignments,
    })
    const studentIds = [...new Set(lesson.group.enrollments
      .filter((enrollment) => (
        enrollment.status === 'ACTIVE'
        && !enrollment.deletedAt
        && enrollment.student.status !== 'INACTIVE'
        && !enrollment.student.deletedAt
        && enrollment.studentId
        && enrollmentIncludesSubject(enrollment.subjects, subject)
      ))
      .map((enrollment) => enrollment.studentId))].sort()

    if (studentIds.length === 0 || !subject) continue
    plans.push({
      lessonId: lesson.id,
      groupName: lesson.group.name,
      lessonDate: lessonDay,
      subject,
      studentIds,
    })
  }

  return plans.sort((a, b) => a.lessonDate.localeCompare(b.lessonDate) || a.lessonId.localeCompare(b.lessonId))
}
