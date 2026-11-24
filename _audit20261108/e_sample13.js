/* I 分片 · 通路12 导出口径补充抽样（只读 SELECT） */
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
  // 学员导出口径（where 仅 division，无 deletedAt/status 过滤）：快照 vs 报名汇总
  await q('P12_4_export_students_mismatch',
    `SELECT count(*)::int AS export_includes,
            count(*) FILTER (WHERE ABS(s."remainHours"::numeric - COALESCE(enr.remain,0)::numeric) > 0.05)::int AS remain_mismatch,
            count(*) FILTER (WHERE s."deletedAt" IS NOT NULL)::int AS soft_deleted,
            count(*) FILTER (WHERE s.status='INACTIVE')::int AS inactive,
            COALESCE(SUM(s."remainHours") FILTER (WHERE s."deletedAt" IS NOT NULL),0)::float AS soft_deleted_hours
     FROM "Student" s
     LEFT JOIN (SELECT "studentId", SUM("remainHours") AS remain FROM "Enrollment"
                 WHERE status='ACTIVE' AND "deletedAt" IS NULL GROUP BY 1) enr ON enr."studentId"=s.id`)

  // 不可见学员样本（脱敏）
  await q('P12_5_invisible_sample',
    `SELECT s.name, s.status::text, s."deletedAt"::text, s."remainHours", s."totalHours",
            (SELECT count(*) FROM "Enrollment" e WHERE e."studentId"=s.id AND e.status='ACTIVE' AND e."deletedAt" IS NULL)::int AS active_enrollments
     FROM "Student" s
     WHERE s."deletedAt" IS NOT NULL OR s.status='INACTIVE'
     ORDER BY s."deletedAt" NULLS LAST, s.status LIMIT 15`)

  // 导出学员缴费总额口径：fee include 无 deletedAt 过滤，仅 JS 过滤 status='paid'
  await q('P12_6_fee_included_in_export',
    `SELECT count(*)::int AS fee_rows,
            count(*) FILTER (WHERE f.status='paid')::int AS paid_rows,
            count(*) FILTER (WHERE f.status='paid' AND f."deletedAt" IS NOT NULL)::int AS paid_soft_deleted,
            COALESCE(SUM(f.amount) FILTER (WHERE f.status='paid'),0)::float AS paid_sum_js_filter,
            COALESCE(SUM(f.amount) FILTER (WHERE f.status='paid' AND f."deletedAt" IS NULL),0)::float AS paid_sum_db_filter
     FROM "Fee" f`)

  const sanitize = (row) => {
    const r = {}
    for (const [k, v] of Object.entries(row)) {
      if (['name', 'student', 'teacher'].includes(k)) r[k] = mask(v)
      else if (v instanceof Date) r[k] = v.toISOString()
      else if (typeof v === 'number') r[k] = Number(v)
      else r[k] = v == null ? null : v
    }
    return r
  }
  for (const item of Object.values(out.queries)) item.rows = item.rows.map(sanitize)
  const p = path.join('D:\\01muzhexuetang\\muzhexuetang\\coding\\_audit20261108', 'e_sample13_results.json')
  fs.writeFileSync(p, JSON.stringify(out, null, 2), 'utf8')
  console.log('P12-4:', JSON.stringify(out.queries.P12_4_export_students_mismatch.rows[0]))
  console.log('P12-6:', JSON.stringify(out.queries.P12_6_fee_included_in_export.rows[0]))
  console.log('written:', p)
}
main().catch((e) => { console.error('ERR', e); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect() })
