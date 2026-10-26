import type { PrismaClient } from '@prisma/client'
import { loadDotEnv } from './lib/load-dotenv'

type LegacyScheduleAudit = {
  total: number
  active: number
  deleted: number
  studentLinks: number
  attendanceLinks: number
  leaveLinks: number
  hourTransactionLinks: number
  statuses: Record<string, number>
  firstStart: string | null
  lastEnd: string | null
}

const auditSql = `
  SELECT json_build_object(
    'total', (SELECT count(*) FROM "Schedule"),
    'active', (SELECT count(*) FROM "Schedule" WHERE status <> 'cancelled' AND "deletedAt" IS NULL),
    'deleted', (SELECT count(*) FROM "Schedule" WHERE "deletedAt" IS NOT NULL),
    'studentLinks', (SELECT count(*) FROM "ScheduleStudent"),
    'attendanceLinks', (SELECT count(*) FROM "Attendance" WHERE "scheduleId" IS NOT NULL),
    'leaveLinks', (SELECT count(*) FROM "LeaveRequest" WHERE "scheduleId" IS NOT NULL),
    'hourTransactionLinks', (SELECT count(*) FROM "HourTransaction" WHERE "scheduleId" IS NOT NULL),
    'statuses', COALESCE((
      SELECT json_object_agg(status, count)
      FROM (SELECT status, count(*) AS count FROM "Schedule" GROUP BY status ORDER BY status) grouped
    ), '{}'::json),
    'firstStart', (SELECT min("startTime") FROM "Schedule"),
    'lastEnd', (SELECT max("endTime") FROM "Schedule")
  ) AS report
`

async function auditOne(label: string, prisma: PrismaClient) {
  const [tableState] = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT to_regclass('public."Schedule"') IS NOT NULL AS exists
  `
  if (!tableState?.exists) {
    return { division: label, retired: true, safeToRetire: true }
  }

  const [row] = await prisma.$queryRawUnsafe<Array<{ report: LegacyScheduleAudit }>>(auditSql)
  const report = row.report
  return {
    division: label,
    retired: false,
    legacySchedules: { total: report.total, active: report.active, deleted: report.deleted },
    dependencies: {
      scheduleStudents: report.studentLinks,
      attendances: report.attendanceLinks,
      leaveRequests: report.leaveLinks,
      hourTransactions: report.hourTransactionLinks,
    },
    statuses: report.statuses,
    dateRange: { firstStart: report.firstStart, lastEnd: report.lastEnd },
    safeToRetire:
      report.total === 0 &&
      report.studentLinks === 0 &&
      report.attendanceLinks === 0 &&
      report.leaveLinks === 0 &&
      report.hourTransactionLinks === 0,
  }
}

async function main() {
  loadDotEnv()
  const { getPrismaForDivision, isDualDbEnabled, prisma } = await import('../src/lib/prisma')

  if (isDualDbEnabled()) {
    const junior = getPrismaForDivision('JUNIOR')
    const senior = getPrismaForDivision('SENIOR')
    try {
      console.log(JSON.stringify(await Promise.all([
        auditOne('JUNIOR', junior),
        auditOne('SENIOR', senior),
      ]), null, 2))
    } finally {
      await Promise.all([junior.$disconnect(), senior.$disconnect()])
    }
    return
  }

  try {
    console.log(JSON.stringify([await auditOne('SINGLE', prisma)], null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
