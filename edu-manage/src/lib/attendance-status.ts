export type AttendanceRecordStatus = 'PRESENT' | 'LEAVE' | 'ABSENT' | 'MAKEUP'
export type AttendanceDisplayStatus = 'PRESENT' | 'LEAVE'

export function canSubmitTeacherAttendance(rosterReady: boolean, studentCount: number): boolean {
  return rosterReady && Number.isFinite(studentCount) && studentCount > 0
}

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

/** 严格解析（提交入口用）：非法状态返回 null，由调用方拒绝，不再静默容错为 PRESENT。 */
export function parseAttendanceRecordStatus(value: unknown): AttendanceRecordStatus | null {
  const raw = String(value || '').toUpperCase()
  return VALID_ATTENDANCE_STATUSES.has(raw as AttendanceRecordStatus) ? (raw as AttendanceRecordStatus) : null
}

export function toAttendanceDisplayStatus(value: unknown): AttendanceDisplayStatus {
  const normalized = normalizeAttendanceRecordStatus(value)
  return normalized === 'LEAVE' || normalized === 'ABSENT' ? 'LEAVE' : 'PRESENT'
}

/** Mark unblocked students present while preserving visible leave/absence states. */
export function markAllPresentPreservingLeave(
  studentIds: string[],
  currentStatuses: ReadonlyMap<string, AttendanceDisplayStatus>,
) {
  const statuses = new Map(currentStatuses)
  const updatedStudentIds: string[] = []
  const preservedStudentIds: string[] = []

  for (const studentId of studentIds) {
    if (currentStatuses.get(studentId) === 'LEAVE') {
      preservedStudentIds.push(studentId)
      continue
    }
    statuses.set(studentId, 'PRESENT')
    updatedStudentIds.push(studentId)
  }

  return { statuses, updatedStudentIds, preservedStudentIds }
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
