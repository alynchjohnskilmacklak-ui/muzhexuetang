import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const script = readFileSync(new URL('../../scripts/migrate-all.sh', import.meta.url), 'utf8')

describe('dual database migration safety', () => {
  it('checks unfinished migration records before deploying', () => {
    expect(script).toContain('finished_at IS NULL AND rolled_back_at IS NULL')
    expect(script).toContain('failed_migrations "$url"')
  })

  it('only auto-recovers allowlisted migrations after exact schema checks', () => {
    expect(script).toContain('case "$failed" in')
    expect(script).toContain('"$KNOWN_STAGE_MIGRATION")')
    expect(script).toContain('"$KNOWN_EMPTY_TEACHER_MESSAGE_MIGRATION")')
    expect(script).toContain('"$KNOWN_FEEDBACK_IDENTITY_MIGRATION")')
    expect(script).toContain('automatic recovery refused')
    expect(script).toContain('stage_summary_table_exists "$url"')
    expect(script).toContain('empty_teacher_message_table_matches_migration "$url"')
    expect(script).toContain('feedback_identity_retry_schema_matches_migration "$url"')
  })

  it('does not retry arbitrary prisma migrate deploy failures', () => {
    expect(script.match(/run_prisma migrate deploy/g)).toHaveLength(1)
    expect(script).toContain('npx --no-install prisma "$@"')
    expect(script).not.toContain('migrate deploy failed; checking known StageSummary recovery')
  })

  it('does not print database connection URLs', () => {
    expect(script).toContain('SELECT current_database()')
    expect(script).not.toMatch(/echo[^\n]*\$url/)
  })
})
