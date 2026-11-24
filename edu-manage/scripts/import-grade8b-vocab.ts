import 'dotenv/config'
import { Prisma, PrismaClient } from '@prisma/client'
import { GRADE8B_COMPLETE_VOCAB } from '../src/data/vocab-sets'
import { normalizeVocabHeadword, vocabDatabaseData } from '../src/lib/vocab-catalog'
import { parseLocalEduManageTarget } from '../src/lib/vocab-database-target'

const EXPECTED_TOTAL = 603
const EXPECTED_UNIT_COUNTS: Record<string, number> = {
  'Unit 1': 59,
  'Unit 2': 87,
  'Unit 3': 81,
  'Unit 4': 82,
  'Unit 5': 73,
  'Unit 6': 72,
  'Unit 7': 89,
  'Unit 8': 60,
}
const EXPECTED_SOURCE_PAGE_COUNTS: Record<number, number> = {
  113: 49, 114: 58, 115: 52, 116: 59, 117: 48, 118: 49,
  119: 49, 120: 50, 121: 52, 122: 46, 123: 40, 124: 51,
}

function countBy<T>(entries: T[], keyOf: (entry: T) => string | number | undefined) {
  return entries.reduce<Record<string, number>>((result, entry) => {
    const key = keyOf(entry)
    if (key !== undefined) result[String(key)] = (result[String(key)] ?? 0) + 1
    return result
  }, {})
}

