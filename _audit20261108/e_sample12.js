/* I 分片 · 通路6/7/12 只读抽样（仅 SELECT） */
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
  // P6-1 报名台账内部一致性：total-used vs remain（预付制/累计制分开）
  await q('P6_1_enrollment_internal',
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE e."totalHours" > 0)::int AS prepaid,
            count(*) FILTER (WHERE e."totalHours" = 0)::int AS accrual,
            count(*) FILTER (WHERE e."totalHours" > 0 AND ABS(ROUND(e."remainHours"::numeric,1) - ROUND((e."totalHours"-e."usedHours")::numeric,1)) > 0.05)::int AS prepaid_mismatch,
            count(*) FILTER (WHERE e."totalHours" = 0 AND ABS(e."usedHours"::numeric - e."remainHours"::numeric) > 0.05)::int AS accrual_mismatch
     FROM "Enrollment" e WHERE e.status='ACTIVE' AND e."deletedAt" IS NULL`)

  // P6-2 快照 vs 活跃报名汇总（全量活跃学生）
  await q('P6_2_snapshot_vs_enrollment',
    `SELECT count(*)::int AS active_students,
            count(*) FILTER (WHERE ABS(s."remainHours"::numeric - COALESCE(enr.remain,0)::numeric) > 0.05)::int AS remain_mismatch,
            count(*) FILTER (WHERE ABS(s."totalHours"::numeric - COALESCE(enr.total,0)::numeric) > 0.05)::int AS total_mismatch
     FROM "Student" s
     LEFT JOIN (SELECT "studentId", SUM("remainHours") AS remain, SUM("totalHours") AS total
                 FROM "Enrollment" WHERE status='ACTIVE' AND "deletedAt" IS NULL GROUP BY 1) enr
       ON enr."studentId"=s.id
     WHERE s."deletedAt" IS NULL AND s.status NOT IN ('INACTIVE','ARCHIVED')`)

  // P6-3 近 30 天有课时流水的报名：台账内部 + 快照对照明细
  const p63 = await q('P6_3_recent_tx_enrollments',
    `SELECT e.id, s.name, e."totalHours", e."usedHours", e."remainHours",
            s."remainHours" AS student_remain,
            max(h."createdAt")::text AS last_tx,
            ABS(ROUND(e."remainHours"::numeric,1)-ROUND((e."totalHours"-e."usedHours")::numeric,1))::float AS internal_gap
     FROM "Enrollment" e JOIN "Student" s ON s.id=e."studentId"
     LEFT JOIN "HourTransaction" h ON h."enrollmentId"=e.id AND h."deletedAt" IS NULL
     WHERE e.status='ACTIVE' AND e."deletedAt" IS NULL
     GROUP BY e.id, s.name, e."totalHours", e."usedHours", e."remainHours", s."remainHours"
     HAVING max(h."createdAt") >= now() - interval '30 days'
     ORDER BY last_tx DESC LIMIT 30`)
  const p63summary = {
    rows: p63.length,
    internal_gap_gt_005: p63.filter((r) => Number(r.internal_gap) > 0.05).length,
    snapshot_mismatch: p63.filter((r) => Math.abs(Number(r.student_remain) - Number(r.remainHours)) > 0.05).length,
  }
  out.queries.P6_3_summary = { sql: 'derived from P6_3_recent_tx_enrollments', rows: [p63summary] }

  // P7-1 收费记录总览
  await q('P7_1_fee_overview',
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE f.status='paid')::int AS paid,
            count(*) FILTER (WHERE f.status='pending')::int AS pending,
            count(*) FILTER (WHERE f."deletedAt" IS NOT NULL)::int AS soft_deleted,
            count(*) FILTER (WHERE f.hours IS NOT NULL)::int AS hours_recorded,
            COALESCE(SUM(f.amount) FILTER (WHERE f."deletedAt" IS NULL),0)::float AS amount_sum_active,
            COALESCE(SUM(f.hours) FILTER (WHERE f."deletedAt" IS NULL),0)::float AS hours_sum_active
     FROM "Fee" f`)

  // P7-2 收费学生孤儿
  await q('P7_2_fee_student_orphan',
    `SELECT count(*)::int AS fee_rows,
            count(*) FILTER (WHERE st.id IS NULL)::int AS orphan_student
     FROM "Fee" f LEFT JOIN "Student" st ON st.id=f."studentId"`)

  // P7-3 收费登记课时 vs 报名台账（抽样）
  await q('P7_3_fee_hours_vs_ledger',
    `SELECT f.id, s.name, f.hours, f.amount, f.status,
            e."totalHours", e."remainHours", e.status AS enr_status, g.name AS group_name
     FROM "Fee" f JOIN "Student" s ON s.id=f."studentId"
     LEFT JOIN "Enrollment" e ON e."studentId"=s.id AND e.status='ACTIVE' AND e."deletedAt" IS NULL
     LEFT JOIN "ClassGroup" g ON g.id=e."groupId"
     WHERE f."deletedAt" IS NULL AND f.hours IS NOT NULL AND f.hours > 0
     ORDER BY f."createdAt" DESC LIMIT 15`)

  // P12-1 学员导出覆盖口径：导出 where 只有 division，无 deletedAt/status 过滤
  await q('P12_1_student_export_exposure',
    `SELECT count(*)::int AS export_includes,
            count(*) FILTER (WHERE s."deletedAt" IS NOT NULL)::int AS soft_deleted,
            count(*) FILTER (WHERE s.status='INACTIVE')::int AS inactive,
            count(*) FILTER (WHERE s."deletedAt" IS NULL AND s.status NOT IN ('INACTIVE','ARCHIVED'))::int AS visible
     FROM "Student" s`)

  // P12-2 导出学员缴费总额：是否混入软删收费
  await q('P12_2_fee_export_sum',
    `SELECT count(*)::int AS fee_rows,
            count(*) FILTER (WHERE f.status='paid')::int AS paid_all,
            count(*) FILTER (WHERE f.status='paid' AND f."deletedAt" IS NULL)::int AS paid_active,
            COALESCE(SUM(f.amount) FILTER (WHERE f.status='paid'),0)::float AS paid_sum_all,
            COALESCE(SUM(f.amount) FILTER (WHERE f.status='paid' AND f."deletedAt" IS NULL),0)::float AS paid_sum_active
     FROM "Fee" f`)

  // P12-3 考勤导出软删行
  await q('P12_3_attendance_soft_deleted',
    `SELECT count(*)::int AS soft_deleted_attendance FROM "Attendance" WHERE "deletedAt" IS NOT NULL`)

  const sanitize = (row) => {
    const r = {}
    for (const [k, v] of Object.entries(row)) {
      if (['student', 'teacher'].includes(k)) r[k] = mask(v)
      else if (v instanceof Date) r[k] = iso(v)
      else if (typeof v === 'number') r[k] = Number(v)
      else r[k] = v == null ? null : (Array.isArray(v) ? v.map((x) => (x instanceof Date ? iso(x) : x)) : v)
    }
    return r
  }
  for (const item of Object.values(out.queries)) item.rows = item.rows.map(sanitize)
  const p = path.join('D:\\01muzhexuetang\\muzhexuetang\\coding\\_audit20261108', 'e_sample12_results.json')
  fs.writeFileSync(p, JSON.stringify(out, null, 2), 'utf8')
  console.log('P6-1:', JSON.stringify(out.queries.P6_1_enrollment_internal.rows[0]))
  console.log('P6-2:', JSON.stringify(out.queries.P6_2_snapshot_vs_enrollment.rows[0]))
  console.log('P6-3:', JSON.stringify(p63summary))
  console.log('P7-1:', JSON.stringify(out.queries.P7_1_fee_overview.rows[0]))
  console.log('P7-2:', JSON.stringify(out.queries.P7_2_fee_student_orphan.rows[0]))
  console.log('P12-1:', JSON.stringify(out.queries.P12_1_student_export_exposure.rows[0]))
  console.log('P12-2:', JSON.stringify(out.queries.P12_2_fee_export_sum.rows[0]))
  console.log('P12-3:', JSON.stringify(out.queries.P12_3_attendance_soft_deleted.rows[0]))
  console.log('written:', p)
}
main().catch((e) => { console.error('ERR', e); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect() })
