import { existsSync, readdirSync } from 'node:fs'
import { execFileSync, spawnSync } from 'node:child_process'
import path from 'node:path'
import { loadDotEnv } from './lib/load-dotenv'

const CURRENT_SCHEMA_PATCH = `
ALTER TABLE "HighSchoolInfo" ADD COLUMN IF NOT EXISTS "admitRankByYear" JSONB;
ALTER TABLE "HighSchoolInfo" ADD COLUMN IF NOT EXISTS "admitRankRef" INTEGER;
`

type DbTarget = {
  label: string
  envKey: string
  url?: string
}

function run(command: string, args: string[], options: { input?: string } = {}) {
  const result = spawnSync(command, args, {
    input: options.input,
    encoding: 'utf8',
    stdio: options.input ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
    shell: false,
  })

  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
    throw new Error(`${command} ${args.join(' ')} 执行失败${detail ? `\n${detail}` : ''}`)
  }

  return result.stdout.trim()
}

function runNpxPrisma(args: string[]) {
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  return run(npxCmd, ['prisma', ...args])
}

function migrationNames() {
  const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations')
  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

function assertPsqlAvailable() {
  try {
    execFileSync('psql', ['--version'], { stdio: 'ignore' })
  } catch {
    throw new Error('服务器缺少 psql 命令，无法直接补生产库字段。请先安装 postgresql-client。')
  }
}

async function main() {
  loadDotEnv()

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) throw new Error('缺少 DATABASE_URL，请先确认 /opt/edu-manage/.env')
  if (!existsSync(path.join(process.cwd(), 'prisma', 'migrations'))) {
    throw new Error('缺少 prisma/migrations 目录，请在项目根目录运行')
  }

  console.log('1/4 检查 psql')
  assertPsqlAvailable()

  console.log('2/4 补齐当前生产库字段（幂等执行）')
  const targets: DbTarget[] = [
    { label: '默认库', envKey: 'DATABASE_URL', url: process.env.DATABASE_URL },
    { label: 'JUNIOR 库', envKey: 'DATABASE_URL_JUNIOR', url: process.env.DATABASE_URL_JUNIOR },
    { label: 'SENIOR 库', envKey: 'DATABASE_URL_SENIOR', url: process.env.DATABASE_URL_SENIOR },
  ]
  const seenUrls = new Set<string>()
  for (const target of targets) {
    if (!target.url || seenUrls.has(target.url)) continue
    seenUrls.add(target.url)
    console.log(`  patch: ${target.label} (${target.envKey})`)
    run('psql', [target.url, '-v', 'ON_ERROR_STOP=1'], { input: CURRENT_SCHEMA_PATCH })
  }

  console.log('3/4 标记当前仓库迁移为已应用，修复 P3005 baseline')
  for (const name of migrationNames()) {
    try {
      runNpxPrisma(['migrate', 'resolve', '--applied', name])
      console.log(`  applied: ${name}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message.includes('already recorded as applied')) {
        console.log(`  already applied: ${name}`)
        continue
      }
      throw error
    }
  }

  console.log('4/4 检查迁移状态')
  const status = runNpxPrisma(['migrate', 'status'])
  console.log(status)
  console.log('生产库 baseline 已完成。后续部署可继续执行 prisma generate、npm run build、pm2 restart。')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
