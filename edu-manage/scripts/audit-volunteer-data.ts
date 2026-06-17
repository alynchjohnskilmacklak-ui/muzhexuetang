import type { PrismaClient } from '@prisma/client'
import { loadDotEnv } from './lib/load-dotenv'
import { XINLE_ALLOCATION_2025, nameMatches } from '../src/data/volunteer-2025'

type DbArg = 'chuzhong' | 'gaozhong'
type Issue = {
  middleSchool: string
  highSchool: string
  quota: number
  message: string
}

function parseDbArg(): DbArg {
  const raw = process.argv.find((arg) => arg.startsWith('--db='))?.split('=')[1]
  if (!raw) return 'chuzhong'
  if (raw === 'chuzhong' || raw === 'gaozhong') return raw
  throw new Error('参数 --db 仅支持 chuzhong 或 gaozhong')
}

function printIssues(title: string, issues: Issue[]) {
  console.log(`\n${title}：${issues.length}`)
  if (issues.length === 0) return
  for (const issue of issues) {
    console.log(`- ${issue.middleSchool} → ${issue.highSchool}（名额 ${issue.quota}）：${issue.message}`)
  }
}

async function main() {
  loadDotEnv()
  const dbArg = parseDbArg()
  const division = dbArg === 'gaozhong' ? 'SENIOR' : 'JUNIOR'
  const requiredUrl =
    process.env.DUAL_DB === 'true'
      ? division === 'SENIOR' ? 'DATABASE_URL_SENIOR' : 'DATABASE_URL_JUNIOR'
      : 'DATABASE_URL'
  if (!process.env[requiredUrl]) {
    throw new Error(`缺少 ${requiredUrl}，请先配置数据库连接后再运行巡检脚本`)
  }
  const { getPrismaForDivision } = await import('../src/lib/prisma')
  const prisma = getPrismaForDivision(division) as PrismaClient

  const schools = await prisma.highSchoolInfo.findMany({
    select: {
      name: true,
      fullName: true,
      yiTong: true,
      allocationLine: true,
    },
  })

  const missingSchool: Issue[] = []
  const missingYiTong: Issue[] = []
  const missingAllocationLine: Issue[] = []

  for (const [middleSchool, quotaMap] of Object.entries(XINLE_ALLOCATION_2025)) {
    for (const [highSchool, quota] of Object.entries(quotaMap)) {
      if (quota <= 0) continue
      const matched = schools.find((school) => nameMatches(school.name, school.fullName, highSchool))
      if (!matched) {
        missingSchool.push({
          middleSchool,
          highSchool,
          quota,
          message: '库中查无此校',
        })
        continue
      }
      if (matched.yiTong == null) {
        missingYiTong.push({
          middleSchool,
          highSchool,
          quota,
          message: 'yiTong 为空，会影响分配生级联排序',
        })
      }
      if (matched.allocationLine == null) {
        missingAllocationLine.push({
          middleSchool,
          highSchool,
          quota,
          message: 'allocationLine 为空，当前业务会使用控制线兜底',
        })
      }
    }
  }

  console.log(`分配生数据巡检：${division === 'JUNIOR' ? '初中库' : '高中库'}`)
  printIssues('有名额但库中查无此校', missingSchool)
  printIssues('有名额但 yiTong 为 null', missingYiTong)
  printIssues('有名额但 allocationLine 为 null', missingAllocationLine)

  console.log('\n汇总：')
  console.log(`- 查无学校：${missingSchool.length}`)
  console.log(`- 缺 yiTong：${missingYiTong.length}`)
  console.log(`- 缺 allocationLine：${missingAllocationLine.length}`)

  await prisma.$disconnect()

  if (missingSchool.length > 0 || missingYiTong.length > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
