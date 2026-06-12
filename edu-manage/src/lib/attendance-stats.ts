export function calculateAttendanceRate(presentCount: number, totalCount: number) {
  if (totalCount <= 0) return 100
  return Math.round((presentCount / totalCount) * 100)
}

export function clampDeductHours(requestedHours: number, remainHours: number) {
  const requested = Number.isFinite(requestedHours) ? Math.max(0, requestedHours) : 0
  const remain = Number.isFinite(remainHours) ? Math.max(0, remainHours) : 0
  return Math.min(requested, remain)
}