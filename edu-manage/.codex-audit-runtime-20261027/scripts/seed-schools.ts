import { highschoolSeedDetails } from './highschool-seed-details'
import { createJuniorPrisma } from './lib/highschool-restore-utils'

async function main() {
  const prisma = createJuniorPrisma()
  try {
    console.log('开始初始化学校数据...')
    for (const school of highschoolSeedDetails) {
      await prisma.highSchoolInfo.upsert({
        where: { schoolId: school.schoolId },
        update: school,
        create: school,
      })
      console.log(`✓ ${school.name}`)
    }
    console.log(`完成！共写入 ${highschoolSeedDetails.length} 所学校信息`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
