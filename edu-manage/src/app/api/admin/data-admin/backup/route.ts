import { NextRequest, NextResponse } from 'next/server'
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
const LABELS_FILE = path.join(BACKUP_DIR, '.backup-labels.json')

function readLabels(): Record<string, string> {
  try {
    if (!fs.existsSync(LABELS_FILE)) return {}
    const value = JSON.parse(fs.readFileSync(LABELS_FILE, 'utf8'))
    return value && typeof value === 'object' ? value : {}
  } catch { return {} }
}

function writeLabels(labels: Record<string, string>) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
  const temporary = `${LABELS_FILE}.tmp`
  fs.writeFileSync(temporary, JSON.stringify(labels, null, 2), { encoding: 'utf8', mode: 0o600 })
  fs.renameSync(temporary, LABELS_FILE)
}

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
  const labels = readLabels()

  if (fs.existsSync(manualDir)) {
    const entries = fs.readdirSync(manualDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || !entry.name.startsWith('manual-')) continue
      const dirPath = path.join(manualDir, entry.name)
      const stat = fs.statSync(dirPath)
      history.push({
        id: entry.name,
        name: labels[entry.name] || entry.name,
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

export const PATCH = apiHandler(async (req: NextRequest) => {
  const user = await requireSuperAdmin()
  const body = await req.json().catch(() => ({}))
  const backupId = typeof body.backupId === 'string' ? body.backupId : ''
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : ''
  const directory = resolveBackupDirectory(BACKUP_DIR, backupId)
  if (!directory || !fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) return NextResponse.json({ error: '备份不存在' }, { status: 404 })
  if (!displayName || displayName.length > 80 || /[\r\n\t]/.test(displayName)) return NextResponse.json({ error: '名称应为 1 到 80 个字符' }, { status: 400 })
  const labels = readLabels()
  labels[backupId] = displayName
  writeLabels(labels)
  await createActivityLog(user.id, 'BACKUP_RENAME', 'Backup', backupId, { displayName })
  return NextResponse.json({ success: true, name: displayName })
})

export const DELETE = apiHandler(async (req: NextRequest) => {
  const user = await requireSuperAdmin()
  const body = await req.json().catch(() => ({}))
  const backupId = typeof body.backupId === 'string' ? body.backupId : ''
  const directory = resolveBackupDirectory(BACKUP_DIR, backupId)
  const allowed = path.resolve(BACKUP_DIR)
  if (!directory || directory === allowed || !directory.startsWith(`${allowed}${path.sep}`)) return NextResponse.json({ error: '备份标识无效' }, { status: 400 })
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) return NextResponse.json({ error: '备份不存在' }, { status: 404 })
  fs.rmSync(directory, { recursive: true, force: false })
  const labels = readLabels()
  delete labels[backupId]
  writeLabels(labels)
  await createActivityLog(user.id, 'BACKUP_DELETE', 'Backup', backupId)
  return NextResponse.json({ success: true })
})
