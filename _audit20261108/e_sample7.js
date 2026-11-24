/* E 分片 · Q3 流水与快照时效复核（只读 SELECT） */
const path = require('path')
const fs = require('fs')
const repoRoot = 'D:\\01muzhexuetang\\muzhexuetang\\coding\\edu-manage'
process.chdir(repoRoot)
require(path.join(repoRoot, 'node_modules', 'dotenv')).config({ path: path.join(repoRoot, '.env') })
const { PrismaClient } = require(path.join(repoRoot, 'node_modules', '@prisma/client'))
const prisma = new PrismaClient()
const mask = (n) => { if (n == null) return null; const s = String(n).trim(); return s ? s[0] + '**' : null }
const iso = (d) => (d == null ? null : new Date(d).toISOString())
const out = { queries: {} }
async function q(label, sql) { const rows = await prisma.$queryRawUnsafe(sql); out.queries[label] = { sql, rows }; return rows }

async function main() {
  // 漂移学生：报名 used=total、remain=0，但 Student 快照仍为正
  const a = await q('Q3_drift_students_tx',
    `SELECT s.name AS student, s."remainHours" AS student_remain, s."totalHours" AS student_total,
            e."totalHours" AS enr_total, e."usedHours", e."remainHours" AS enr_remain,
            count(h.id)::int AS tx_count,
            count(h.id) FILTER (WHERE h.type IN ('ATTENDANCE_DEDUCT','INTENSIVE_REVIEW_APPROVED','ATTENDANCE_ACCRUE'))::int AS hour_tx,
            max(h."createdAt")::text AS last_tx_at,
            s."updatedAt"::text AS student_updated_at
     FROM "Student" s
     JOIN "Enrollment" e ON e."studentId"=s.id AND e.status='ACTIVE' AND e."deletedAt" IS NULL
     LEFT JOIN "HourTransaction" h ON h."studentId"=s.id AND h."deletedAt" IS NULL
     WHERE s."deletedAt" IS NULL AND s."remainHours" > 0.05
       AND COALESCE((SELECT SUM(x."remainHours") FROM "Enrollment" x WHERE x."studentId"=s.id AND x.status='ACTIVE' AND x."deletedAt" IS NULL),0)=0
     GROUP BY s.id, s.name, s."remainHours", s."totalHours", e."totalHours", e."usedHours", e."remainHours", s."updatedAt"
     ORDER BY s."remainHours" DESC LIMIT 15`)
  // 全量漂移学生的流水有无统计
  const b = await q('Q3_drift_tx_summary',
    `SELECT count(*)::int AS drift_students,
            count(*) FILTER (WHERE tx_count = 0)::int AS no_tx,
            count(*) FILTER (WHERE tx_count > 0)::int AS has_tx,
            count(*) FILTER (WHERE x."updatedAt" < COALESCE(x.last_tx_at, x."updatedAt"))::int AS snapshot_stale_after_tx
     FROM (
       SELECT s.id, s."remainHours", s."updatedAt",
              count(h.id)::int AS tx_count, max(h."createdAt") AS last_tx_at
       FROM "Student" s
       LEFT JOIN "Enrollment" e ON e."studentId"=s.id AND e.status='ACTIVE' AND e."deletedAt" IS NULL
       LEFT JOIN "HourTransaction" h ON h."studentId"=s.id AND h."deletedAt" IS NULL
       WHERE s."deletedAt" IS NULL AND s."remainHours" > 0.05
         AND COALESCE((SELECT SUM(x."remainHours") FROM "Enrollment" x WHERE x."studentId"=s.id AND x.status='ACTIVE' AND x."deletedAt" IS NULL),0)=0
       GROUP BY s.id, s."remainHours", s."updatedAt"
     ) x`)

  const sanitize = (row) => {
    const r = {}
    for (const [k, v] of Object.entries(row)) {
      if (['student', 'teacher'].includes(k)) r[k] = mask(v)
      else if (v instanceof Date) r[k] = iso(v)
      else if (typeof v === 'number') r[k] = Number(v)
      else r[k] = v == null ? null : v
    }
    return r
  }
  for (const item of Object.values(out.queries)) item.rows = item.rows.map(sanitize)
  const p = path.join('D:\\01muzhexuetang\\muzhexuetang\\coding\\_audit20261108', 'e_sample7_results.json')
  fs.writeFileSync(p, JSON.stringify(out, null, 2), 'utf8')
  console.log('Q3 summary:', JSON.stringify(b[0]))
  console.log('written:', p)
}
main().catch((e) => { console.error('ERR', e); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect() })
