import { Prisma, type AcademicTermKind, type PrismaClient } from '@prisma/client'

export const TERM_KINDS: AcademicTermKind[] = ['REGULAR', 'SUMMER', 'WINTER', 'WEEKEND', 'OTHER']

export async function listAcademicTerms(db: PrismaClient, division: string) {
  return db.academicTerm.findMany({
    where: { division },
    orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
    include: {
      _count: { select: { memberships: true, classGroups: true, studyPlans: true } },
    },
  })
}

export async function getActiveAcademicTerm(db: PrismaClient, division: string) {
  return db.academicTerm.findFirst({
    where: { division, status: 'ACTIVE' },
    orderBy: { startDate: 'desc' },
    select: { id: true, name: true, code: true, kind: true, startDate: true, endDate: true },
  })
}

type TermRepairClient = PrismaClient | Prisma.TransactionClient

/**
 * Repairs legacy rows created before operational batches were introduced.
 *
 * This is deliberately idempotent: it only fills NULL term ownership and is
 * also run when a batch is activated. That second safety net matters after an
 * administrator restores an older database backup whose migration history may
 * already say that the one-off backfill ran.
 */
export async function repairLegacyAcademicTermScope(
  db: TermRepairClient,
  input: { termId: string; division: string },
) {
  const groupCount = await db.$executeRaw(Prisma.sql`
    UPDATE "ClassGroup" AS groups
    SET "termId" = ${input.termId}
    FROM "AcademicTerm" AS terms
    WHERE terms."id" = ${input.termId}
      AND terms."division" = ${input.division}
      AND groups."termId" IS NULL
      AND groups."division" = terms."division"
      AND groups."startDate"::date <= terms."endDate"
      AND COALESCE(groups."endDate", groups."startDate")::date >= terms."startDate"
      AND NOT EXISTS (
        SELECT 1
        FROM "AcademicTerm" AS other
        WHERE other."division" = terms."division"
          AND other."id" <> terms."id"
          AND groups."startDate"::date <= other."endDate"
          AND COALESCE(groups."endDate", groups."startDate")::date >= other."startDate"
      )
  `)

  const lessonFeedbackCount = await db.$executeRaw(Prisma.sql`
    UPDATE "ClassroomFeedback" AS feedback
    SET "termId" = ${input.termId}
    FROM "ClassLesson" AS lessons
    JOIN "ClassGroup" AS groups ON groups."id" = lessons."groupId"
    WHERE feedback."termId" IS NULL
      AND feedback."classLessonId" = lessons."id"
      AND groups."termId" = ${input.termId}
  `)

  const groupFeedbackCount = await db.$executeRaw(Prisma.sql`
    UPDATE "ClassroomFeedback" AS feedback
    SET "termId" = ${input.termId}
    FROM "ClassGroup" AS groups
    WHERE feedback."termId" IS NULL
      AND feedback."feedbackGroupId" = groups."id"
      AND groups."termId" = ${input.termId}
  `)

  const datedFeedbackCount = await db.$executeRaw(Prisma.sql`
    UPDATE "ClassroomFeedback" AS feedback
    SET "termId" = ${input.termId}
    FROM "AcademicTerm" AS terms, "Teacher" AS teachers
    WHERE terms."id" = ${input.termId}
      AND terms."division" = ${input.division}
      AND teachers."id" = feedback."teacherId"
      AND teachers."division" = terms."division"
      AND feedback."termId" IS NULL
      AND feedback."createdAt"::date BETWEEN terms."startDate" AND terms."endDate"
      AND EXISTS (
        SELECT 1
        FROM "StudentTermMembership" AS memberships
        WHERE memberships."termId" = terms."id"
          AND memberships."studentId" = ANY(feedback."studentIds")
      )
      AND NOT EXISTS (
        SELECT 1
        FROM "AcademicTerm" AS other
        WHERE other."division" = terms."division"
          AND other."id" <> terms."id"
          AND feedback."createdAt"::date BETWEEN other."startDate" AND other."endDate"
          AND EXISTS (
            SELECT 1
            FROM "StudentTermMembership" AS other_memberships
            WHERE other_memberships."termId" = other."id"
              AND other_memberships."studentId" = ANY(feedback."studentIds")
          )
      )
  `)

  const lessonSalaryCount = await db.$executeRaw(Prisma.sql`
    UPDATE "TeacherSalaryTransaction" AS salary
    SET "termId" = ${input.termId}
    FROM "ClassLesson" AS lessons
    JOIN "ClassGroup" AS groups ON groups."id" = lessons."groupId"
    WHERE salary."termId" IS NULL
      AND salary."lessonId" = lessons."id"
      AND groups."termId" = ${input.termId}
  `)

  const feedbackSalaryCount = await db.$executeRaw(Prisma.sql`
    UPDATE "TeacherSalaryTransaction" AS salary
    SET "termId" = ${input.termId}
    FROM "ClassroomFeedback" AS feedback
    WHERE salary."termId" IS NULL
      AND salary."feedbackId" = feedback."id"
      AND feedback."termId" = ${input.termId}
  `)

  const datedSalaryCount = await db.$executeRaw(Prisma.sql`
    UPDATE "TeacherSalaryTransaction" AS salary
    SET "termId" = ${input.termId}
    FROM "AcademicTerm" AS terms, "Teacher" AS teachers
    WHERE terms."id" = ${input.termId}
      AND terms."division" = ${input.division}
      AND teachers."id" = salary."teacherId"
      AND teachers."division" = terms."division"
      AND salary."termId" IS NULL
      AND COALESCE(salary."lessonDate", salary."createdAt")::date
          BETWEEN terms."startDate" AND terms."endDate"
      AND NOT EXISTS (
        SELECT 1
        FROM "AcademicTerm" AS other
        WHERE other."division" = terms."division"
          AND other."id" <> terms."id"
          AND COALESCE(salary."lessonDate", salary."createdAt")::date
              BETWEEN other."startDate" AND other."endDate"
      )
  `)

  return {
    classGroups: groupCount,
    feedbacks: lessonFeedbackCount + groupFeedbackCount + datedFeedbackCount,
    salaryTransactions: lessonSalaryCount + feedbackSalaryCount + datedSalaryCount,
  }
}

