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

export const POST = apiHandler(async (req: NextRequest) => {
  const body = await req.json()
  const auth = await assertDangerAuth(body)

  const backupFile: string = body.backupFile || ''
  const targetDivision: string = body.targetDivision || ''

  if (!backupFile || typeof backupFile !== 'string') {
    return NextResponse.json({ error: '请选择备份文件' }, { status: 400 })
  }

  // Prevent path traversal: backup must be under BACKUP_DIR
  const resolved = path.resolve(backupFile)
  const allowed = path.resolve(BACKUP_DIR)
  if (!resolved.startsWith(allowed)) {
    return NextResponse.json({ error: '备份文件路径不在允许目录内' }, { status: 400 })
  }

  if (!fs.existsSync(resolved)) {
    return NextResponse.json({ error: '备份文件不存在' }, { status: 400 })
  }

  // Determine target database URL
  let dbUrl: string
  if (targetDivision === 'SENIOR') {
    dbUrl = loadEnv('DATABASE_URL_SENIOR')
  } else if (targetDivision === 'JUNIOR') {
    dbUrl = loadEnv('DATABASE_URL_JUNIOR')
  } else {
    dbUrl = loadEnv('DATABASE_URL') || loadEnv('DATABASE_URL_JUNIOR')
  }

  if (!dbUrl) {
    return NextResponse.json({ error: '未找到目标数据库连接' }, { status: 500 })
  }

  // Strip Prisma ?schema=public query param for pg_restore
  const pgUrl = dbUrl.split('?')[0]

  const cmd = `pg_restore --clean --if-exists --no-owner --no-acl --dbname="${pgUrl}" "${resolved}"`
  console.log('[restore] executing restore...')

  const { stdout, stderr } = await execAsync(cmd, { timeout: 600_000 })

  if (stderr) {
    console.warn('[restore] stderr:', stderr)
  }

  await createActivityLog(auth.userId, 'MANUAL_RESTORE', 'System', 'restore', {
    backupFile: resolved,
    division: targetDivision || 'DEFAULT',
  })

  return NextResponse.json({ success: true, message: '数据已恢复', output: stdout.slice(-500) })
})
