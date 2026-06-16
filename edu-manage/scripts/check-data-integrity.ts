import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { PrismaClient } from '@prisma/client'

function loadDotEnv() {
  const envPath = path.join(process.cwd(), '.env')
  if (!existsSync(envPath)) return
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const [, key, rawValue] = match
    if (process.env[key]) continue
    process.env[key] = rawValue.replace(/^"|"$/g, '')
  }
}

async function checkOne(label: string, prisma: PrismaClient, runDataHealthCheck: typeof import('../src/lib/data-admin/health').runDataHealthCheck) {
  const issues = await runDataHealthCheck(prisma)
  const prefix = label ? `[${label}] ` : ''
  console.log(`${prefix}数据健康检查：${new Date().toISOString()}`)
  for (const issue of issues) {
    const sample = issue.sampleIds?.length ? `；样例：${issue.sampleIds.join(', ')}` : ''
    console.log(`${prefix}${issue.label}：${issue.count} 条（${issue.severity}）${sample}`)
    console.log(`  ${issue.description}`)
  }
}

async function main() {
  loadDotEnv()
  const { getPrismaForDivision, isDualDbEnabled, prisma } = await import('../src/lib/prisma')
  const { runDataHealthCheck } = await import('../src/lib/data-admin/health')

  if (isDualDbEnabled()) {
    await checkOne('初中部', getPrismaForDivision('JUNIOR'), runDataHealthCheck)
    await checkOne('高中部', getPrismaForDivision('SENIOR'), runDataHealthCheck)
    await Promise.all([
      getPrismaForDivision('JUNIOR').$disconnect(),
      getPrismaForDivision('SENIOR').$disconnect(),
    ])
    return
  }

  await checkOne('', prisma, runDataHealthCheck)
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
