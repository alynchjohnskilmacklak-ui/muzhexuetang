import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const dryRun = process.argv.includes('--dry-run')

type DuplicateKey = { lessonId: string; studentId: string; count: bigint }

async function main() {
  const duplicates = await prisma.$queryRaw<DuplicateKey[]>`
    SELECT "lessonId", "studentId", COUNT(*)::bigint AS count
    FROM "Attendance"
    WHERE "lessonId" IS NOT NULL
    GROUP BY "lessonId", "studentId"
    HAVING COUNT(*) > 1
  `

  let deleteCount = 0
  let mergedCount = 0

  for (const duplicate of duplicates) {
    const records = await prisma.attendance.findMany({
      where: { lessonId: duplicate.lessonId, studentId: duplicate.studentId },
      include: { makeupRequest: true },
      orderBy: { createdAt: 'desc' },
    })

    const sorted = [...records].sort((a, b) => {
      const makeupDiff = Number(!!b.makeupRequest) - Number(!!a.makeupRequest)
      if (makeupDiff !== 0) return makeupDiff
      const hoursDiff = Number(b.hoursDeducted || 0) - Number(a.hoursDeducted || 0)
      if (hoursDiff !== 0) return hoursDiff
      return b.createdAt.getTime() - a.createdAt.getTime()
    })

    const keep = sorted[0]
    const rest = sorted.slice(1)
    const latest = records[0]
    const maxHours = Math.max(...records.map((record) => Number(record.hoursDeducted || 0)))
    const notifySent = records.some((record) => record.notifySent)

    console.log(`重复考勤 lessonId=${duplicate.lessonId} studentId=${duplicate.studentId}：保留 ${keep.id}，删除 ${rest.length} 条`)
    deleteCount += rest.length
    mergedCount += 1

    if (dryRun) continue

    await prisma.$transaction(async (tx) => {
      await tx.attendance.update({
        where: { id: keep.id },
        data: {
          status: latest.status,
          hoursDeducted: maxHours,
          notifySent,
          actualMinutes: latest.actualMinutes,
          enrollmentId: keep.enrollmentId || latest.enrollmentId,
        },
      })

      const restIds = rest.map((record) => record.id)
      await tx.makeupRequest.deleteMany({ where: { attendanceId: { in: restIds } } })
      await tx.attendance.deleteMany({ where: { id: { in: restIds } } })
    })
  }

  console.log(`将合并重复考勤组：${mergedCount} 组`)
  console.log(`将删除重复考勤：${deleteCount} 条`)
  if (dryRun) console.log('dry-run 模式未写入数据库')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
