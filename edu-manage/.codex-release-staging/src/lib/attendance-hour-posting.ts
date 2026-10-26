import type { Prisma } from '@prisma/client'
import { accrueEnrollmentHours, deductEnrollmentHours } from '@/lib/attendance-balance'

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
  if (input.hours <= 0) return { posted: false, mode: null, amount: 0 }

  if (input.enrollmentTotalHours <= 0) {
    const accrual = await accrueEnrollmentHours(tx, input.enrollmentId, input.hours)
    if (accrual.accrued <= 0) return { posted: false, mode: null, amount: 0 }
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
    return { posted: true, mode: 'accrual', amount: accrual.accrued }
  }

  const deduction = await deductEnrollmentHours(tx, input.enrollmentId, input.hours)
  if (deduction.deducted <= 0) return { posted: false, mode: null, amount: 0 }
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
  return { posted: true, mode: 'deduction', amount: deduction.deducted }
}
