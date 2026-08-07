export type BillingEnrollment = {
  remainHours?: number | null
  totalHours?: number | null
  group?: {
    intensiveMode?: string | null
  } | null
}

export function isAccrualEnrollment(enrollment: BillingEnrollment) {
  return enrollment.group?.intensiveMode === 'INTENSIVE'
}

export function hasLowPrepaidHours(
  enrollments: BillingEnrollment[] | null | undefined,
  threshold = 3,
) {
  const prepaid = (enrollments || []).filter((enrollment) => !isAccrualEnrollment(enrollment))
  return prepaid.length > 0
    && prepaid.reduce((sum, enrollment) => sum + Number(enrollment.remainHours || 0), 0) <= threshold
}

export function hasOutstandingPrepaidBalance(
  enrollments: BillingEnrollment[] | null | undefined,
) {
  return hasLowPrepaidHours(enrollments, 0)
}
