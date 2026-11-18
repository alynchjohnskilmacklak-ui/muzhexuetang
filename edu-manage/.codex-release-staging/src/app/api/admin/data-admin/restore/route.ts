import { NextRequest, NextResponse } from 'next/server'
import { assertDangerAuth } from '@/lib/danger-guard'
import { apiHandler } from '@/lib/api-handler'
import { createActivityLog } from '@/lib/data-admin/entities-server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { resolveBackupDirectory } from '@/lib/backup-id'

export const dynamic = 'force-dynamic'

const execFileAsync = promisify(execFile)
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

async function restoreOne(dumpPath: string, dbUrl: string): Promise<void> {
  const connection = new URL(dbUrl)
  if (!['postgres:', 'postgresql:'].includes(connection.protocol)) {
    throw new Error('数据库连接协议无效')
  }

  const database = decodeURIComponent(connection.pathname.replace(/^\//, ''))
  if (!connection.hostname || !database || !connection.username) {
    throw new Error('数据库连接配置不完整')
  }

  const sslMode = connection.searchParams.get('sslmode')
  const env = {
    ...process.env,
    PGPASSWORD: decodeURIComponent(connection.password),
    ...(sslMode ? { PGSSLMODE: sslMode } : {}),
  }
  await execFileAsync('pg_restore', [
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-acl',
    '--host', connection.hostname,
    '--port', connection.port || '5432',
    '--username', decodeURIComponent(connection.username),
    '--dbname', database,
    dumpPath,
  ], { timeout: 600_000, env, windowsHide: true })
}

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json()
  const auth = await assertDangerAuth(body, '恢复并覆盖现有数据')

  const backupId: string = body.backupId || ''
  const targetDivision: string = body.targetDivision || ''

  if (!backupId || typeof backupId !== 'string') {
    return NextResponse.json({ error: '请选择备份' }, { status: 400 })
  }
  const resolved = resolveBackupDirectory(BACKUP_DIR, backupId)
  if (!resolved) {
    return NextResponse.json({ error: '备份标识无效' }, { status: 400 })
  }
  if (!['JUNIOR', 'SENIOR', 'BOTH'].includes(targetDivision)) {
    return NextResponse.json({ error: '无效恢复范围' }, { status: 400 })
  }

  // Prevent path traversal
  const allowed = path.resolve(BACKUP_DIR)
  if (resolved !== allowed && !resolved.startsWith(`${allowed}${path.sep}`)) {
    return NextResponse.json({ error: '备份路径不在允许目录内' }, { status: 400 })
  }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    return NextResponse.json({ error: '备份目录不存在' }, { status: 400 })
  }

  if (targetDivision === 'BOTH') {
    // 初中部
    const juniorDump = findDump(resolved, 'chuzhong')
    const juniorUrl = loadEnv('DATABASE_URL_JUNIOR')
    if (!juniorUrl) return NextResponse.json({ error: '未找到初中部数据库连接(DATABASE_URL_JUNIOR)' }, { status: 500 })
    await restoreOne(juniorDump, juniorUrl)

    // 高中部
    const seniorDump = findDump(resolved, 'gaozhong')
    const seniorUrl = loadEnv('DATABASE_URL_SENIOR')
    if (!seniorUrl) return NextResponse.json({ error: '未找到高中部数据库连接(DATABASE_URL_SENIOR)' }, { status: 500 })
    await restoreOne(seniorDump, seniorUrl)

    await createActivityLog(auth.userId, 'MANUAL_RESTORE', 'System', 'restore', {
      backupDir: resolved,
      divisions: ['JUNIOR', 'SENIOR'],
    })
  } else if (targetDivision === 'SENIOR') {
    const dumpPath = findDump(resolved, 'gaozhong')
    const dbUrl = loadEnv('DATABASE_URL_SENIOR')
    if (!dbUrl) return NextResponse.json({ error: '未找到高中部数据库连接(DATABASE_URL_SENIOR)' }, { status: 500 })
    await restoreOne(dumpPath, dbUrl)

    await createActivityLog(auth.userId, 'MANUAL_RESTORE', 'System', 'restore', {
      backupDir: resolved,
      division: 'SENIOR',
    })
  } else {
    // JUNIOR (default)
    const dumpPath = findDump(resolved, 'chuzhong')
    const dbUrl = loadEnv('DATABASE_URL_JUNIOR')
    if (!dbUrl) return NextResponse.json({ error: '未找到初中部数据库连接(DATABASE_URL_JUNIOR)' }, { status: 500 })
    await restoreOne(dumpPath, dbUrl)

    await createActivityLog(auth.userId, 'MANUAL_RESTORE', 'System', 'restore', {
      backupDir: resolved,
      division: 'JUNIOR',
    })
  }

  return NextResponse.json({ success: true, message: '数据已恢复' })
})
