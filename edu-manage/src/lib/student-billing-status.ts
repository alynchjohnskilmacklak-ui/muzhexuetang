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

export type BillingFee = {
  status?: string | null
  dueDate?: Date | string | null
  amount?: number | null
}

/**
 * 真正的“欠费”判定：存在一笔 status = 'pending' 且已过 dueDate 的应收费用。
 * 与课时余额（remainHours）完全解耦 —— 课时用尽 ≠ 欠费，正常结课 ≠ 欠费。
 */
export function hasOverdueFees(
  fees: BillingFee[] | null | undefined,
  now: Date = new Date(),
) {
  return (fees || []).some(
    (fee) =>
      fee.status === 'pending' &&
      fee.dueDate != null &&
      new Date(fee.dueDate).getTime() < now.getTime(),
  )
}

/**
 * @deprecated 旧语义把“课时耗尽”当作“欠费”，与钱无关，会误伤正常结课的学生。
 * 请改用 hasOverdueFees(fees)（基于 Fee.status='pending' 且 dueDate 已过）。
 */
export function hasOutstandingPrepaidBalance(
  enrollments: BillingEnrollment[] | null | undefined,
) {
  return hasLowPrepaidHours(enrollments, 0)
}
