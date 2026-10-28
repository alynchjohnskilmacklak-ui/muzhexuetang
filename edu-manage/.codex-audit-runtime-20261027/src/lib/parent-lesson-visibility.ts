import { enrollmentIncludesSubject } from '@/lib/enrollment-subjects'

type ParentLesson = {
  isManual?: boolean
  _count?: { lessonStudents?: number }
  subject?: string | null
  lessonStudents?: Array<{ studentId: string }> | null
  group?: {
    intensiveMode?: string | null
    course?: { subject?: string | null } | null
    enrollments?: Array<{ studentId?: string; subjects?: string[] | null; student?: { id?: string } | null }> | null
  } | null
}

/** Snapshot rows are authoritative for manual and intensive lessons. */
export function isParentStudentInLesson(lesson: ParentLesson, studentId: string): boolean {
  if (!studentId) return false
  const roster = lesson.lessonStudents || []
  if (lesson.isManual || lesson.group?.intensiveMode === 'INTENSIVE' || (lesson._count?.lessonStudents ?? roster.length) > 0) {
    return roster.some((row) => row.studentId === studentId)
  }
  return Boolean(lesson.group?.enrollments?.some((enrollment) =>
    (enrollment.studentId || enrollment.student?.id) === studentId
      && enrollmentIncludesSubject(enrollment.subjects || [], lesson.subject || lesson.group?.course?.subject),
  ))
}