export async function activateAcademicTerm(
  db: PrismaClient,
  input: { termId: string; division: string },
) {
  const term = await db.academicTerm.findFirst({
    where: { id: input.termId, division: input.division },
    include: { memberships: { where: { status: { not: 'WITHDRAWN' } }, select: { studentId: true, grade: true } } },
  })
  if (!term) throw new Error('学期不存在')
  if (term.status === 'ARCHIVED') throw new Error('已归档学期不能重新启用')
  let repaired = { classGroups: 0, feedbacks: 0, salaryTransactions: 0 }

  await db.$transaction(async (tx) => {
    repaired = await repairLegacyAcademicTermScope(tx, input)
    // Activating a term is only a workspace switch. It must not close the
    // previous term's students, classes or study-hall plans. Those lifecycle
    // changes belong exclusively to archiveAcademicTerm(). Keeping the
    // previous workspace as DRAFT makes switching reversible.
    await tx.academicTerm.updateMany({
      where: { division: input.division, status: 'ACTIVE', id: { not: term.id } },
      data: { status: 'DRAFT' },
    })
    await tx.academicTerm.update({ where: { id: term.id }, data: { status: 'ACTIVE' } })
    await tx.studentTermMembership.updateMany({
      where: { termId: term.id, status: 'COMPLETED' },
      data: { status: 'ACTIVE', leftAt: null },
    })

    const studentsByGrade = new Map<string, string[]>()
    for (const membership of term.memberships) {
      if (!membership.grade) continue
      const studentIds = studentsByGrade.get(membership.grade) || []
      studentIds.push(membership.studentId)
      studentsByGrade.set(membership.grade, studentIds)
    }
    for (const [grade, studentIds] of studentsByGrade) {
      await tx.student.updateMany({
        where: { division: input.division, id: { in: studentIds } },
        data: { grade },
      })
    }
  }, { maxWait: 10_000, timeout: 60_000 })
  return { id: term.id, status: 'ACTIVE' as const, syncedStudents: term.memberships.length, repaired }
}

export async function archiveAcademicTerm(
  db: PrismaClient,
  input: { termId: string; division: string },
) {
  const term = await db.academicTerm.findFirst({ where: { id: input.termId, division: input.division } })
  if (!term) throw new Error('学期不存在')
  await db.$transaction([
    db.academicTerm.update({ where: { id: term.id }, data: { status: 'ARCHIVED' } }),
    db.studentTermMembership.updateMany({
      where: { termId: term.id, status: 'ACTIVE' },
      data: { status: 'COMPLETED', leftAt: new Date() },
    }),
    db.classGroup.updateMany({
      where: { termId: term.id, status: { in: ['WAITING', 'ACTIVE'] } },
      data: { status: 'COMPLETED' },
    }),
    db.studyHallPlan.updateMany({
      where: { termId: term.id, status: { in: ['ACTIVE', 'PAUSED'] } },
      data: { status: 'COMPLETED' },
    }),
  ])
  return { id: term.id, status: 'ARCHIVED' as const }
}

export async function deleteAcademicTerm(
  db: PrismaClient,
  input: { termId: string; division: string },
) {
  const term = await db.academicTerm.findFirst({
    where: { id: input.termId, division: input.division },
    include: {
      _count: { select: { memberships: true, classGroups: true, studyPlans: true } },
    },
  })
  if (!term) throw new Error('运营批次不存在')
  if (term.status === 'ACTIVE') throw new Error('当前正在使用的批次不能删除，请先切换到其他批次')
  if (term.status === 'ARCHIVED') throw new Error('历史归档批次不能删除，以免丢失往期数据')
  const relatedCount = term._count.memberships + term._count.classGroups + term._count.studyPlans
  if (relatedCount > 0) throw new Error('该批次已经包含学员、班级或业务记录，只能归档，不能删除')
  await db.academicTerm.delete({ where: { id: term.id } })
  return { id: term.id, deleted: true as const }
}
