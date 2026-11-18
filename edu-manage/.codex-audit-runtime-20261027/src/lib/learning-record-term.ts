import type { PrismaClient } from '@prisma/client'

type RecordTermInput = {
  division: string
  studentId: string
  classLessonId?: string | null
}

/** Resolve the active operational batch for a newly created learning record. */
export async function resolveLearningRecordTermId(
  db: PrismaClient,
  input: RecordTermInput,
) {
  if (input.classLessonId) {
    const lesson = await db.classLesson.findFirst({
      where: {
        id: input.classLessonId,
        group: {
          division: input.division,
          term: { status: 'ACTIVE' },
          enrollments: { some: { studentId: input.studentId, status: 'ACTIVE' } },
        },
      },
      select: { group: { select: { termId: true } } },
    })
    return lesson?.group.termId || null
  }

  const membership = await db.studentTermMembership.findFirst({
    where: {
      studentId: input.studentId,
      status: 'ACTIVE',
      term: { division: input.division, status: 'ACTIVE' },
    },
    orderBy: { term: { startDate: 'desc' } },
    select: { termId: true },
  })
  return membership?.termId || null
}
