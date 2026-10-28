import { resolve } from 'node:path'

import { createJuniorPrisma, isMissingString, writeJsonReport } from './lib/highschool-restore-utils'

const STRING_FIELDS = [
  'intro',
  'keyFeature',
  'gaokaoRate',
  'address',
  'distanceFromXinle',
  'boardingFee',
  'tuitionFee',
  'tips',
  'website',
  'phone',
] as const

async function main() {
  const prisma = createJuniorPrisma()
  try {
    const schools = await prisma.highSchoolInfo.findMany({
      select: {
        schoolId: true,
        name: true,
        intro: true,
        keyFeature: true,
        gaokaoRate: true,
        address: true,
        distanceFromXinle: true,
        boardingFee: true,
        tuitionFee: true,
        tips: true,
        website: true,
        phone: true,
        yiTong: true,
      },
      orderBy: { schoolId: 'asc' },
    })

    const missingCounts: Record<string, number> = {}
    const missingSchoolsByField: Record<string, Array<{ schoolId: string; name: string }>> = {}
    for (const field of STRING_FIELDS) {
      const missing = schools.filter(school => isMissingString(school[field]))
      missingCounts[field] = missing.length
      missingSchoolsByField[field] = missing.map(({ schoolId, name }) => ({ schoolId, name }))
    }
    const missingYiTong = schools.filter(school => school.yiTong == null || school.yiTong === 0)
    missingCounts.yiTong = missingYiTong.length
    missingSchoolsByField.yiTong = missingYiTong.map(({ schoolId, name }) => ({ schoolId, name }))

    const report = {
      generatedAt: new Date().toISOString(),
      database: 'JUNIOR',
      total: schools.length,
      missingCounts,
      missingSchoolsByField,
    }
    const output = resolve(process.cwd(), 'tmp/highschool-info-audit-before.json')
    writeJsonReport(output, report)
    console.log(JSON.stringify({ output, total: report.total, missingCounts }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
