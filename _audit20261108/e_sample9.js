/* E 分片 · Q3 单生报名历史复核（只读 SELECT） */
const path = require('path')
const fs = require('fs')
const repoRoot = 'D:\\01muzhexuetang\\muzhexuetang\\coding\\edu-manage'
process.chdir(repoRoot)
require(path.join(repoRoot, 'node_modules', 'dotenv')).config({ path: path.join(repoRoot, '.env') })
const { PrismaClient } = require(path.join(repoRoot, 'node_modules', '@prisma/client'))
const prisma = new PrismaClient()
const mask = (n) => { if (n == null) return null; const s = String(n).trim(); return s ? s[0] + '**' : null }
const out = { queries: {} }
async function q(label, sql) { const rows = await prisma.$queryRawUnsafe(sql); out.queries[label] = { sql, rows }; return rows }
async function main() {
  const a = await q('Q3_enrollment_history',
    `SELECT s.name AS student, e.id, e.status::text, e."totalHours", e."usedHours", e."remainHours",
            e."enrolledAt"::text, g.name AS group_name, g."intensiveMode"::text
     FROM "Student" s
     JOIN "Enrollment" e ON e."studentId"=s.id
     LEFT JOIN "ClassGroup" g ON g.id=e."groupId"
     WHERE s."deletedAt" IS NULL AND s."remainHours" > 0.05
       AND COALESCE((SELECT SUM(x."remainHours") FROM "Enrollment" x WHERE x."studentId"=s.id AND x.status='ACTIVE' AND x."deletedAt" IS NULL),0)=0
     ORDER BY s.name, e."enrolledAt" LIMIT 30`)
  const p = path.join('D:\\01muzhexuetang\\muzhexuetang\\coding\\_audit20261108', 'e_sample9_results.json')
  fs.writeFileSync(p, JSON.stringify(out, null, 2), 'utf8')
  console.log('rows:', a.length)
  console.log('written:', p)
}
main().catch((e) => { console.error('ERR', e); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect() })
