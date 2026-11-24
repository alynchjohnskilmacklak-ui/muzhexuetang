/* E 分片 · Q3 漂移学生流水类型分布（只读 SELECT） */
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
  const a = await q('Q3_drift_tx_types',
    `SELECT h.type, count(*)::int AS n,
            count(*) FILTER (WHERE h.amount < 0)::int AS negative,
            count(*) FILTER (WHERE h.amount > 0)::int AS positive,
            min(h."createdAt")::text AS first_at, max(h."createdAt")::text AS last_at
     FROM "HourTransaction" h
     WHERE h."deletedAt" IS NULL
       AND h."studentId" IN (
         SELECT s.id FROM "Student" s
         WHERE s."deletedAt" IS NULL AND s."remainHours" > 0.05
           AND COALESCE((SELECT SUM(x."remainHours") FROM "Enrollment" x WHERE x."studentId"=s.id AND x.status='ACTIVE' AND x."deletedAt" IS NULL),0)=0
       )
     GROUP BY h.type ORDER BY n DESC`)
  // 单生样本：最近 8 条流水
  const b = await q('Q3_one_student_recent_tx',
    `SELECT h.type, h.amount, h."beforeHours", h."afterHours", h."lessonId" IS NOT NULL AS has_lesson, h."createdAt"::text
     FROM "HourTransaction" h
     WHERE h."deletedAt" IS NULL AND h."studentId" IN (
         SELECT s.id FROM "Student" s
         WHERE s."deletedAt" IS NULL AND s."remainHours" > 0.05
           AND COALESCE((SELECT SUM(x."remainHours") FROM "Enrollment" x WHERE x."studentId"=s.id AND x.status='ACTIVE' AND x."deletedAt" IS NULL),0)=0
         LIMIT 1)
     ORDER BY h."createdAt" DESC LIMIT 8`)
  const p = path.join('D:\\01muzhexuetang\\muzhexuetang\\coding\\_audit20261108', 'e_sample8_results.json')
  fs.writeFileSync(p, JSON.stringify(out, null, 2), 'utf8')
  console.log(JSON.stringify(a))
  console.log('written:', p)
}
main().catch((e) => { console.error('ERR', e); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect() })
