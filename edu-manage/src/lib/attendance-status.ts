export type AttendanceRecordStatus = 'PRESENT' | 'LEAVE' | 'ABSENT' | 'MAKEUP'
export type AttendanceDisplayStatus = 'PRESENT' | 'LEAVE'

const VALID_ATTENDANCE_STATUSES = new Set<AttendanceRecordStatus>([
  'PRESENT',
  'LEAVE',
  'ABSENT',
  'MAKEUP',
])

export function normalizeAttendanceRecordStatus(value: unknown): AttendanceRecordStatus {
  const raw = String(value || '').toUpperCase()
  const normalized = (raw === 'LATE' ? 'PRESENT' : raw) as AttendanceRecordStatus
  return VALID_ATTENDANCE_STATUSES.has(normalized) ? normalized : 'PRESENT'
}

export function toAttendanceDisplayStatus(value: unknown): AttendanceDisplayStatus {
  const normalized = normalizeAttendanceRecordStatus(value)
  return normalized === 'LEAVE' || normalized === 'ABSENT' ? 'LEAVE' : 'PRESENT'
}

/**
 * The current attendance control intentionally exposes only two choices.
 * Preserve legacy four-state records until the operator explicitly changes them.
 */
export function resolveAttendanceSubmissionStatus(input: {
  displayedStatus: AttendanceDisplayStatus
  originalStatus: unknown
  changed: boolean
}): AttendanceRecordStatus {
  return input.changed
    ? input.displayedStatus
    : normalizeAttendanceRecordStatus(input.originalStatus)
}
