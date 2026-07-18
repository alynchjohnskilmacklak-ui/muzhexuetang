import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const script = readFileSync(new URL('../../scripts/migrate-all.sh', import.meta.url), 'utf8')

describe('dual database migration safety', () => {
  it('checks unfinished migration records before deploying', () => {
    expect(script).toContain('finished_at IS NULL AND rolled_back_at IS NULL')
    expect(script).toContain('failed_migrations "$url"')
  })

  it('only auto-recovers the exact known StageSummary failure', () => {
    expect(script).toContain('if [ "$failed" != "$KNOWN_STAGE_MIGRATION" ]')
    expect(script).toContain('automatic recovery refused')
    expect(script).toContain('stage_summary_table_exists "$url"')
  })

  it('does not retry arbitrary prisma migrate deploy failures', () => {
    expect(script.match(/npx prisma migrate deploy/g)).toHaveLength(1)
    expect(script).not.toContain('migrate deploy failed; checking known StageSummary recovery')
  })

  it('does not print database connection URLs', () => {
    expect(script).toContain('SELECT current_database()')
    expect(script).not.toMatch(/echo[^\n]*\$url/)
  })
})
