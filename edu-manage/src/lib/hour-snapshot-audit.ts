export type HourSnapshotAuditStudent = {
  id: string
  name: string
  remainHours: number
  totalHours: number
  enrollments: Array<{ remainHours: number; totalHours: number }>
}

export type HourSnapshotMismatch = {
  studentId: string
  name: string
  enrollmentCount: number
  snapshotRemainHours: number
  ledgerRemainHours: number
  remainDelta: number
  snapshotTotalHours: number
  ledgerTotalHours: number
  totalDelta: number
  mismatch: 'REMAIN_ONLY' | 'TOTAL_ONLY' | 'BOTH'
}

function finiteNumber(value: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Compare legacy Student snapshots with the active Enrollment ledger without writing data. */
export function auditHourSnapshots(students: HourSnapshotAuditStudent[], tolerance = 0.0001) {
  const mismatches: HourSnapshotMismatch[] = []

  for (const student of students) {
    const ledgerRemainHours = student.enrollments.reduce((sum, item) => sum + finiteNumber(item.remainHours), 0)
    const ledgerTotalHours = student.enrollments.reduce((sum, item) => sum + finiteNumber(item.totalHours), 0)
    const snapshotRemainHours = finiteNumber(student.remainHours)
    const snapshotTotalHours = finiteNumber(student.totalHours)
    const remainDelta = snapshotRemainHours - ledgerRemainHours
    const totalDelta = snapshotTotalHours - ledgerTotalHours
    const remainMismatch = Math.abs(remainDelta) > tolerance
    const totalMismatch = Math.abs(totalDelta) > tolerance

    if (!remainMismatch && !totalMismatch) continue
    mismatches.push({
      studentId: student.id,
      name: student.name,
      enrollmentCount: student.enrollments.length,
      snapshotRemainHours,
      ledgerRemainHours,
      remainDelta,
      snapshotTotalHours,
      ledgerTotalHours,
      totalDelta,
      mismatch: remainMismatch && totalMismatch ? 'BOTH' : remainMismatch ? 'REMAIN_ONLY' : 'TOTAL_ONLY',
    })
  }

  return {
    checkedCount: students.length,
    mismatchCount: mismatches.length,
    remainMismatchCount: mismatches.filter((row) => row.mismatch !== 'TOTAL_ONLY').length,
    totalMismatchCount: mismatches.filter((row) => row.mismatch !== 'REMAIN_ONLY').length,
    mismatches,
  }
}
