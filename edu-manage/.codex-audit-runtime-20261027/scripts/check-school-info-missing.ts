/**
 * 高中学校信息缺失检查脚本。
 *
 * 使用方式：npm run school:missing
 * 输出：控制台报告 + edu-manage/tmp/missing-school-info.json
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const COMPLETENESS_FIELDS = [
  'address', 'phone', 'website', 'tuitionFee', 'boardingFee',
  'keyFeature', 'gaokaoRate', 'intro', 'tips', 'sourceUrl',
  'sourceNote', 'infoConfidence', 'infoVerifiedAt',
] as const

interface MissingReport {
  schoolId: string
  name: string
  fullName: string
  missingFields: string[]
  missingCount: number
  completeness: number
}

async function main() {
  const schools = await prisma.highSchoolInfo.findMany({
    orderBy: { name: 'asc' },
  })

  const missingLabels: Record<string, string> = {
    address: '缺地址',
    phone: '缺电话',
    website: '缺官网',
    tuitionFee: '缺学费',
    boardingFee: '缺住宿费',
    keyFeature: '缺特色',
    gaokaoRate: '缺升学情况',
    intro: '缺简介',
    tips: '缺报考建议',
    sourceUrl: '缺来源URL',
    sourceNote: '缺来源说明',
    infoConfidence: '缺可信度',
    infoVerifiedAt: '缺核验时间',
  }

  const reports: MissingReport[] = []

  for (const school of schools) {
    const missing = COMPLETENESS_FIELDS.filter((field) => {
      const v = school[field]
      return v === null || v === undefined || v === '' || v === 'unknown'
    })
    reports.push({
      schoolId: school.schoolId,
      name: school.name,
      fullName: school.fullName,
      missingFields: missing,
      missingCount: missing.length,
      completeness: Math.round(
        ((COMPLETENESS_FIELDS.length - missing.length) / COMPLETENESS_FIELDS.length) * 100,
      ),
    })
  }

  reports.sort((a, b) => b.missingCount - a.missingCount)

  // ── 控制台报告 ──

  console.log('\n========================================')
  console.log('  高中学校信息缺失检查报告')
  console.log('========================================\n')

  console.log(`总学校数：${schools.length}`)
  console.log(`信息完整学校数：${reports.filter((r) => r.missingCount === 0).length}`)
  console.log(`信息缺失学校数：${reports.filter((r) => r.missingCount > 0).length}\n`)

  // 按字段统计缺失数量
  const fieldCounts: Record<string, number> = {}
  for (const field of COMPLETENESS_FIELDS) {
    fieldCounts[field] = reports.filter((r) => r.missingFields.includes(field)).length
  }

  console.log('字段缺失统计（按缺失数量排序）：')
  const sortedFields = Object.entries(fieldCounts).sort(([, a], [, b]) => b - a)
  for (const [field, count] of sortedFields) {
    const pct = ((count / schools.length) * 100).toFixed(1)
    console.log(`  ${missingLabels[field] || field}：${count} 所 (${pct}%)`)
  }

  // 待核实统计
  const unverifiedCount = schools.filter(
    (s) => !s.infoConfidence || s.infoConfidence === 'unverified' || s.infoConfidence === 'unknown',
  ).length
  console.log(`  待核实（可信度为空/unverified/unknown）：${unverifiedCount} 所\n`)

  // 按缺失严重度排序输出
  console.log('学校缺失详情（严重 → 轻微）：')
  console.log('─'.repeat(72))
  for (const r of reports) {
    if (r.missingCount === 0) continue
    const labels = r.missingFields.map((f) => missingLabels[f] || f).join('、')
    console.log(`  [${r.completeness}%] ${r.name}（${r.fullName}）：缺 ${r.missingCount} 项 — ${labels}`)
  }
  console.log('─'.repeat(72))

  // 完整学校
  const complete = reports.filter((r) => r.missingCount === 0)
  if (complete.length > 0) {
    console.log(`\n信息完整学校（${complete.length} 所）：`)
    for (const r of complete) {
      console.log(`  ✓ ${r.name}（${r.fullName}）`)
    }
  }

  // ── 写 JSON 文件 ──
  const fs = await import('fs')
  const outputPath = 'tmp/missing-school-info.json'
  fs.writeFileSync(outputPath, JSON.stringify(reports, null, 2), 'utf-8')
  console.log(`\nJSON 报告已写入：${outputPath}`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('脚本执行失败：', e)
  process.exit(1)
})
