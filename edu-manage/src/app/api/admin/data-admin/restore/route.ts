import { NextRequest, NextResponse } from 'next/server'
import { assertDangerAuth } from '@/lib/danger-guard'
import { apiHandler } from '@/lib/api-handler'
import { createActivityLog } from '@/lib/data-admin/entities-server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const execAsync = promisify(exec)
const BACKUP_DIR = process.env.BACKUP_DIR || '/data/backups/edu-manage'

function loadEnv(key: string): string {
  const val = process.env[key] ?? ''
  if (!val) {
    try {
      const envPath = path.resolve(process.cwd(), '.env')
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8')
        const match = content.match(new RegExp(`^${key}=(.+)$`, 'm'))
        if (match) return match[1].replace(/^["']|["']$/g, '')
      }
    } catch { /* ignore */ }
  }
  return val
}

function findDump(backupDir: string, keyword: string): string {
  const files = fs.readdirSync(backupDir)
  const dump = files.find((f) => f.includes(keyword) && f.endsWith('.dump'))
  if (!dump) throw new Error(`备份目录中找不到包含 "${keyword}" 的 .dump 文件`)
  return path.join(backupDir, dump)
}

async function restoreOne(dumpPath: string, dbUrl: string): Promise<string> {
  const pgUrl = dbUrl.split('?')[0]
  const cmd = `pg_restore --clean --if-exists --no-owner --no-acl --dbname="${pgUrl}" "${dumpPath}"`
  console.log('[restore]', cmd)
  const { stdout, stderr } = await execAsync(cmd, { timeout: 600_000 })
  if (stderr) console.warn('[restore] stderr:', stderr)
  return stdout.slice(-500)
}

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json()
  const auth = await assertDangerAuth(body)

  const backupDir: string = body.backupFile || ''
  const targetDivision: string = body.targetDivision || ''

  if (!backupDir || typeof backupDir !== 'string') {
    return NextResponse.json({ error: '请选择备份' }, { status: 400 })
  }

  // Prevent path traversal
  const resolved = path.resolve(backupDir)
  const allowed = path.resolve(BACKUP_DIR)
  if (!resolved.startsWith(allowed)) {
    return NextResponse.json({ error: '备份路径不在允许目录内' }, { status: 400 })
  }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    return NextResponse.json({ error: '备份目录不存在' }, { status: 400 })
  }

  let output = ''

  if (targetDivision === 'BOTH') {
    // 初中部
    const juniorDump = findDump(resolved, 'chuzhong')
    const juniorUrl = loadEnv('DATABASE_URL_JUNIOR')
    if (!juniorUrl) return NextResponse.json({ error: '未找到初中部数据库连接(DATABASE_URL_JUNIOR)' }, { status: 500 })
    output += await restoreOne(juniorDump, juniorUrl)

    // 高中部
    const seniorDump = findDump(resolved, 'gaozhong')
    const seniorUrl = loadEnv('DATABASE_URL_SENIOR')
    if (!seniorUrl) return NextResponse.json({ error: '未找到高中部数据库连接(DATABASE_URL_SENIOR)' }, { status: 500 })
    output += await restoreOne(seniorDump, seniorUrl)

    await createActivityLog(auth.userId, 'MANUAL_RESTORE', 'System', 'restore', {
      backupDir: resolved,
      divisions: ['JUNIOR', 'SENIOR'],
    })
  } else if (targetDivision === 'SENIOR') {
    const dumpPath = findDump(resolved, 'gaozhong')
    const dbUrl = loadEnv('DATABASE_URL_SENIOR')
    if (!dbUrl) return NextResponse.json({ error: '未找到高中部数据库连接(DATABASE_URL_SENIOR)' }, { status: 500 })
    output = await restoreOne(dumpPath, dbUrl)

    await createActivityLog(auth.userId, 'MANUAL_RESTORE', 'System', 'restore', {
      backupDir: resolved,
      division: 'SENIOR',
    })
  } else {
    // JUNIOR (default)
    const dumpPath = findDump(resolved, 'chuzhong')
    const dbUrl = loadEnv('DATABASE_URL_JUNIOR')
    if (!dbUrl) return NextResponse.json({ error: '未找到初中部数据库连接(DATABASE_URL_JUNIOR)' }, { status: 500 })
    output = await restoreOne(dumpPath, dbUrl)

    await createActivityLog(auth.userId, 'MANUAL_RESTORE', 'System', 'restore', {
      backupDir: resolved,
      division: 'JUNIOR',
    })
  }

  return NextResponse.json({ success: true, message: '数据已恢复', output })
})
