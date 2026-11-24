import type { PrismaClient } from '@prisma/client'
import { visibleStudentWhere } from '@/lib/business-visibility'

export const MANUAL_SINGLE_SESSION_STUDENT_ID = '__single_session_manual__'

export type SingleSessionTeacher = {
  division: string
}

export async function resolveStandaloneFeedbackTeacher(
  prisma: PrismaClient,
  requester: SingleSessionTeacher,
  requestedTeacherId: string,
) {
  const id = requestedTeacherId.trim()
  if (!id) return null
  return prisma.teacher.findFirst({
    where: { id, division: requester.division, status: { not: 'RESIGNED' } },
    select: { id: true, name: true, division: true, subjects: true, gender: true, avatar: true, tierLevel: true },
  })
}

/**
 * Resolve a parent-linked learner from the teacher's own division for a
 * standalone feedback. Enrollment and teacher assignment are intentionally
 * not required for this workflow.
 */
export async function resolveStandaloneFeedbackStudents(
  prisma: PrismaClient,
  teacher: SingleSessionTeacher,
  requestedStudentIds: string[],
) {
  if (requestedStudentIds.length !== 1 || requestedStudentIds[0] === MANUAL_SINGLE_SESSION_STUDENT_ID) return null

  const students = await prisma.student.findMany({
    where: {
      id: { in: requestedStudentIds },
      division: teacher.division,
      ...visibleStudentWhere,
      OR: [{ parentId: { not: null } }, { parentUserId: { not: null } }],
    },
    select: { id: true, name: true, grade: true, parentId: true, parentUserId: true },
  })
  if (students.length !== requestedStudentIds.length) return null

  const parentIds = [...new Set(students.flatMap((student) => [student.parentId, student.parentUserId]).filter((id): id is string => Boolean(id)))]
  const parents = parentIds.length
    ? await prisma.user.findMany({
        where: { id: { in: parentIds }, role: 'parent', division: teacher.division, status: { not: 'deleted' } },
        select: { id: true },
      })
    : []
  const validParentIds = new Set(parents.map((parent) => parent.id))
  const linkedStudents = students.filter((student) =>
    Boolean((student.parentId && validParentIds.has(student.parentId)) || (student.parentUserId && validParentIds.has(student.parentUserId))),
  )
  return linkedStudents.length === requestedStudentIds.length ? linkedStudents : null
}
