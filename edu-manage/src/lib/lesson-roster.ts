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

  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  if (lessonDate >= todayStart) return []

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
  const eligibleEnrollmentIds = activeEnrollments
    .filter((enrollment) => enrollmentIncludesSubject(enrollment.subjects, subject))
    .map((enrollment) => enrollment.studentId)
  const eligibleEnrollmentIdSet = new Set(eligibleEnrollmentIds)
  return resolveLessonStudentIds(
    snapshotStudentIds.filter((studentId) => eligibleEnrollmentIdSet.has(studentId)),
    eligibleEnrollmentIds,
    lessonDate,
    now,
  )
}
import { enrollmentIncludesSubject } from '@/lib/enrollment-subjects'
