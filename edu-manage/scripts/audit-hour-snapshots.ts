import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { getPrismaForDivision, isDualDbEnabled, prisma as defaultPrisma } from '../src/lib/prisma'
import { activeEnrollmentWhere } from '../src/lib/business-visibility'
import { auditHourSnapshots } from '../src/lib/hour-snapshot-audit'

type DbTarget = { label: string; db: PrismaClient }
const usedClients = new Set<PrismaClient>()

async function auditTarget({ label, db }: DbTarget) {
  const students = await db.student.findMany({
    where: { status: { not: 'INACTIVE' }, deletedAt: null },
    select: {
      id: true,
      name: true,
      remainHours: true,
      totalHours: true,
      enrollments: {
        where: activeEnrollmentWhere,
        select: { remainHours: true, totalHours: true },
      },
    },
    orderBy: { name: 'asc' },
  })
  const report = auditHourSnapshots(students)
  console.log(`[${label}] read-only hour snapshot audit`)
  console.log(JSON.stringify(report, null, 2))
}

async function main() {
  const targets: DbTarget[] = isDualDbEnabled()
    ? [
        { label: 'JUNIOR', db: getPrismaForDivision('JUNIOR') },
        { label: 'SENIOR', db: getPrismaForDivision('SENIOR') },
      ]
    : [{ label: 'DEFAULT', db: defaultPrisma }]
  targets.forEach((target) => usedClients.add(target.db))

  console.log('Mode: read-only. This report does not update Student or Enrollment records.')
  for (const target of targets) await auditTarget(target)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await Promise.all([...usedClients].map((client) => client.$disconnect()))
  })
