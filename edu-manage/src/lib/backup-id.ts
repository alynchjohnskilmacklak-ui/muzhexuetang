import path from 'node:path'

const BACKUP_ID_PATTERN = /^manual-\d{8}_\d{6}$/

export function isValidBackupId(value: unknown): value is string {
  return typeof value === 'string' && BACKUP_ID_PATTERN.test(value)
}

export function resolveBackupDirectory(backupRoot: string, backupId: unknown): string | null {
  if (!isValidBackupId(backupId)) return null

  const root = path.resolve(backupRoot)
  const resolved = path.resolve(root, backupId)
  return resolved.startsWith(`${root}${path.sep}`) ? resolved : null
}
