export interface LessonAttendanceSubmissionInput {
  attendanceSubmittedAt?: Date | string | null
  status?: string | null
  attendances?: Array<{ studentId?: string | null }>
  expectedStudentIds?: string[]
}

/**
 * `attendanceSubmittedAt` is the canonical marker for new submissions.
 * Older lesson rows may already contain a completed attendance snapshot but
 * predate that marker, so retain a narrow compatibility fallback.
 */
export function hasSubmittedLessonAttendance(
  input: LessonAttendanceSubmissionInput,
) {
  if (input.attendanceSubmittedAt) return true

  const attendanceStudentIds = new Set(
    (input.attendances || [])
      .map((attendance) => attendance.studentId)
      .filter((studentId): studentId is string => Boolean(studentId)),
  )
  if (attendanceStudentIds.size === 0) return false

  if (input.status === 'COMPLETED') return true

  const expectedStudentIds = [...new Set((input.expectedStudentIds || []).filter(Boolean))]
  return expectedStudentIds.length > 0
    && expectedStudentIds.every((studentId) => attendanceStudentIds.has(studentId))
}

/** A lesson only takes place when at least one student actually attends. */
export function hasAttendingStudent(
  records: Array<{ status?: unknown }>,
) {
  return records.some((record) => {
    const status = String(record.status || '').toUpperCase()
    return status === 'PRESENT' || status === 'LATE'
  })
}
