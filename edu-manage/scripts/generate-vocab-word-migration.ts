import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { allVocab } from '../src/lib/vocab-bank'
import { normalizeVocabHeadword, vocabDatabaseData } from '../src/lib/vocab-catalog'

const EXPECTED_ENTRIES = 2973
const MIGRATION_DIR = join(process.cwd(), 'prisma', 'migrations', '20261112130000_add_vocab_word_catalog')

function sqlText(value: string | null): string {
  return value === null ? 'NULL' : `'${value.replace(/'/g, "''")}'`
}

function sqlInteger(value: number | null): string {
  return value === null ? 'NULL' : String(value)
}

async function main() {
  const entries = allVocab()
  if (entries.length !== EXPECTED_ENTRIES) {
    throw new Error(`词库源数据数量不符：预期 ${EXPECTED_ENTRIES}，实际 ${entries.length}；未生成迁移。`)
  }

  const ids = new Set<string>()
  const identities = new Set<string>()
  for (const entry of entries) {
    const data = vocabDatabaseData(entry)
    const identity = [data.grade, data.volume, data.unit, normalizeVocabHeadword(data.headword)].join('\u001f')
    if (ids.has(data.id)) throw new Error(`词条 ID 重复：${data.id}；未生成迁移。`)
    if (identities.has(identity)) throw new Error(`词条唯一键重复：${data.unit} / ${data.headword}；未生成迁移。`)
    if (!data.pos.trim() || data.meanings.length === 0 || data.meanings.some((meaning) => !meaning.trim())) {
      throw new Error(`词条必填内容缺失：${data.unit} / ${data.headword}；未生成迁移。`)
    }
    ids.add(data.id)
    identities.add(identity)
  }

  const columns = [
    '"id"', '"grade"', '"volume"', '"unit"', '"section"', '"headword"', '"normalizedHeadword"',
    '"phonetic"', '"pos"', '"note"', '"meanings"', '"phrase"', '"bookPage"', '"sourcePage"',
    '"createdAt"', '"updatedAt"',
  ].join(', ')

  const values = entries.map((entry) => {
    const data = vocabDatabaseData(entry)
    const meanings = `ARRAY[${data.meanings.map(sqlText).join(', ')}]::TEXT[]`
    return `(${[
      sqlText(data.id), sqlText(data.grade), sqlText(data.volume), sqlText(data.unit), sqlText(data.section),
      sqlText(data.headword), sqlText(data.normalizedHeadword), sqlText(data.phonetic), sqlText(data.pos),
      sqlText(data.note), meanings, data.phrase ? 'TRUE' : 'FALSE', sqlInteger(data.bookPage), sqlInteger(data.sourcePage),
      'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP',
    ].join(', ')})`
  })

  const migration: string[] = [
    '-- Generated from the bundled 2024 textbook catalog by scripts/generate-vocab-word-migration.ts.',
    '-- This migration is additive: it creates the missing catalog and seeds its canonical entries.',
    'CREATE TABLE "VocabWord" (',
    '    "id" TEXT NOT NULL,',
    '    "grade" TEXT NOT NULL,',
    '    "volume" TEXT NOT NULL,',
    '    "unit" TEXT NOT NULL,',
    '    "section" TEXT NOT NULL DEFAULT \'\',',
    '    "headword" TEXT NOT NULL,',
    '    "normalizedHeadword" TEXT NOT NULL,',
    '    "phonetic" TEXT,',
    '    "pos" TEXT NOT NULL,',
    '    "note" TEXT,',
    '    "meanings" TEXT[] NOT NULL,',
    '    "phrase" BOOLEAN NOT NULL DEFAULT FALSE,',
    '    "bookPage" INTEGER,',
    '    "sourcePage" INTEGER,',
    '    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,',
    '    "updatedAt" TIMESTAMP(3) NOT NULL,',
    '    CONSTRAINT "VocabWord_pkey" PRIMARY KEY ("id")',
    ');',
    '',
    'CREATE UNIQUE INDEX "VocabWord_grade_volume_unit_normalizedHeadword_key"',
    'ON "VocabWord"("grade", "volume", "unit", "normalizedHeadword");',
    '',
  ]

  for (let start = 0; start < values.length; start += 100) {
    migration.push(`INSERT INTO "VocabWord" (${columns}) VALUES`)
    migration.push(values.slice(start, start + 100).join(',\n'))
    migration.push('ON CONFLICT ("grade", "volume", "unit", "normalizedHeadword") DO NOTHING;')
    migration.push('')
  }

  migration.push(
    'CREATE INDEX "VocabWord_grade_volume_unit_idx" ON "VocabWord"("grade", "volume", "unit");',
    'CREATE INDEX "VocabWord_grade_volume_headword_idx" ON "VocabWord"("grade", "volume", "headword");',
    '',
    '-- The schema now uses the term-scoped index created by the prior migration.',
    'DROP INDEX IF EXISTS "MasteryRecord_studentId_createdAt_idx";',
    '',
  )

  await mkdir(MIGRATION_DIR, { recursive: true })
  const output = join(MIGRATION_DIR, 'migration.sql')
  await writeFile(output, `${migration.join('\n')}\n`, 'utf8')
  process.stdout.write(`Generated ${output} with ${entries.length} canonical vocabulary entries.\n`)
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : 'Vocabulary migration generation failed.'}\n`)
  process.exitCode = 1
})
