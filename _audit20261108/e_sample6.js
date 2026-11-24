/* E 分片 · Q1c/Q5 复核补充（只读 SELECT） */
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
  // Q5 细分：203 行里 累计制(totalHours=0) vs 预付制余额封顶(totalHours>0, remain=0)
  const a = await q('Q5_split',
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE e."totalHours" = 0)::int AS accrual_mode,
            count(*) FILTER (WHERE e."totalHours" > 0 AND e."remainHours" <= 0.05)::int AS prepaid_exhausted,
            count(*) FILTER (WHERE e."totalHours" > 0 AND e."remainHours" > 0.05)::int AS prepaid_remain_positive,
            count(*) FILTER (WHERE a."enrollmentId" IS NULL)::int AS no_enrollment
     FROM "Attendance" a
     JOIN "ClassLesson" l ON l.id=a."lessonId"
     LEFT JOIN "ClassGroup" g ON g.id=l."groupId"
     LEFT JOIN "Enrollment" e ON e.id=a."enrollmentId"
     WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL
       AND g."intensiveMode"::text='INTENSIVE' AND l."intensiveReviewStatus"='APPROVED'
       AND a.status='PRESENT' AND COALESCE(a."hoursDeducted",0)=0`)

  // Q1c: 3 行有台账、余额为正、行级扣减 0 —— 查对应 HourTransaction
  const b = await q('Q1c_tx_check',
    `SELECT a.id, s.name AS student, l."lessonDate", e."remainHours" AS enr_remain, e."totalHours", e."usedHours",
            (SELECT count(*) FROM "HourTransaction" h WHERE h."studentId"=a."studentId" AND h."lessonId"=l.id AND h."deletedAt" IS NULL)::int AS tx_count,
            (SELECT array_agg(h.type) FROM "HourTransaction" h WHERE h."studentId"=a."studentId" AND h."lessonId"=l.id AND h."deletedAt" IS NULL) AS tx_types,
            (SELECT array_agg(h.amount) FROM "HourTransaction" h WHERE h."studentId"=a."studentId" AND h."lessonId"=l.id AND h."deletedAt" IS NULL) AS tx_amounts
     FROM "Attendance" a
     JOIN "ClassLesson" l ON l.id=a."lessonId"
     LEFT JOIN "ClassGroup" g ON g.id=l."groupId"
     LEFT JOIN "Enrollment" e ON e.id=a."enrollmentId"
     LEFT JOIN "Student" s ON s.id=a."studentId"
     WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL
       AND a.status='PRESENT' AND COALESCE(a."hoursDeducted",0)=0
       AND COALESCE(g."intensiveMode"::text,'') <> 'INTENSIVE'
       AND a."enrollmentId" IS NOT NULL AND e."remainHours" > 0.05
     ORDER BY l."lessonDate" DESC`)

  // Q3: 无活跃报名的 6 名学生快照情况
  const c = await q('Q3_no_active_enrollment',
    `SELECT s.name AS student, s."remainHours" AS student_remain, s."totalHours" AS student_total,
            s.status::text AS student_status,
            count(e.id)::int AS all_enrollments,
            count(e.id) FILTER (WHERE e.status='ACTIVE')::int AS active_enrollments,
            count(e.id) FILTER (WHERE e.status='WITHDRAWN')::int AS withdrawn,
            count(e.id) FILTER (WHERE e.status='COMPLETED')::int AS completed
     FROM "Student" s
     LEFT JOIN "Enrollment" e ON e."studentId"=s.id AND e."deletedAt" IS NULL
     WHERE s."deletedAt" IS NULL AND s."remainHours" > 0.05
       AND NOT EXISTS (SELECT 1 FROM "Enrollment" x WHERE x."studentId"=s.id AND x.status='ACTIVE' AND x."deletedAt" IS NULL)
     GROUP BY s.id, s.name, s."remainHours", s."totalHours", s.status
     ORDER BY s."remainHours" DESC LIMIT 10`)

  // Q4 复核：全表软删考勤行总数
  const d = await q('Q4_total_soft_deleted',
    `SELECT count(*)::int AS soft_deleted,
            count(*) FILTER (WHERE "deletionBatchId" IS NOT NULL)::int AS has_batch
     FROM "Attendance" WHERE "deletedAt" IS NOT NULL`)

  // Q2 复核：扣减课时是否 = round(lessonMinutes/60)
  const e = await q('Q2_deduct_vs_minutes',
    `SELECT a.status::text, count(*)::int AS n,
            count(*) FILTER (WHERE ABS(a."hoursDeducted" - ROUND(g."lessonMinutes"::numeric/60, 1)) < 0.05)::int AS matches_minutes,
            min(g."lessonMinutes")::int AS min_min, max(g."lessonMinutes")::int AS max_min
     FROM "Attendance" a JOIN "ClassLesson" l ON l.id=a."lessonId"
     LEFT JOIN "ClassGroup" g ON g.id=l."groupId"
     WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL
       AND a.status IN ('LEAVE','ABSENT') AND COALESCE(a."hoursDeducted",0)>0
     GROUP BY 1`)

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
  const p = path.join('D:\\01muzhexuetang\\muzhexuetang\\coding\\_audit20261108', 'e_sample6_results.json')
  fs.writeFileSync(p, JSON.stringify(out, null, 2), 'utf8')
  console.log('Q5 split:', JSON.stringify(a[0]))
  console.log('Q1c rows:', b.length)
  console.log('Q3 no-active:', c.length)
  console.log('Q4 soft-deleted:', JSON.stringify(d[0]))
  console.log('Q2:', JSON.stringify(e))
  console.log('written:', p)
}
main().catch((e) => { console.error('ERR', e); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect() })
