/* E 分片 · Q1c 课次级对照（只读 SELECT） */
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
  const a = await q('Q1c_lesson_context',
    `SELECT l.id AS lesson_id, l."lessonDate", l."status"::text AS lesson_status,
            l."attendanceSubmittedAt"::text, l."hoursDeductedAt"::text,
            count(a.id)::int AS attendance_rows,
            count(a.id) FILTER (WHERE COALESCE(a."hoursDeducted",0)>0)::int AS deducted_rows,
            count(h.id)::int AS lesson_tx_count,
            string_agg(DISTINCT g."intensiveMode"::text, ',') AS mode
     FROM "Attendance" a
     JOIN "ClassLesson" l ON l.id=a."lessonId"
     LEFT JOIN "ClassGroup" g ON g.id=l."groupId"
     LEFT JOIN "HourTransaction" h ON h."lessonId"=l.id AND h."deletedAt" IS NULL
     WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL
       AND a.status='PRESENT' AND COALESCE(a."hoursDeducted",0)=0
       AND COALESCE(g."intensiveMode"::text,'') <> 'INTENSIVE'
       AND a."enrollmentId" IS NOT NULL
     GROUP BY l.id, l."lessonDate", l."status", l."attendanceSubmittedAt", l."hoursDeductedAt"
     ORDER BY l."lessonDate" DESC`)
  const p = path.join('D:\\01muzhexuetang\\muzhexuetang\\coding\\_audit20261108', 'e_sample10_results.json')
  fs.writeFileSync(p, JSON.stringify(out, null, 2), 'utf8')
  console.log(JSON.stringify(a, null, 1))
}
main().catch((e) => { console.error('ERR', e); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect() })
