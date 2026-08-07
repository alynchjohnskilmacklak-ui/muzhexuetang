import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { isValidBackupId, resolveBackupDirectory } from './backup-id'

describe('backup id', () => {
  it('accepts generated manual backup identifiers', () => {
    expect(isValidBackupId('manual-20260801_103015')).toBe(true)
  })

  it('rejects paths and malformed identifiers', () => {
    expect(isValidBackupId('../manual-20260801_103015')).toBe(false)
    expect(isValidBackupId('/data/backups/manual-20260801_103015')).toBe(false)
    expect(isValidBackupId('manual-latest')).toBe(false)
  })

  it('resolves valid identifiers only below the backup root', () => {
    const root = path.resolve('tmp/backups')
    expect(resolveBackupDirectory(root, 'manual-20260801_103015')).toBe(
      path.join(root, 'manual-20260801_103015'),
    )
    expect(resolveBackupDirectory(root, '../../etc')).toBeNull()
  })
})
