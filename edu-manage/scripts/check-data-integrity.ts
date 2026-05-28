import { runDataHealthCheck } from '../src/lib/data-admin/health'
import { prisma } from '../src/lib/prisma'

async function main() {
  const issues = await runDataHealthCheck()
  console.log(`数据健康检查：${new Date().toISOString()}`)
  for (const issue of issues) {
    const sample = issue.sampleIds?.length ? `；样例：${issue.sampleIds.join(', ')}` : ''
    console.log(`${issue.label}：${issue.count} 条（${issue.severity}）${sample}`)
    console.log(`  ${issue.description}`)
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
