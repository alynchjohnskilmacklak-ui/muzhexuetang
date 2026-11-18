import { NextRequest, NextResponse } from 'next/server'
import { assertDangerAuth } from '@/lib/danger-guard'
import { apiHandler } from '@/lib/api-handler'
import { createActivityLog } from '@/lib/data-admin/entities-server'
import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { resolveBackupDirectory } from '@/lib/backup-id'
import { buildRestoreConnection } from '@/lib/backup-restore-plan'

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
  const resolved = fs.realpathSync(path.join(backupDir, dump))
  if (!resolved.startsWith(fs.realpathSync(backupDir) + path.sep) || !fs.statSync(resolved).isFile()) throw new Error('备份文件路径无效')
  return resolved
}

async function restoreOne(dumpPath: string, dbUrl: string): Promise<void> {
  const plan = buildRestoreConnection(dbUrl, dumpPath)
  await execFileAsync('pg_restore', plan.args, {
    timeout: 600_000, env: { ...process.env, ...plan.env }, windowsHide: true,
  })
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

  const divisions = targetDivision === 'BOTH' ? ['JUNIOR', 'SENIOR'] : [targetDivision]
  const targets: { division: string; dumpPath: string; dbUrl: string }[] = []
  const targetKeys = new Set<string>()
  // Validate every target before the first destructive command.
  try {
    for (const division of divisions) {
      const dumpPath = findDump(resolved, division === 'JUNIOR' ? 'chuzhong' : 'gaozhong')
      const dbUrl = loadEnv(division === 'JUNIOR' ? 'DATABASE_URL_JUNIOR' : 'DATABASE_URL_SENIOR')
      if (!dbUrl) throw new Error(division === 'JUNIOR' ? '未配置初中部数据库连接' : '未配置高中部数据库连接')
      const plan = buildRestoreConnection(dbUrl, dumpPath)
      if (targetKeys.has(plan.targetKey)) throw new Error('两个学部不能指向同一个恢复数据库')
      targetKeys.add(plan.targetKey)
      await execFileAsync('pg_restore', ['--list', dumpPath], { timeout: 60_000, windowsHide: true })
      targets.push({ division, dumpPath, dbUrl })
    }
  } catch {
    return NextResponse.json({ error: '恢复前检查失败：请检查所有目标学部的备份文件、数据库配置及 pg_restore 工具；未执行覆盖' }, { status: 400 })
  }

  const completedDivisions: string[] = []
  for (const target of targets) {
    try {
      await restoreOne(target.dumpPath, target.dbUrl)
      completedDivisions.push(target.division)
    } catch {
      await createActivityLog(auth.userId, 'MANUAL_RESTORE_FAILED', 'System', 'restore', {
        backupDir: resolved, completedDivisions, failedDivision: target.division,
      }).catch(() => undefined)
      return NextResponse.json({
        success: false, partial: completedDivisions.length > 0, completedDivisions,
        failedDivision: target.division,
        error: completedDivisions.length
          ? '部分学部已恢复，当前学部未确认恢复成功，已启用单事务保护。请勿整批重试，请核对数据库状态及已完成范围。'
          : '未确认恢复成功，已启用单事务保护。请核对数据库状态和日志，不要立即重复恢复。',
      }, { status: 500 })
    }
  }
  try {
    await createActivityLog(auth.userId, 'MANUAL_RESTORE', 'System', 'restore', {
      backupDir: resolved, divisions: completedDivisions,
    })
  } catch {
    return NextResponse.json({ success: true, completedDivisions, warning: '数据已恢复，但操作日志写入失败，请人工记录本次恢复' })
  }
  return NextResponse.json({ success: true, completedDivisions, message: '数据已恢复' })
})
