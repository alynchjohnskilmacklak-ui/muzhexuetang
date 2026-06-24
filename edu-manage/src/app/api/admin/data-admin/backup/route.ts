import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/get-user'
import { apiHandler } from '@/lib/api-handler'
import { createActivityLog } from '@/lib/data-admin/entities-server'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

const execAsync = promisify(exec)

const BACKUP_DIR = process.env.BACKUP_DIR || '/data/backups/edu-manage'

export const POST = apiHandler(async () => {
  const user = await requireRole(['SUPER_ADMIN'])
  const projectRoot = path.resolve(process.cwd())

  const { stdout, stderr } = await execAsync('bash scripts/backup-now.sh', {
    cwd: projectRoot,
    timeout: 300_000,
  })

  if (stderr) {
    console.warn('[backup] stderr:', stderr)
  }

  const lines = stdout.trim().split('\n')
  const backupPath = lines[lines.length - 1] || ''

  await createActivityLog(user.id, 'MANUAL_BACKUP', 'System', 'backup', {
    path: backupPath,
  })

  return NextResponse.json({
    success: true,
    path: backupPath,
    timestamp: new Date().toISOString(),
  })
})

export const GET = apiHandler(async () => {
  await requireRole(['SUPER_ADMIN'])

  const manualDir = path.join(BACKUP_DIR)
  const history: {
    name: string
    path: string
    timestamp: string
    metadata?: unknown
  }[] = []

  if (fs.existsSync(manualDir)) {
    const entries = fs.readdirSync(manualDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('manual-')) continue
      const dirPath = path.join(manualDir, entry.name)
      const metaPath = path.join(dirPath, 'backup-metadata.json')
      let metadata: unknown = null
      if (fs.existsSync(metaPath)) {
        try {
          metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
        } catch { /* ignore parse errors */ }
      }
      const stat = fs.statSync(dirPath)
      history.push({
        name: entry.name,
        path: dirPath,
        timestamp: stat.birthtime.toISOString(),
        metadata,
      })
    }
  }

  history.sort((a, b) => b.name.localeCompare(a.name))

  return NextResponse.json({ success: true, data: history })
})
