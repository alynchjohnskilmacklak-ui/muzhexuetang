import 'dotenv/config'
import { Prisma, PrismaClient } from '@prisma/client'
import { GRADE7A_COMPLETE_VOCAB } from '../src/data/vocab-sets'
import { vocabDatabaseData } from '../src/lib/vocab-catalog'
import { parseLocalEduManageTarget } from '../src/lib/vocab-database-target'

function validateCatalog() {
  const identities = new Set<string>()
  const ids = new Map<string, string>()

  for (const entry of GRADE7A_COMPLETE_VOCAB) {
    const normalizedHeadword = entry.headword.trim().toLocaleLowerCase('en-US').replace(/[’‘]/g, "'")
    const identity = [entry.grade, entry.volume, entry.unit, normalizedHeadword].join('\u001f')
    if (identities.has(identity)) throw new Error(`词表存在重复词条：${entry.unit} / ${entry.headword}`)
    identities.add(identity)

    const previousIdentity = ids.get(entry.id)
    if (previousIdentity && previousIdentity !== identity) throw new Error(`词表 ID 冲突：${entry.id}`)
    ids.set(entry.id, identity)

    if (!entry.pos.trim() || entry.meanings.length === 0 || entry.meanings.some((meaning) => !meaning.trim())) {
      throw new Error(`词条字段不完整：${entry.unit} / ${entry.headword}`)
    }
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
    const beforeCount = Number(beforeRow?.count ?? 0)
    await prisma.$transaction(async (tx) => {
      for (const entry of GRADE7A_COMPLETE_VOCAB) {
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

    const [afterRow] = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS "count" FROM "VocabWord"`
    const afterCount = Number(afterRow?.count ?? 0)
    const rows = await prisma.$queryRaw<Array<{ unit: string; count: number }>>`
      SELECT "unit", COUNT(*)::int AS "count"
      FROM "VocabWord"
      WHERE "grade" = '初一' AND "volume" = '上册'
      GROUP BY "unit"
    `
    const units = rows
      .map((row) => [row.unit, row.count] as const)
      .sort(([left], [right]) => left.localeCompare(right, 'zh-CN'))
    const importedRows = await prisma.$queryRaw<Array<{ unit: string; headword: string; normalizedHeadword: string }>>`
      SELECT "unit", "headword", "normalizedHeadword"
      FROM "VocabWord"
      WHERE "grade" = '初一' AND "volume" = '上册'
    `
    const importedKeys = new Set(importedRows.map((row) => `${row.unit}\u001f${row.normalizedHeadword}`))
    const missing = GRADE7A_COMPLETE_VOCAB.filter((entry) =>
      !importedKeys.has(`${entry.unit}\u001f${entry.headword.trim().toLocaleLowerCase('en-US').replace(/[’‘]/g, "'")}`),
    )
    if (missing.length) throw new Error(`数据库复核发现 ${missing.length} 条词条缺失；示例：${missing.slice(0, 5).map((entry) => entry.headword).join(', ')}`)

    console.log(JSON.stringify({
      target: `${target.host}:${target.port}/${target.database}`,
      sourceEntries: GRADE7A_COMPLETE_VOCAB.length,
      beforeCount,
      afterCount,
      grade7UpperCount: importedRows.length,
      units: Object.fromEntries(units),
    }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : '词库导入失败')
  process.exitCode = 1
})
