import { describe, it, expect } from 'vitest'
import { buildRestoreConnection } from './backup-restore-plan'

describe('atomic database restore plan', () => {
  it('rolls back on the first SQL error, without credentials on the command line', () => {
    const plan = buildRestoreConnection('postgresql://admin:test%21@localhost:5432/test_db?sslmode=require', '/tmp/backup.dump')
    expect(plan.args).toContain('--single-transaction')
    expect(plan.args).toContain('--exit-on-error')
    expect(plan.args).not.toContain('test!')
    expect(plan.args).not.toContain('--jobs')
    expect(plan.env).toEqual({ PGPASSWORD: 'test!', PGSSLMODE: 'require' })
  })
  it.each(['https://example.com/db', 'postgresql://localhost/db', 'postgresql://user@localhost'])('rejects invalid target %s', value => {
    expect(() => buildRestoreConnection(value, 'backup.dump')).toThrow()
  })
})
