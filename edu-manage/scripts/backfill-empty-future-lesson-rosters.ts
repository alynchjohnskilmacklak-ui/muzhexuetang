import 'dotenv/config'
import { Prisma, PrismaClient } from '@prisma/client'
import { getPrismaForDivision, isDualDbEnabled, prisma as defaultPrisma } from '../src/lib/prisma'
import { localDateColumnValue, todayLocal } from '../src/lib/date/local-day'
import { planFutureLessonRosterBackfill, type FutureLessonRosterCandidate } from '../src/lib/future-lesson-roster-backfill'

const apply = process.argv.includes('--apply')
const usedClients = new Set<PrismaClient>()

function candidateWhere(todayStart: Date): Prisma.ClassLessonWhereInput {
  return {
    lessonDate: { gte: todayStart },
    status: 'SCHEDULED',
    deletedAt: null,
    attendanceSubmittedAt: null,
    hoursDeductedAt: null,
    lessonStudents: { none: {} },
    attendances: { none: {} },
    group: {
      status: { not: 'ARCHIVED' },
      deletedAt: null,
      course: { isActive: true, deletedAt: null },
      enrollments: {
        some: {
          status: 'ACTIVE',
          deletedAt: null,
          student: { status: { not: 'INACTIVE' }, deletedAt: null },
        },
      },
    },
  }
}

const candidateSelect = {
  id: true,
  lessonDate: true,
  startTime: true,
  teacherId: true,
  subject: true,
  status: true,
  deletedAt: true,
  attendanceSubmittedAt: true,
  hoursDeductedAt: true,
  lessonStudents: { select: { studentId: true } },
  attendances: { select: { id: true } },
  group: {
    select: {
      id: true,
      name: true,
      status: true,
      deletedAt: true,
      teacherId: true,
      course: { select: { subject: true, isActive: true, deletedAt: true } },
      teacherAssignments: { select: { teacherId: true, subject: true } },
      enrollments: {
        where: {
          status: 'ACTIVE',
          deletedAt: null,
          student: { status: { not: 'INACTIVE' }, deletedAt: null },
        },
        select: {
          studentId: true,
          status: true,
          deletedAt: true,
          subjects: true,
          student: { select: { status: true, deletedAt: true } },
        },
      },
    },
  },
} satisfies Prisma.ClassLessonSelect

type DbTarget = { label: string; db: PrismaClient }

async function findPlans(db: PrismaClient) {
  const todayStart = localDateColumnValue(todayLocal())
  const lessons = await db.classLesson.findMany({
    where: candidateWhere(todayStart),
    select: candidateSelect,
    orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
  })
  return planFutureLessonRosterBackfill(lessons as FutureLessonRosterCandidate[])
}

async function applyOne(db: PrismaClient, lessonId: string) {
  return db.$transaction(async (tx) => {
    const lesson = await tx.classLesson.findFirst({
      where: { id: lessonId, ...candidateWhere(localDateColumnValue(todayLocal())) },
      select: candidateSelect,
    })
    if (!lesson) return 0

    const [plan] = planFutureLessonRosterBackfill([lesson as FutureLessonRosterCandidate])
    if (!plan) return 0

    const result = await tx.classLessonStudent.createMany({
      data: plan.studentIds.map((studentId) => ({ lessonId: plan.lessonId, studentId })),
      skipDuplicates: true,
    })
    return result.count
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

async function runTarget({ label, db }: DbTarget) {
  const plans = await findPlans(db)
  const studentCount = plans.reduce((sum, plan) => sum + plan.studentIds.length, 0)
  console.log(`[${label}] upcoming empty lessons with eligible roster: ${plans.length}; student rows: ${studentCount}`)
  for (const plan of plans) {
    console.log(`[${label}] ${plan.lessonDate} | ${plan.groupName} | ${plan.subject} | ${plan.lessonId} | students=${plan.studentIds.join(',')}`)
  }

  if (!apply) {
    console.log(`[${label}] dry-run: no database writes. Review the rows before running with --apply.`)
    return
  }

  let inserted = 0
  for (const plan of plans) inserted += await applyOne(db, plan.lessonId)
  console.log(`[${label}] inserted ${inserted} lesson-student roster rows.`)
}

async function main() {
  const targets: DbTarget[] = isDualDbEnabled()
    ? [
        { label: 'JUNIOR', db: getPrismaForDivision('JUNIOR') },
        { label: 'SENIOR', db: getPrismaForDivision('SENIOR') },
      ]
    : [{ label: 'DEFAULT', db: defaultPrisma }]
  targets.forEach((target) => usedClients.add(target.db))

  console.log(apply
    ? 'Mode: apply. Only reviewed upcoming lessons with no roster or attendance are considered.'
    : 'Mode: dry-run. No database writes.')
  for (const target of targets) await runTarget(target)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await Promise.all([...usedClients].map((client) => client.$disconnect()))
  })
