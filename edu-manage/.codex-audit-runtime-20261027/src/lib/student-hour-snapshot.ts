import type { Prisma } from '@prisma/client'
import { activeEnrollmentWhere } from '@/lib/business-visibility'

/** Keep the legacy student-level balance aligned with the active enrollment ledger. */
export async function syncStudentHourSnapshot(tx: Prisma.TransactionClient, studentId: string) {
  const activeEnrollments = await tx.enrollment.findMany({
    where: { ...activeEnrollmentWhere, studentId },
    select: { remainHours: true, totalHours: true },
  })
  const remainHours = activeEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.remainHours || 0), 0)
  const totalHours = activeEnrollments.reduce((sum, enrollment) => sum + Number(enrollment.totalHours || 0), 0)

  await tx.student.update({
    where: { id: studentId },
    data: { remainHours, totalHours },
  })
  return { remainHours, totalHours }
}
