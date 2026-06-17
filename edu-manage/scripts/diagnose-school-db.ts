import { PrismaClient } from '@prisma/client'
import { loadDotEnv } from './lib/load-dotenv'

type Target = {
  label: string
  envKey: string
  url?: string
}

function maskDbUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl)
    url.password = url.password ? '***' : ''
    return `${url.protocol}//${url.username}${url.username ? ':***@' : ''}${url.host}${url.pathname}`
  } catch {
    return rawUrl.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@')
  }
}

async function checkTarget(target: Target) {
  console.log(`\n[${target.label}] ${target.envKey}`)
  if (!target.url) {
    console.log('  URL: 未配置')
    return
  }

  console.log(`  URL: ${maskDbUrl(target.url)}`)
  const prisma = new PrismaClient({ datasources: { db: { url: target.url } } })
  try {
    await prisma.$connect()
    const count = await prisma.highSchoolInfo.count()
    console.log(`  连接: 成功`)
    console.log(`  highSchoolInfo: ${count} 条`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const tableMissing = message.includes('does not exist') || message.includes('HighSchoolInfo')
    console.log(`  连接/查询: 失败`)
    console.log(`  highSchoolInfo: ${tableMissing ? '表未迁移' : '无法查询'}`)
    console.log(`  错误: ${message.split('\n')[0]}`)
  } finally {
    await prisma.$disconnect().catch(() => undefined)
  }
}

async function main() {
  loadDotEnv()
  console.log(`DUAL_DB=${process.env.DUAL_DB ?? '(未配置)'}`)
  const targets: Target[] = [
    { label: '默认库', envKey: 'DATABASE_URL', url: process.env.DATABASE_URL },
    { label: 'JUNIOR 库', envKey: 'DATABASE_URL_JUNIOR', url: process.env.DATABASE_URL_JUNIOR },
    { label: 'SENIOR 库', envKey: 'DATABASE_URL_SENIOR', url: process.env.DATABASE_URL_SENIOR },
  ]

  for (const target of targets) {
    await checkTarget(target)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