function validateCatalog() {
  if (GRADE8B_COMPLETE_VOCAB.length !== EXPECTED_TOTAL) {
    throw new Error(`八年级下册词表数量异常：预期 ${EXPECTED_TOTAL}，实际 ${GRADE8B_COMPLETE_VOCAB.length}；未写入数据库。`)
  }

  const identities = new Set<string>()
  const ids = new Set<string>()
  for (const entry of GRADE8B_COMPLETE_VOCAB) {
    const identity = [entry.grade, entry.volume, entry.unit, normalizeVocabHeadword(entry.headword)].join('\u001f')
    if (identities.has(identity)) throw new Error(`词表存在重复词条：${entry.unit} / ${entry.headword}`)
    if (ids.has(entry.id)) throw new Error(`词表 ID 重复：${entry.id}`)
    identities.add(identity)
    ids.add(entry.id)

    if (entry.grade !== '初二' || entry.volume !== '下册') throw new Error(`词条册次错误：${entry.unit} / ${entry.headword}`)
    if (!entry.id.startsWith('g8b-')) throw new Error(`词条 ID 前缀错误：${entry.id}`)
    if (!entry.pos.trim() || entry.meanings.length === 0 || entry.meanings.some((meaning) => !meaning.trim())) {
      throw new Error(`词条字段不完整：${entry.unit} / ${entry.headword}`)
    }
    if (typeof entry.sourcePage !== 'number' || !(entry.sourcePage in EXPECTED_SOURCE_PAGE_COUNTS)) {
      throw new Error(`词条来源页超出图片范围：${entry.headword}`)
    }
  }

  const unitCounts = countBy(GRADE8B_COMPLETE_VOCAB, (entry) => entry.unit)
  const sourcePageCounts = countBy(GRADE8B_COMPLETE_VOCAB, (entry) => entry.sourcePage)
  if (JSON.stringify(unitCounts) !== JSON.stringify(EXPECTED_UNIT_COUNTS)) throw new Error('词表单元数量与核对清单不符。')
  if (JSON.stringify(sourcePageCounts) !== JSON.stringify(EXPECTED_SOURCE_PAGE_COUNTS)) throw new Error('词表逐页数量与核对清单不符。')
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('未配置 DATABASE_URL；未执行任何数据库写入。')
  const target = parseLocalEduManageTarget(connectionString)
  validateCatalog()

  const prisma = new PrismaClient()
  try {
    const [databaseRow] = await prisma.$queryRaw<Array<{ databaseName: string }>>`SELECT current_database() AS "databaseName"`
    if (databaseRow?.databaseName !== target.database) {
      throw new Error('实际连接的数据库与本地 edu_manage 目标不一致；未执行任何词条写入。')
    }

    const [totalBeforeRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS "count" FROM "VocabWord"`
    const [grade8BeforeRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS "count" FROM "VocabWord" WHERE "grade" = '初二' AND "volume" = '下册'
    `
    const [grade7BeforeRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS "count" FROM "VocabWord" WHERE "grade" = '初一'
    `
    const [otherVocabBeforeRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS "count" FROM "VocabWord"
      WHERE NOT ("grade" = '初二' AND "volume" = '下册')
    `
    const [progressBeforeRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS "count" FROM "VocabProgress"`
    const [sessionsBeforeRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS "count" FROM "VocabSession"`
    const existingRows = await prisma.$queryRaw<Array<{ unit: string; normalizedHeadword: string }>>`
      SELECT "unit", "normalizedHeadword" FROM "VocabWord"
      WHERE "grade" = '初二' AND "volume" = '下册'
    `
    const existingKeys = new Set(existingRows.map((row) => `${row.unit}\u001f${row.normalizedHeadword}`))
    const newEntryCount = GRADE8B_COMPLETE_VOCAB.filter((entry) =>
      !existingKeys.has(`${entry.unit}\u001f${normalizeVocabHeadword(entry.headword)}`),
    ).length

    if (process.argv.includes('--dry-run')) {
      console.log(JSON.stringify({
        mode: 'dry-run',
        target: `${target.host}:${target.port}/${target.database}`,
        sourceEntries: GRADE8B_COMPLETE_VOCAB.length,
        existingGrade8LowerEntries: Number(grade8BeforeRow?.count ?? 0),
        rowsToInsert: newEntryCount,
        rowsToUpdate: GRADE8B_COMPLETE_VOCAB.length - newEntryCount,
        totalVocabWords: Number(totalBeforeRow?.count ?? 0),
        otherVocabWords: Number(otherVocabBeforeRow?.count ?? 0),
        grade7VocabWords: Number(grade7BeforeRow?.count ?? 0),
        vocabProgress: Number(progressBeforeRow?.count ?? 0),
        vocabSessions: Number(sessionsBeforeRow?.count ?? 0),
      }, null, 2))
      return
    }

    await prisma.$transaction(async (tx) => {
      for (const entry of GRADE8B_COMPLETE_VOCAB) {
        const data = vocabDatabaseData(entry)
        await tx.$executeRaw`
          INSERT INTO "VocabWord" (
            "id", "grade", "volume", "unit", "section", "headword", "normalizedHeadword",
            "phonetic", "pos", "note", "meanings", "phrase", "bookPage", "sourcePage", "createdAt", "updatedAt"
          ) VALUES (
            ${data.id}, ${data.grade}, ${data.volume}, ${data.unit}, ${data.section}, ${data.headword}, ${data.normalizedHeadword},
            ${data.phonetic}, ${data.pos}, ${data.note}, ARRAY[${Prisma.join(data.meanings)}]::TEXT[], ${data.phrase},
            ${data.bookPage}, ${data.sourcePage}, NOW(), NOW()
          )
          ON CONFLICT ("grade", "volume", "unit", "normalizedHeadword") DO UPDATE SET
            "section" = EXCLUDED."section",
            "headword" = EXCLUDED."headword",
            "phonetic" = COALESCE(EXCLUDED."phonetic", "VocabWord"."phonetic"),
            "pos" = EXCLUDED."pos",
            "note" = EXCLUDED."note",
            "meanings" = EXCLUDED."meanings",
            "phrase" = EXCLUDED."phrase",
            "bookPage" = COALESCE(EXCLUDED."bookPage", "VocabWord"."bookPage"),
            "sourcePage" = COALESCE(EXCLUDED."sourcePage", "VocabWord"."sourcePage"),
            "updatedAt" = NOW()
        `
      }
    }, { maxWait: 10_000, timeout: 60_000 })

    const importedRows = await prisma.$queryRaw<Array<{
      unit: string
      section: string
      headword: string
      normalizedHeadword: string
      pos: string
      note: string | null
      meanings: string[]
      phrase: boolean
      bookPage: number | null
      sourcePage: number | null
    }>>`
      SELECT "unit", "section", "headword", "normalizedHeadword", "pos", "note", "meanings", "phrase", "bookPage", "sourcePage"
      FROM "VocabWord"
      WHERE "grade" = '初二' AND "volume" = '下册'
    `
    const importedByKey = new Map(importedRows.map((row) => [`${row.unit}\u001f${row.normalizedHeadword}`, row]))
    const mismatches = GRADE8B_COMPLETE_VOCAB.filter((entry) => {
      const row = importedByKey.get(`${entry.unit}\u001f${normalizeVocabHeadword(entry.headword)}`)
      return !row
        || row.headword !== entry.headword
        || row.section !== entry.section
        || row.pos !== entry.pos
        || row.note !== (entry.note ?? null)
        || row.bookPage !== entry.bookPage
        || row.sourcePage !== entry.sourcePage
        || row.phrase !== Boolean(entry.phrase)
        || JSON.stringify(row.meanings) !== JSON.stringify(entry.meanings)
    })
    if (mismatches.length) {
      throw new Error(`数据库复核发现 ${mismatches.length} 条缺失或内容不一致；示例：${mismatches.slice(0, 5).map((entry) => entry.headword).join(', ')}`)
    }

    const verifiedRows = GRADE8B_COMPLETE_VOCAB.map((entry) =>
      importedByKey.get(`${entry.unit}\u001f${normalizeVocabHeadword(entry.headword)}`)!,
    )
    const [totalAfterRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS "count" FROM "VocabWord"`
    const [grade7AfterRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS "count" FROM "VocabWord" WHERE "grade" = '初一'
    `
    const [otherVocabAfterRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS "count" FROM "VocabWord"
      WHERE NOT ("grade" = '初二' AND "volume" = '下册')
    `
    const [progressAfterRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS "count" FROM "VocabProgress"`
    const [sessionsAfterRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS "count" FROM "VocabSession"`

    if (Number(grade7BeforeRow?.count ?? 0) !== Number(grade7AfterRow?.count ?? 0)) throw new Error('导入前后七年级词条数量发生变化。')
    if (Number(otherVocabBeforeRow?.count ?? 0) !== Number(otherVocabAfterRow?.count ?? 0)) throw new Error('导入过程意外改变了其他册次词条。')
    if (Number(progressBeforeRow?.count ?? 0) !== Number(progressAfterRow?.count ?? 0)) throw new Error('导入过程意外改变了学生背词进度。')
    if (Number(sessionsBeforeRow?.count ?? 0) !== Number(sessionsAfterRow?.count ?? 0)) throw new Error('导入过程意外改变了历史练习记录。')

    console.log(JSON.stringify({
      mode: 'imported',
      target: `${target.host}:${target.port}/${target.database}`,
      sourceEntries: GRADE8B_COMPLETE_VOCAB.length,
      requiredEntriesVerified: GRADE8B_COMPLETE_VOCAB.length,
      rowsInserted: newEntryCount,
      rowsUpdated: GRADE8B_COMPLETE_VOCAB.length - newEntryCount,
      totalVocabWordsBefore: Number(totalBeforeRow?.count ?? 0),
      totalVocabWordsAfter: Number(totalAfterRow?.count ?? 0),
      otherVocabWordsBefore: Number(otherVocabBeforeRow?.count ?? 0),
      otherVocabWordsAfter: Number(otherVocabAfterRow?.count ?? 0),
      grade7VocabWordsBefore: Number(grade7BeforeRow?.count ?? 0),
      grade7VocabWordsAfter: Number(grade7AfterRow?.count ?? 0),
      vocabProgressBefore: Number(progressBeforeRow?.count ?? 0),
      vocabProgressAfter: Number(progressAfterRow?.count ?? 0),
      vocabSessionsBefore: Number(sessionsBeforeRow?.count ?? 0),
      vocabSessionsAfter: Number(sessionsAfterRow?.count ?? 0),
      sourcePageCounts: countBy(verifiedRows, (row) => row.sourcePage ?? undefined),
      unitCounts: countBy(verifiedRows, (row) => row.unit),
    }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : '八年级下册词库导入失败')
  process.exitCode = 1
})
