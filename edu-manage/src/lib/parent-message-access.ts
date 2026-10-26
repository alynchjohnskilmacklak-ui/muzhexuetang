import type { Prisma } from '@prisma/client'

type AccessClient = Pick<Prisma.TransactionClient, 'classroomFeedback' | 'enrollment'>

export type ParentMessageActor = {
  id: string
  role: string
  teacherId: string | null
}

export type ParentMessageAccessRecord = {
  feedbackId: string | null
  studentId: string | null
  teacherId: string | null
}

export async function teacherCanAccessParentMessage(
  prisma: AccessClient,
  message: ParentMessageAccessRecord,
  teacherId: string,
) {
  if (message.feedbackId) {
    const feedbackCount = await prisma.classroomFeedback.count({
      where: {
        id: message.feedbackId,
        teacherId,
        ...(message.studentId ? { studentIds: { has: message.studentId } } : {}),
      },
    })
    return feedbackCount > 0
  }

  if (!message.studentId || (message.teacherId && message.teacherId !== teacherId)) return false
  const taught = await prisma.enrollment.count({
    where: {
      studentId: message.studentId,
      status: 'ACTIVE',
      group: {
        OR: [
          { teacherId },
          { teacherAssignments: { some: { teacherId } } },
        ],
      },
    },
  })
  return taught > 0
}

export function getAccessibleParentMessageWhere(
  actor: ParentMessageActor,
  division: string,
): Prisma.ParentMessageWhereInput | null {
  if (actor.role === 'parent') {
    return { parentId: actor.id }
  }

  if (actor.role === 'admin') {
    return { student: { division } }
  }

  if (actor.role !== 'teacher' || !actor.teacherId) {
    return null
  }

  return {
    OR: [
      {
        feedbackId: { not: null },
        feedback: { teacherId: actor.teacherId },
      },
      {
        feedbackId: null,
        AND: [
          {
            student: {
              enrollments: {
                some: {
                  status: 'ACTIVE',
                  group: {
                    OR: [
                      { teacherId: actor.teacherId },
                      { teacherAssignments: { some: { teacherId: actor.teacherId } } },
                    ],
                  },
                },
              },
            },
          },
          { OR: [{ teacherId: actor.teacherId }, { teacherId: null }] },
        ],
      },
    ],
  }
}
