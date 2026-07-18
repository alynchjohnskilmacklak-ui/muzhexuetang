import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  new URL('../../prisma/migrations/20260718223000_feedback_reward_teacher_student_unique/migration.sql', import.meta.url),
  'utf8',
)

describe('feedback reward production migration safety', () => {
  it('adds nullable subject fields before enforcing NOT NULL', () => {
    const addSubjectKey = migration.indexOf('ADD COLUMN IF NOT EXISTS "subjectKey" TEXT;')
    const addSubjectLabel = migration.indexOf('ADD COLUMN IF NOT EXISTS "subjectLabel" TEXT;')
    const enforceSubjectKey = migration.indexOf('ALTER COLUMN "subjectKey" SET NOT NULL;')
    const enforceSubjectLabel = migration.indexOf('ALTER COLUMN "subjectLabel" SET NOT NULL;')

    expect(addSubjectKey).toBeGreaterThan(-1)
    expect(addSubjectLabel).toBeGreaterThan(-1)
    expect(enforceSubjectKey).toBeGreaterThan(addSubjectKey)
    expect(enforceSubjectLabel).toBeGreaterThan(addSubjectLabel)
  })

  it('creates a complete archive before mutating historical reward rows', () => {
    const archivePosition = migration.indexOf('CREATE TABLE IF NOT EXISTS "FeedbackRewardRecordAuditBackup"')
    const firstHistoricalUpdate = migration.indexOf('UPDATE "FeedbackRewardRecord"')
    const requiredArchiveFields = [
      '"sourceRecordId"', '"feedbackId"', '"studentId"', '"teacherId"',
      '"subjectKey"', '"subjectLabel"', '"courseKey"', '"courseLabel"',
      '"amount"', '"isFirstFeedback"', '"createdAt"',
    ]

    expect(archivePosition).toBeGreaterThan(-1)
    expect(archivePosition).toBeLessThan(firstHistoricalUpdate)
    for (const field of requiredArchiveFields) expect(migration).toContain(field)
  })

  it('uses UNKNOWN without guessing from labels and reports the unresolved count', () => {
    expect(migration).not.toContain('NULLIF(BTRIM(r."courseLabel"), \'\')')
    expect(migration).toMatch(/UNKNOWN/)
    expect(migration).toMatch(/RAISE NOTICE[\s\S]*UNKNOWN/i)
  })

  it('does not delete reward records or drop reward tables', () => {
    expect(migration).not.toMatch(/\bDELETE\s+FROM\s+"FeedbackRewardRecord"/i)
    expect(migration).not.toMatch(/\bDROP\s+TABLE\b/i)
  })

  it('deduplicates and enforces uniqueness only by teacher, student and subject key', () => {
    expect(migration).toContain('PARTITION BY r."teacherId", r."studentId", r."subjectKey"')
    expect(migration).toContain('DROP INDEX IF EXISTS "FeedbackRewardRecord_teacherId_studentId_key"')
    expect(migration).toContain('ON "FeedbackRewardRecord"("teacherId", "studentId", "subjectKey")')
  })
})
