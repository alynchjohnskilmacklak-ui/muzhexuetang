import type { Prisma } from '@prisma/client'

type AutomaticMealSyncInput = {
  eligibleStudentIds: string[]
  eatingStudentIds: string[]
  mealDate: Date
  division: string
  recordedBy: string
  groupId: string
  groupName: string
  lessonId: string
  teacherId: string
  teacherName: string
  notes?: string
}

/**
 * Synchronize the first lesson's meal choices without overwriting an
 * administrator's explicit manual decision for the same student and day.
 */
export async function syncAutomaticMealAttendance(
  tx: Prisma.TransactionClient,
  input: AutomaticMealSyncInput,
) {
  const eligibleStudentIds = [...new Set(input.eligibleStudentIds)]
  const eatingStudentIds = new Set(input.eatingStudentIds)
  if (!eligibleStudentIds.length) return

  const existing = await tx.studentMealAttendance.findMany({
    where: { studentId: { in: eligibleStudentIds }, mealDate: input.mealDate },
    select: { id: true, studentId: true, source: true },
  })
  const existingByStudent = new Map(existing.map((record) => [record.studentId, record]))
  const context = {
    division: input.division,
    groupId: input.groupId,
    groupName: input.groupName,
    lessonId: input.lessonId,
    teacherId: input.teacherId,
    teacherName: input.teacherName,
  }

  for (const studentId of eligibleStudentIds) {
    const current = existingByStudent.get(studentId)
    if (current?.source === 'MANUAL') {
      await tx.studentMealAttendance.update({
        where: { id: current.id },
        data: context,
      })
      continue
    }

    await tx.studentMealAttendance.upsert({
      where: { studentId_mealDate: { studentId, mealDate: input.mealDate } },
      create: {
        studentId,
        mealDate: input.mealDate,
        recordedBy: input.recordedBy,
        eating: eatingStudentIds.has(studentId),
        source: 'AUTO',
        notes: input.notes || '教师首节课考勤同步上报',
        ...context,
      },
      update: {
        recordedBy: input.recordedBy,
        eating: eatingStudentIds.has(studentId),
        source: 'AUTO',
        notes: input.notes || '教师首节课考勤同步上报',
        ...context,
      },
    })
  }
}
