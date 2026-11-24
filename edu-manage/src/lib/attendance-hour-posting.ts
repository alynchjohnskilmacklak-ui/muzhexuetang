import type { Prisma } from '@prisma/client'
import { accrueEnrollmentHours, deductEnrollmentHours } from '@/lib/attendance-balance'
import { roundHours } from '@/lib/hours'
import { syncStudentHourSnapshot } from '@/lib/student-hour-snapshot'

type AttendanceHourPostingInput = {
  attendanceId: string
  enrollmentId: string
  enrollmentTotalHours: number
  studentId: string
  lessonId: string
  groupName: string
  operatorId: string
  hours: number
}

export type AttendanceHourPostingResult = {
  posted: boolean
  mode: 'accrual' | 'deduction' | null
  amount: number
  beforeHours: number | null
  afterHours: number | null
}

export type AttendanceHourRefundInput = {
  attendanceId: string
  enrollmentId: string
  studentId: string
  lessonId: string
  operatorId: string
  previousHours: number
  targetHours: number
  reason: string
}

/**
 * Posts the financial side of one attendance record.
 *
 * Accrual-mode enrollments start from zero and add attended hours. Prepaid
 * enrollments deduct from their remaining balance. The attendance marker and
 * hour ledger are always written together in the caller's transaction.
 */
export async function postAttendanceHours(
  tx: Prisma.TransactionClient,
  input: AttendanceHourPostingInput,
): Promise<AttendanceHourPostingResult> {
  if (input.hours <= 0) return { posted: false, mode: null, amount: 0, beforeHours: null, afterHours: null }

  if (input.enrollmentTotalHours <= 0) {
    const accrual = await accrueEnrollmentHours(tx, input.enrollmentId, input.hours)
    if (accrual.accrued <= 0) return { posted: false, mode: null, amount: 0, beforeHours: accrual.beforeHours, afterHours: accrual.afterHours }
    await tx.attendance.update({
      where: { id: input.attendanceId },
      data: { hoursDeducted: accrual.accrued },
    })
    await tx.hourTransaction.create({
      data: {
        studentId: input.studentId,
        enrollmentId: input.enrollmentId,
        lessonId: input.lessonId,
        amount: accrual.accrued,
        beforeHours: accrual.beforeHours,
        afterHours: accrual.afterHours,
        type: 'ATTENDANCE_ACCRUE',
        reason: `${input.groupName} 考勤累计课时`,
        operatorId: input.operatorId,
      },
    })
    await syncStudentHourSnapshot(tx, input.studentId)
    return { posted: true, mode: 'accrual', amount: accrual.accrued, beforeHours: accrual.beforeHours, afterHours: accrual.afterHours }
  }

  const deduction = await deductEnrollmentHours(tx, input.enrollmentId, input.hours)
  if (deduction.deducted <= 0) return { posted: false, mode: null, amount: 0, beforeHours: deduction.beforeHours, afterHours: deduction.afterHours }
  await tx.attendance.update({
    where: { id: input.attendanceId },
    data: { hoursDeducted: deduction.deducted },
  })
  await tx.hourTransaction.create({
    data: {
      studentId: input.studentId,
      enrollmentId: input.enrollmentId,
      lessonId: input.lessonId,
      amount: -deduction.deducted,
      beforeHours: deduction.beforeHours,
      afterHours: deduction.afterHours,
      type: 'ATTENDANCE_DEDUCT',
      reason: `${input.groupName} 考勤扣课时`,
      operatorId: input.operatorId,
    },
  })
  await syncStudentHourSnapshot(tx, input.studentId)
  return { posted: true, mode: 'deduction', amount: deduction.deducted, beforeHours: deduction.beforeHours, afterHours: deduction.afterHours }
}

/** Reverse only the portion no longer charged, in the same transaction as the attendance correction. */
export async function refundAttendanceHours(
  tx: Prisma.TransactionClient,
  input: AttendanceHourRefundInput,
) {
  const refund = roundHours(Math.max(0, input.previousHours - input.targetHours))
  const targetHours = roundHours(Math.max(0, input.targetHours))
  if (refund <= 0) return { refunded: 0, beforeHours: null, afterHours: null }

  const enrollment = await tx.enrollment.findUnique({
    where: { id: input.enrollmentId },
    select: { totalHours: true, remainHours: true, usedHours: true },
  })
  if (!enrollment) throw new Error('ENROLLMENT_NOT_FOUND')

  const isPrepaid = Number(enrollment.totalHours || 0) > 0
  const beforeHours = roundHours(Number(isPrepaid ? enrollment.remainHours : enrollment.usedHours) || 0)
  const updated = await tx.enrollment.updateMany({
    where: { id: input.enrollmentId, usedHours: { gte: refund } },
    data: isPrepaid
      ? { remainHours: { increment: refund }, usedHours: { decrement: refund } }
      : { usedHours: { decrement: refund } },
  })
  if (updated.count !== 1) throw new Error('ENROLLMENT_REFUND_CONFLICT')

  const afterHours = roundHours(isPrepaid ? beforeHours + refund : Math.max(0, beforeHours - refund))
  await tx.attendance.update({
    where: { id: input.attendanceId },
    data: { hoursDeducted: targetHours },
  })
  await tx.hourTransaction.create({
    data: {
      studentId: input.studentId,
      enrollmentId: input.enrollmentId,
      lessonId: input.lessonId,
      amount: refund,
      beforeHours,
      afterHours,
      type: 'ATTENDANCE_REFUND',
      reason: input.reason,
      operatorId: input.operatorId,
    },
  })
  await syncStudentHourSnapshot(tx, input.studentId)
  return { refunded: refund, beforeHours, afterHours }
}
