import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { createActivityLog } from '@/lib/data-admin/entities-server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { isValidBackupId, resolveBackupDirectory } from '@/lib/backup-id'

export const dynamic = 'force-dynamic'

const execFileAsync = promisify(execFile)

const BACKUP_DIR = process.env.BACKUP_DIR || '/data/backups/edu-manage'

export const POST = apiHandler(async () => {
  const user = await requireSuperAdmin()
  const APP_ROOT = process.env.APP_ROOT || '/opt/edu-manage'
  const scriptPath = process.env.BACKUP_SCRIPT || `${APP_ROOT}/scripts/backup-now.sh`

  const { stdout, stderr } = await execFileAsync('bash', [scriptPath], {
    cwd: APP_ROOT,
    timeout: 300_000,
    env: { ...process.env },
  })

  if (stderr) {
    console.warn('[backup] stderr:', stderr)
  }

  const lines = stdout.trim().split('\n')
  const backupPath = lines[lines.length - 1] || ''
  const backupId = path.basename(backupPath)
  const expectedBackupPath = resolveBackupDirectory(BACKUP_DIR, backupId)
  const resolvedBackupPath = path.resolve(backupPath)
  if (!expectedBackupPath || resolvedBackupPath !== expectedBackupPath) {
    throw new Error('备份脚本未返回有效的受控备份目录')
  }
  if (!isValidBackupId(backupId)) {
    throw new Error('备份标识格式无效')
  }

  await createActivityLog(user.id, 'MANUAL_BACKUP', 'System', 'backup', {
    backupId,
  })

  return NextResponse.json({
    success: true,
    backupId,
    timestamp: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'no-store' } })
})

export const GET = apiHandler(async () => {
  await requireSuperAdmin()

  const manualDir = path.join(BACKUP_DIR)
  const history: {
    id: string
    name: string
    timestamp: string
  }[] = []

  if (fs.existsSync(manualDir)) {
    const entries = fs.readdirSync(manualDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('manual-')) continue
      const dirPath = path.join(manualDir, entry.name)
      const stat = fs.statSync(dirPath)
      history.push({
        id: entry.name,
        name: entry.name,
        timestamp: stat.birthtime.toISOString(),
      })
    }
  }

  history.sort((a, b) => b.name.localeCompare(a.name))

  return NextResponse.json(
    { success: true, data: history },
    { headers: { 'Cache-Control': 'no-store' } },
  )
})
