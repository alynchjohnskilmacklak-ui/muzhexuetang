import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { getPrismaForDivision, isDualDbEnabled, prisma as defaultPrisma } from '../src/lib/prisma'
import { roundHours } from '../src/lib/hours'

const apply = process.argv.includes('--apply')
const dryRun = !apply
const usedClients = new Set<PrismaClient>()

type DbTarget = {
  label: string
  db: PrismaClient
}

function hoursPerLesson(lessonMinutes: number | null | undefined) {
  return roundHours(Number(lessonMinutes || 40) / 60)
}

async function syncStudentTotals(db: PrismaClient, studentIds: string[]) {
  for (const studentId of studentIds) {
    const enrollments = await db.enrollment.findMany({
      where: { studentId, status: 'ACTIVE' },
      select: { remainHours: true, totalHours: true },
    })
    await db.student.update({
      where: { id: studentId },
      data: {
        remainHours: roundHours(enrollments.reduce((sum, item) => sum + Number(item.remainHours || 0), 0)),
        totalHours: roundHours(enrollments.reduce((sum, item) => sum + Number(item.totalHours || 0), 0)),
      },
    })
  }
}

async function fixOneDatabase({ label, db }: DbTarget) {
  const enrollments = await db.enrollment.findMany({
    where: { status: 'ACTIVE' },
    include: {
      student: { select: { id: true, name: true } },
      group: {
        select: {
          id: true,
          name: true,
          totalLessons: true,
          lessonMinutes: true,
          course: { select: { name: true, type: true } },
          _count: { select: { classLessons: true } },
        },
      },
    },
    orderBy: { enrolledAt: 'asc' },
  })

  const [attendanceRows, transactionRows] = await Promise.all([
    db.attendance.findMany({
      where: { enrollmentId: { not: null }, hoursDeducted: { gt: 0 } },
      select: { enrollmentId: true, hoursDeducted: true },
    }),
    db.hourTransaction.findMany({
      where: { enrollmentId: { not: null }, type: 'ATTENDANCE_DEDUCT', amount: { lt: 0 } },
      select: { enrollmentId: true, amount: true },
    }),
  ])

  const attendanceByEnrollment = new Map<string, number>()
  for (const row of attendanceRows) {
    if (!row.enrollmentId) continue
    attendanceByEnrollment.set(row.enrollmentId, (attendanceByEnrollment.get(row.enrollmentId) || 0) + Number(row.hoursDeducted || 0))
  }

  const transactionByEnrollment = new Map<string, number>()
  for (const row of transactionRows) {
    if (!row.enrollmentId) continue
    transactionByEnrollment.set(row.enrollmentId, (transactionByEnrollment.get(row.enrollmentId) || 0) + Math.abs(Number(row.amount || 0)))
  }

  const updates = enrollments.map((enrollment) => {
    const lessonCount = Number(enrollment.group._count.classLessons || enrollment.group.totalLessons || 0)
    const totalHours = roundHours(lessonCount * hoursPerLesson(enrollment.group.lessonMinutes))
    const attendanceDeducted = attendanceByEnrollment.get(enrollment.id) || 0
    const transactionDeducted = transactionByEnrollment.get(enrollment.id) || 0
    const usedHours = roundHours(attendanceDeducted > 0 ? attendanceDeducted : transactionDeducted)
    const remainHours = roundHours(Math.max(0, totalHours - usedHours))
    return {
      id: enrollment.id,
      studentId: enrollment.studentId,
      studentName: enrollment.student.name,
      groupName: enrollment.group.name,
      courseName: enrollment.group.course.name,
      lessonCount,
      oldTotal: roundHours(Number(enrollment.totalHours || 0)),
      newTotal: totalHours,
      oldUsed: roundHours(Number(enrollment.usedHours || 0)),
      newUsed: usedHours,
      oldRemain: roundHours(Number(enrollment.remainHours || 0)),
      newRemain: remainHours,
    }
  })

  const changed = updates.filter((item) => (
    item.oldTotal !== item.newTotal
    || item.oldUsed !== item.newUsed
    || item.oldRemain !== item.newRemain
  ))

  console.log(`[${label}] active enrollments: ${enrollments.length}`)
  console.log(`[${label}] enrollments to update: ${changed.length}`)

  for (const item of updates) {
    const mark = changed.some((changedItem) => changedItem.id === item.id) ? '*' : '-'
    console.log(
      `[${label}] ${mark} ${item.studentName} | ${item.groupName} | ${item.lessonCount}节 | remain ${item.oldRemain} -> ${item.newRemain} | total ${item.oldTotal} -> ${item.newTotal} | used ${item.oldUsed} -> ${item.newUsed}`,
    )
  }

  if (dryRun) {
    console.log(`[${label}] dry-run: database was not changed. Run backup first, then add --apply to write updates.`)
    return
  }

  for (const item of changed) {
    await db.enrollment.update({
      where: { id: item.id },
      data: {
        totalHours: item.newTotal,
        usedHours: item.newUsed,
        remainHours: item.newRemain,
      },
    })
  }
  await syncStudentTotals(db, [...new Set(changed.map((item) => item.studentId))])
  console.log(`[${label}] updated ${changed.length} enrollment records and synced ${new Set(changed.map((item) => item.studentId)).size} students.`)
}

async function main() {
  const targets: DbTarget[] = isDualDbEnabled()
    ? [
        { label: 'JUNIOR', db: getPrismaForDivision('JUNIOR') },
        { label: 'SENIOR', db: getPrismaForDivision('SENIOR') },
      ]
    : [{ label: 'DEFAULT', db: defaultPrisma }]
  targets.forEach((target) => usedClients.add(target.db))

  console.log(dryRun ? 'Mode: dry-run. No database writes.' : 'Mode: apply. Sensitive billing counters will be updated.')
  console.log('Before --apply, run scripts/backup-db.sh and manually verify several dry-run rows.')
  for (const target of targets) {
    await fixOneDatabase(target)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await Promise.all([...usedClients].map((client) => client.$disconnect()))
  })
