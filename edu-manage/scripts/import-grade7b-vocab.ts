import 'dotenv/config'
import { Prisma, PrismaClient } from '@prisma/client'
import { GRADE7B_COMPLETE_VOCAB } from '../src/data/vocab-sets'
import { normalizeVocabHeadword, vocabDatabaseData } from '../src/lib/vocab-catalog'
import { parseLocalEduManageTarget } from '../src/lib/vocab-database-target'

function validateCatalog() {
  if (GRADE7B_COMPLETE_VOCAB.length !== 461) {
    throw new Error(`下册词表数量异常：预期 461，实际 ${GRADE7B_COMPLETE_VOCAB.length}；未写入数据库。`)
  }

  const identities = new Set<string>()
  const ids = new Set<string>()
  const expectedUnits = new Set(Array.from({ length: 8 }, (_, index) => `Unit ${index + 1}`))
  const actualUnits = new Set<string>()

  for (const entry of GRADE7B_COMPLETE_VOCAB) {
    const normalizedHeadword = normalizeVocabHeadword(entry.headword)
    const identity = [entry.grade, entry.volume, entry.unit, normalizedHeadword].join('\u001f')
    if (identities.has(identity)) throw new Error(`词表存在重复词条：${entry.unit} / ${entry.headword}`)
    if (ids.has(entry.id)) throw new Error(`词表 ID 重复：${entry.id}`)
    identities.add(identity)
    ids.add(entry.id)
    actualUnits.add(entry.unit)

    if (entry.grade !== '初一' || entry.volume !== '下册') throw new Error(`词条册次错误：${entry.unit} / ${entry.headword}`)
    if (!entry.pos.trim() || entry.meanings.length === 0 || entry.meanings.some((meaning) => !meaning.trim())) {
      throw new Error(`词条字段不完整：${entry.unit} / ${entry.headword}`)
    }
    if (typeof entry.sourcePage !== 'number' || entry.sourcePage < 97 || entry.sourcePage > 105) {
      throw new Error(`词条来源页超出图片范围：${entry.headword}`)
    }
  }

  if (actualUnits.size !== expectedUnits.size || [...expectedUnits].some((unit) => !actualUnits.has(unit))) {
    throw new Error('下册词表必须完整包含 Unit 1–8。')
  }
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

    const [beforeRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS "count" FROM "VocabWord"`
    const [upperBeforeRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS "count" FROM "VocabWord" WHERE "grade" = '初一' AND "volume" = '上册'
    `
    const [progressBeforeRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS "count" FROM "VocabProgress"`
    const [sessionsBeforeRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS "count" FROM "VocabSession"`
    const beforeCount = Number(beforeRow?.count ?? 0)
    const upperBeforeCount = Number(upperBeforeRow?.count ?? 0)
    const progressBeforeCount = Number(progressBeforeRow?.count ?? 0)
    const sessionsBeforeCount = Number(sessionsBeforeRow?.count ?? 0)

    await prisma.$transaction(async (tx) => {
      for (const entry of GRADE7B_COMPLETE_VOCAB) {
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

    const importedRows = await prisma.$queryRaw<Array<{ unit: string; headword: string; normalizedHeadword: string; sourcePage: number | null }>>`
      SELECT "unit", "headword", "normalizedHeadword", "sourcePage"
      FROM "VocabWord"
      WHERE "grade" = '初一' AND "volume" = '下册'
    `
    const importedKeys = new Set(importedRows.map((row) => `${row.unit}\u001f${row.normalizedHeadword}`))
    const missing = GRADE7B_COMPLETE_VOCAB.filter((entry) =>
      !importedKeys.has(`${entry.unit}\u001f${normalizeVocabHeadword(entry.headword)}`),
    )
    if (missing.length) {
      throw new Error(`数据库复核发现 ${missing.length} 条词条缺失；示例：${missing.slice(0, 5).map((entry) => entry.headword).join(', ')}`)
    }

    const pageCounts = await prisma.$queryRaw<Array<{ sourcePage: number; count: number }>>`
      SELECT "sourcePage", COUNT(*)::int AS "count"
      FROM "VocabWord"
      WHERE "grade" = '初一' AND "volume" = '下册'
      GROUP BY "sourcePage"
      ORDER BY "sourcePage"
    `
    const unitCounts = await prisma.$queryRaw<Array<{ unit: string; count: number }>>`
      SELECT "unit", COUNT(*)::int AS "count"
      FROM "VocabWord"
      WHERE "grade" = '初一' AND "volume" = '下册'
      GROUP BY "unit"
      ORDER BY "unit"
    `
    const [afterRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS "count" FROM "VocabWord"`
    const [upperAfterRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS "count" FROM "VocabWord" WHERE "grade" = '初一' AND "volume" = '上册'
    `
    const [progressAfterRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS "count" FROM "VocabProgress"`
    const [sessionsAfterRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS "count" FROM "VocabSession"`
    const afterCount = Number(afterRow?.count ?? 0)
    const upperAfterCount = Number(upperAfterRow?.count ?? 0)
    const progressAfterCount = Number(progressAfterRow?.count ?? 0)
    const sessionsAfterCount = Number(sessionsAfterRow?.count ?? 0)

    if (upperBeforeCount !== upperAfterCount) throw new Error('导入前后七上词条数量发生变化。')
    if (progressBeforeCount !== progressAfterCount) throw new Error('导入过程意外改变了学生背词进度。')
    if (sessionsBeforeCount !== sessionsAfterCount) throw new Error('导入过程意外改变了历史练习记录。')

    console.log(JSON.stringify({
      target: `${target.host}:${target.port}/${target.database}`,
      sourceEntries: GRADE7B_COMPLETE_VOCAB.length,
      databaseLowerEntries: importedRows.length,
      requiredEntriesVerified: GRADE7B_COMPLETE_VOCAB.length - missing.length,
      beforeCount,
      afterCount,
      upperBeforeCount,
      upperAfterCount,
      progressBeforeCount,
      progressAfterCount,
      sessionsBeforeCount,
      sessionsAfterCount,
      sourcePageCounts: Object.fromEntries(pageCounts.map((row) => [row.sourcePage, row.count])),
      unitCounts: Object.fromEntries(unitCounts.map((row) => [row.unit, row.count])),
    }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : '七年级下册词库导入失败')
  process.exitCode = 1
})
