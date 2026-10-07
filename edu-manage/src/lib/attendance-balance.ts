import type { Prisma } from '@prisma/client'
import { roundHours } from '@/lib/hours'

export type AttendanceDeduction = {
  deducted: number
  beforeHours: number
  afterHours: number
}

export type AttendanceAccrual = {
  accrued: number
  beforeHours: number
  afterHours: number
}

/**
 * Accrue attendance hours for accrual-mode enrollments (totalHours === 0,
 * e.g. students joined without a prepaid package). Unlike deduction, the
 * record only tracks hours actually attended: usedHours grows, remainHours
 * stays 0. Only the hours for this attendance are ever added, so re-running
 * settlement never double counts.
 */
export async function accrueEnrollmentHours(
  tx: Prisma.TransactionClient,
  enrollmentId: string,
  attendedHours: number,
): Promise<AttendanceAccrual> {
  const attended = roundHours(Math.max(0, attendedHours))
  if (attended <= 0) return { accrued: 0, beforeHours: 0, afterHours: 0 }

  const current = await tx.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { usedHours: true },
  })
  const beforeHours = roundHours(Number(current?.usedHours || 0))
  await tx.enrollment.update({
    where: { id: enrollmentId },
    data: { usedHours: { increment: attended } },
  })
  return { accrued: attended, beforeHours, afterHours: roundHours(beforeHours + attended) }
}

/**
 * Atomically deduct up to the available enrollment balance.
 * The conditional update prevents concurrent lessons from taking the same
 * remaining hours. A short retry preserves the previous partial-deduction
 * behavior when another transaction changes the balance first.
 */
export async function deductEnrollmentHours(
  tx: Prisma.TransactionClient,
  enrollmentId: string,
  requestedHours: number,
): Promise<AttendanceDeduction> {
  const requested = roundHours(Math.max(0, requestedHours))
  if (requested <= 0) return { deducted: 0, beforeHours: 0, afterHours: 0 }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await tx.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { remainHours: true },
    })
    const available = roundHours(Number(current?.remainHours || 0))
    const safeDeduct = roundHours(Math.min(requested, available))
    if (safeDeduct <= 0) return { deducted: 0, beforeHours: available, afterHours: available }

    const claimed = await tx.enrollment.updateMany({
      where: { id: enrollmentId, remainHours: { gte: safeDeduct } },
      data: {
        usedHours: { increment: safeDeduct },
        remainHours: { decrement: safeDeduct },
      },
    })
    if (claimed.count !== 1) continue

    const updated = await tx.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { remainHours: true },
    })
    const afterHours = roundHours(Number(updated?.remainHours || 0))
    return {
      deducted: safeDeduct,
      beforeHours: roundHours(afterHours + safeDeduct),
      afterHours,
    }
  }

  throw new Error('ENROLLMENT_BALANCE_CONFLICT')
}
