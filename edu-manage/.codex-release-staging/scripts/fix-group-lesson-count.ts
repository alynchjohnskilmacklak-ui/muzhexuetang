import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { getPrismaForDivision, isDualDbEnabled, prisma as defaultPrisma } from '../src/lib/prisma'

const apply = process.argv.includes('--apply')
const dryRun = !apply
const usedClients = new Set<PrismaClient>()

type DbTarget = {
  label: string
  db: PrismaClient
}

async function fixOneDatabase({ label, db }: DbTarget) {
  const groups = await db.classGroup.findMany({
    select: {
      id: true,
      name: true,
      totalLessons: true,
      completedLessons: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  const [lessonCounts, completedCounts] = await Promise.all([
    db.classLesson.groupBy({
      by: ['groupId'],
      _count: { _all: true },
    }),
    db.classLesson.groupBy({
      by: ['groupId'],
      where: { status: 'COMPLETED' },
      _count: { _all: true },
    }),
  ])

  const totalByGroup = new Map(lessonCounts.map((item) => [item.groupId, item._count._all]))
  const completedByGroup = new Map(completedCounts.map((item) => [item.groupId, item._count._all]))
  const updates = groups
    .map((group) => {
      const totalLessons = totalByGroup.get(group.id) ?? 0
      const completedLessons = completedByGroup.get(group.id) ?? 0
      return {
        id: group.id,
        name: group.name,
        oldTotal: group.totalLessons,
        newTotal: totalLessons,
        oldCompleted: group.completedLessons,
        newCompleted: completedLessons,
      }
    })
    .filter((item) => item.oldTotal !== item.newTotal || item.oldCompleted !== item.newCompleted)

  console.log(`[${label}] ClassGroup count: ${groups.length}`)
  console.log(`[${label}] groups to update: ${updates.length}`)

  for (const item of updates) {
    console.log(
      `[${label}] ${item.name} (${item.id}) totalLessons ${item.oldTotal} -> ${item.newTotal}, completedLessons ${item.oldCompleted} -> ${item.newCompleted}`,
    )
  }

  if (dryRun) {
    console.log(`[${label}] dry-run: database was not changed. Add --apply to write updates.`)
    return
  }

  for (const item of updates) {
    await db.classGroup.update({
      where: { id: item.id },
      data: {
        totalLessons: item.newTotal,
        completedLessons: item.newCompleted,
      },
    })
  }

  console.log(`[${label}] updated ${updates.length} ClassGroup counter records.`)
}

async function main() {
  const targets: DbTarget[] = isDualDbEnabled()
    ? [
        { label: 'JUNIOR', db: getPrismaForDivision('JUNIOR') },
        { label: 'SENIOR', db: getPrismaForDivision('SENIOR') },
      ]
    : [{ label: 'DEFAULT', db: defaultPrisma }]
  targets.forEach((target) => usedClients.add(target.db))

  console.log(dryRun ? 'Mode: dry-run. No database writes.' : 'Mode: apply. Only ClassGroup counter fields will be updated.')
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
