import type { Prisma } from '@prisma/client'

export const TEACHER_MEAL_APPEND_NOTE = '后续课次追加就餐'

export type TeacherMealAppendInput = {
  studentIds: string[]
  mealDate: Date
  division: string
  recordedBy: string
  groupId: string
  groupName: string
  lessonId: string
  teacherId: string
  teacherName: string
}

export type TeacherMealAppendResult = {
  addedStudentIds: string[]
  alreadyEatingStudentIds: string[]
  skippedManualStudentIds: string[]
}

/**
 * Adds late arrivals to the daily meal ledger without changing attendance or
 * hours. Explicit administrator decisions are kept authoritative.
 */
export async function appendTeacherMealAttendance(
  tx: Prisma.TransactionClient,
  input: TeacherMealAppendInput,
): Promise<TeacherMealAppendResult> {
  const studentIds = [...new Set(input.studentIds.filter(Boolean))]
  if (!studentIds.length) return { addedStudentIds: [], alreadyEatingStudentIds: [], skippedManualStudentIds: [] }

  const existing = await tx.studentMealAttendance.findMany({
    where: { studentId: { in: studentIds }, mealDate: input.mealDate },
    select: { studentId: true, eating: true, source: true },
  })
  const beforeByStudent = new Map(existing.map((record) => [record.studentId, record]))
  const notes = `${TEACHER_MEAL_APPEND_NOTE}：${input.teacherName}`
  const context = {
    division: input.division,
    recordedBy: input.recordedBy,
    eating: true,
    source: 'AUTO',
    groupId: input.groupId,
    groupName: input.groupName,
    lessonId: input.lessonId,
    teacherId: input.teacherId,
    teacherName: input.teacherName,
    notes,
  }

  const missingIds = studentIds.filter((studentId) => !beforeByStudent.has(studentId))
  if (missingIds.length) {
    await tx.studentMealAttendance.createMany({
      data: missingIds.map((studentId) => ({ studentId, mealDate: input.mealDate, ...context })),
      skipDuplicates: true,
    })
  }

  const automaticNoMealIds = existing
    .filter((record) => record.source === 'AUTO' && !record.eating)
    .map((record) => record.studentId)
  if (automaticNoMealIds.length) {
    await tx.studentMealAttendance.updateMany({
      where: {
        studentId: { in: automaticNoMealIds },
        mealDate: input.mealDate,
        source: 'AUTO',
        eating: false,
      },
      data: context,
    })
  }

  const finalRecords = await tx.studentMealAttendance.findMany({
    where: { studentId: { in: studentIds }, mealDate: input.mealDate },
    select: { studentId: true, eating: true, source: true },
  })
  const finalByStudent = new Map(finalRecords.map((record) => [record.studentId, record]))

  return {
    addedStudentIds: studentIds.filter((studentId) => {
      const before = beforeByStudent.get(studentId)
      const after = finalByStudent.get(studentId)
      return Boolean(after?.eating && (!before || (before.source === 'AUTO' && !before.eating)))
    }),
    alreadyEatingStudentIds: studentIds.filter((studentId) => {
      const before = beforeByStudent.get(studentId)
      return Boolean(before?.eating && finalByStudent.get(studentId)?.eating)
    }),
    skippedManualStudentIds: studentIds.filter((studentId) => {
      const after = finalByStudent.get(studentId)
      return Boolean(after && !after.eating && after.source !== 'AUTO')
    }),
  }
}
