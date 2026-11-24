/* E 分片 · Q1c 单课次逐生对照（只读 SELECT） */
const path = require('path')
const fs = require('fs')
const repoRoot = 'D:\\01muzhexuetang\\muzhexuetang\\coding\\edu-manage'
process.chdir(repoRoot)
require(path.join(repoRoot, 'node_modules', 'dotenv')).config({ path: path.join(repoRoot, '.env') })
const { PrismaClient } = require(path.join(repoRoot, 'node_modules', '@prisma/client'))
const prisma = new PrismaClient()
const out = { queries: {} }
async function q(label, sql) { const rows = await prisma.$queryRawUnsafe(sql); out.queries[label] = { sql, rows }; return rows }
async function main() {
  const a = await q('Q1c_lesson_rows',
    `SELECT a.id, a.status::text, a."enrollmentId" IS NOT NULL AS has_enr,
            e."totalHours", e."usedHours", e."remainHours",
            a."hoursDeducted", a."actualMinutes",
            (SELECT h.type FROM "HourTransaction" h WHERE h."studentId"=a."studentId" AND h."lessonId"=a."lessonId" AND h."deletedAt" IS NULL LIMIT 1) AS tx_type,
            (SELECT h.amount FROM "HourTransaction" h WHERE h."studentId"=a."studentId" AND h."lessonId"=a."lessonId" AND h."deletedAt" IS NULL LIMIT 1) AS tx_amount,
            (SELECT h."afterHours" FROM "HourTransaction" h WHERE h."studentId"=a."studentId" AND h."lessonId"=a."lessonId" AND h."deletedAt" IS NULL LIMIT 1) AS tx_after
     FROM "Attendance" a
     LEFT JOIN "Enrollment" e ON e.id=a."enrollmentId"
     WHERE a."deletedAt" IS NULL AND a."lessonId"='cmrbpyx8d001snropqfo4r0ls'
     ORDER BY a."hoursDeducted" DESC NULLS LAST`)
  const b = await q('Q1c_lesson_tx_types',
    `SELECT h.type, count(*)::int AS n, min(h.amount)::float AS min_amt, max(h.amount)::float AS max_amt
     FROM "HourTransaction" h
     WHERE h."lessonId"='cmrbpyx8d001snropqfo4r0ls' AND h."deletedAt" IS NULL
     GROUP BY h.type`)
  const p = path.join('D:\\01muzhexuetang\\muzhexuetang\\coding\\_audit20261108', 'e_sample11_results.json')
  fs.writeFileSync(p, JSON.stringify(out, null, 2), 'utf8')
  console.log('rows:', a.length, '| tx:', JSON.stringify(b))
}
main().catch((e) => { console.error('ERR', e); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect() })
