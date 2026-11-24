import { enrollmentIncludesSubject } from '@/lib/enrollment-subjects'
import { localDateKey } from '@/lib/date/local-day'

/**
 * Resolve the students who belong to one subject lesson.
 *
 * Current and future lessons must use ClassLessonStudent snapshots because
 * those snapshots are the source of truth for per-subject enrollment. Only a
 * historical lesson with no snapshot may fall back to the old group roster.
 */
export function resolveLessonStudentIds(
  snapshotStudentIds: string[],
  activeEnrollmentStudentIds: string[],
  lessonDate: Date,
  now = new Date(),
) {
  const snapshots = [...new Set(snapshotStudentIds.filter(Boolean))]
  if (snapshots.length > 0) return snapshots

  // Compare calendar days in the product timezone instead of relying on the
  // host process timezone, which may be UTC in production.
  if (localDateKey(lessonDate) >= localDateKey(now)) return []

  return [...new Set(activeEnrollmentStudentIds.filter(Boolean))]
}

export function isStudentInLessonRoster(
  studentId: string,
  snapshotStudentIds: string[],
  activeEnrollmentStudentIds: string[],
  lessonDate: Date,
  now = new Date(),
) {
  return resolveLessonStudentIds(snapshotStudentIds, activeEnrollmentStudentIds, lessonDate, now).includes(studentId)
}

export function resolveSubjectLessonStudentIds(
  snapshotStudentIds: string[],
  activeEnrollments: Array<{ studentId: string; subjects: string[] }>,
  subject: string | null | undefined,
  lessonDate: Date,
  now = new Date(),
) {
  const snapshots = [...new Set(snapshotStudentIds.filter(Boolean))]
  // A saved historical roster is an immutable record of who belonged to that
  // subject lesson at the time. Later withdrawals or subject changes must not
  // rewrite that historical attendance and feedback scope.
  if (snapshots.length > 0 && localDateKey(lessonDate) < localDateKey(now)) return snapshots

  const eligibleEnrollmentIds = activeEnrollments
    .filter((enrollment) => enrollmentIncludesSubject(enrollment.subjects, subject))
    .map((enrollment) => enrollment.studentId)
  const eligibleEnrollmentIdSet = new Set(eligibleEnrollmentIds)
  return resolveLessonStudentIds(
    snapshots.filter((studentId) => eligibleEnrollmentIdSet.has(studentId)),
    eligibleEnrollmentIds,
    lessonDate,
    now,
  )
}
