import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const envFiles = [
  '.env.development.local',
  '.env.local',
  '.env.development',
  '.env',
]

function parseEnvValue(raw) {
  const value = raw.trim()
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  return value.replace(/\s+#.*$/, '').trim()
}

function readLocalEnv(name) {
  if (process.env[name]) return process.env[name]
  for (const file of envFiles) {
    const path = resolve(process.cwd(), file)
    if (!existsSync(path)) continue
    const line = readFileSync(path, 'utf8').split(/\r?\n/)
      .find((entry) => new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`).test(entry))
    if (!line) continue
    const value = parseEnvValue(line.slice(line.indexOf('=') + 1))
    if (value) return value
  }
  return ''
}

function refuse(reason) {
  console.error(`[dev-schema] ${reason}`)
  process.exit(1)
}

const dualDb = readLocalEnv('DUAL_DB').toLowerCase() === 'true'
const databaseUrls = dualDb
  ? [readLocalEnv('DATABASE_URL_JUNIOR'), readLocalEnv('DATABASE_URL_SENIOR')]
  : [readLocalEnv('DATABASE_URL')]
if (databaseUrls.some((url) => !url)) refuse('数据库 URL 配置不完整，开发服务器不会启动。')

for (const databaseUrl of databaseUrls) {
  let host
  try {
    host = new URL(databaseUrl).hostname.toLowerCase().replace(/^\[|\]$/g, '')
  } catch {
    refuse('数据库 URL 格式无效；已停止启动，未连接数据库。')
  }

  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    refuse('开发环境 schema 校验只允许 loopback 数据库，已拒绝连接非本机地址。')
  }
}

const prismaCli = resolve(process.cwd(), 'node_modules/prisma/build/index.js')
if (!existsSync(prismaCli)) refuse('找不到本地 Prisma CLI，请先安装项目依赖。')

for (const databaseUrl of databaseUrls) {
  const result = spawnSync(process.execPath, [
    prismaCli,
    'migrate',
    'diff',
    '--from-schema-datasource',
    'prisma/schema.prisma',
    '--to-schema-datamodel',
    'prisma/schema.prisma',
    '--exit-code',
  ], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: 'utf8',
    timeout: 45_000,
  })

  if (result.error || result.status === 1) {
    refuse('无法核对本机数据库 schema；请确认本机数据库正在运行后重试。')
  }

  if (result.status === 2) {
    refuse('本机数据库 schema 与 prisma/schema.prisma 不一致。请先审查变更，再运行 npm run db:push -- --skip-generate。')
  }

  if (result.status !== 0) {
    refuse('schema 校验未能完成，开发服务器不会启动。')
  }
}

console.log(`[dev-schema] ${databaseUrls.length} 个本机数据库 schema 与 Prisma 模型一致。`)
