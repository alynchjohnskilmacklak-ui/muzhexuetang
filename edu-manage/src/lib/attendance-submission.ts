import { parseAttendanceRecordStatus, type AttendanceRecordStatus } from '@/lib/attendance-status'

export interface LessonAttendanceSubmissionInput {
  attendanceSubmittedAt?: Date | string | null
  status?: string | null
  attendances?: Array<{ studentId?: string | null }>
  expectedStudentIds?: string[]
}

export type ValidatedAttendanceSubmissionRecord = {
  studentId: string
  status: AttendanceRecordStatus
  actualMinutes?: number | null
  rollCallStatus?: 'PRESENT' | 'ABSENT' | 'LATE' | null
}

export type AttendanceSubmissionValidation =
  | { ok: true; records: ValidatedAttendanceSubmissionRecord[] }
  | { ok: false; reason: 'EMPTY' | 'INVALID_RECORD' | 'DUPLICATE_STUDENT' | 'OUTSIDE_ROSTER' | 'MISSING_ROSTER_STUDENT' | 'INVALID_STATUS' | 'INVALID_MINUTES' }

/** Reject stale or ambiguous client rosters before any attendance write begins. */
export function validateAttendanceSubmissionRecords(
  records: unknown[],
  eligibleStudentIds: ReadonlySet<string>,
): AttendanceSubmissionValidation {
  if (records.length === 0) return { ok: false, reason: 'EMPTY' }

  const seenStudentIds = new Set<string>()
  const normalized: ValidatedAttendanceSubmissionRecord[] = []

  for (const value of records) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { ok: false, reason: 'INVALID_RECORD' }
    }

    const record = value as Record<string, unknown>
    const studentId = typeof record.studentId === 'string' ? record.studentId.trim() : ''
    if (!studentId) return { ok: false, reason: 'INVALID_RECORD' }
    if (seenStudentIds.has(studentId)) return { ok: false, reason: 'DUPLICATE_STUDENT' }
    seenStudentIds.add(studentId)
    if (!eligibleStudentIds.has(studentId)) return { ok: false, reason: 'OUTSIDE_ROSTER' }

    const status = parseAttendanceRecordStatus(record.status)
    if (!status) return { ok: false, reason: 'INVALID_STATUS' }

    const hasRollCallStatus = Object.prototype.hasOwnProperty.call(record, 'rollCallStatus')
    let rollCallStatus: ValidatedAttendanceSubmissionRecord['rollCallStatus']
    if (hasRollCallStatus) {
      if (record.rollCallStatus === null) {
        rollCallStatus = null
      } else if (record.rollCallStatus === 'PRESENT' || record.rollCallStatus === 'ABSENT' || record.rollCallStatus === 'LATE') {
        rollCallStatus = record.rollCallStatus
      } else {
        return { ok: false, reason: 'INVALID_STATUS' }
      }
    }

    let actualMinutes: number | null | undefined
    if (record.actualMinutes == null || record.actualMinutes === '') {
      actualMinutes = record.actualMinutes == null ? null : undefined
    } else {
      const parsedMinutes = Number(record.actualMinutes)
      if (!Number.isFinite(parsedMinutes) || parsedMinutes < 0) {
        return { ok: false, reason: 'INVALID_MINUTES' }
      }
      actualMinutes = parsedMinutes || null
    }

    normalized.push({
      studentId,
      status,
      actualMinutes,
      ...(hasRollCallStatus ? { rollCallStatus } : {}),
    })
  }

  if (seenStudentIds.size !== eligibleStudentIds.size) {
    return { ok: false, reason: 'MISSING_ROSTER_STUDENT' }
  }

  return { ok: true, records: normalized }
}

export function isCancelledOrPostponedLesson(status: string | null | undefined) {
  return status === 'CANCELLED' || status === 'POSTPONED'
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
