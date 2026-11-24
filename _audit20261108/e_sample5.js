/* E 分片 · 追加 Q1/Q2/Q3/Q4 只读抽样（仅 SELECT） */
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
  // Q1: 常规班 PRESENT 零扣减 6 行上下文
  const q1 = await q('Q1_regular_present_zero_ctx',
    `SELECT a.id, s.name AS student, a."enrollmentId",
            e.status AS enr_status, e."totalHours", e."usedHours", e."remainHours" AS enr_remain,
            l."hoursDeductedAt", g."intensiveMode"::text, g."lessonMinutes", a."actualMinutes",
            l."lessonDate", l.status::text AS lesson_status, a."createdAt"
     FROM "Attendance" a
     JOIN "ClassLesson" l ON l.id=a."lessonId"
     LEFT JOIN "ClassGroup" g ON g.id=l."groupId"
     LEFT JOIN "Student" s ON s.id=a."studentId"
     LEFT JOIN "Enrollment" e ON e.id=a."enrollmentId"
     WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL
       AND a.status='PRESENT' AND COALESCE(a."hoursDeducted",0)=0
       AND COALESCE(g."intensiveMode"::text,'') <> 'INTENSIVE'
     ORDER BY l."lessonDate" DESC`)

  // Q2: LEAVE/ABSENT 已扣课时 总体分布与计费学期
  const q2a = await q('Q2_leave_absent_deduct_dist',
    `SELECT a.status::text, count(*)::int AS n,
            min(l."lessonDate")::text AS min_date, max(l."lessonDate")::text AS max_date,
            min(a."createdAt")::text AS min_created, max(a."createdAt")::text AS max_created,
            count(*) FILTER (WHERE t.kind::text='WEEKEND')::int AS weekend_paid,
            count(*) FILTER (WHERE t.kind::text IS DISTINCT FROM 'WEEKEND')::int AS monthly_or_null,
            avg(a."hoursDeducted")::float AS avg_deduct,
            avg(g."lessonMinutes")::float AS avg_group_minutes
     FROM "Attendance" a JOIN "ClassLesson" l ON l.id=a."lessonId"
     LEFT JOIN "ClassGroup" g ON g.id=l."groupId"
     LEFT JOIN "AcademicTerm" t ON t.id=g."termId"
     WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL
       AND a.status IN ('LEAVE','ABSENT') AND COALESCE(a."hoursDeducted",0)>0
     GROUP BY 1 ORDER BY n DESC`)
  const q2b = await q('Q2_leave_absent_deduct_sample',
    `SELECT a.id, a.status::text, s.name AS student, l."lessonDate", a."hoursDeducted",
            a."actualMinutes", g."lessonMinutes", g."intensiveMode"::text,
            t.kind::text AS term_kind, l."intensiveReviewStatus"::text,
            a."createdAt"::text AS created, l."hoursDeductedAt"::text AS deducted_at
     FROM "Attendance" a JOIN "ClassLesson" l ON l.id=a."lessonId"
     LEFT JOIN "ClassGroup" g ON g.id=l."groupId"
     LEFT JOIN "AcademicTerm" t ON t.id=g."termId"
     LEFT JOIN "Student" s ON s.id=a."studentId"
     WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL
       AND a.status IN ('LEAVE','ABSENT') AND COALESCE(a."hoursDeducted",0)>0
     ORDER BY a.status::text, l."lessonDate" DESC LIMIT 20`)

  // Q3: 37 名"学生级为正、报名级为 0"学生的报名用完情况
  const q3a = await q('Q3_student_positive_enrollment_zero',
    `SELECT count(*)::int AS students,
            count(*) FILTER (WHERE e."usedHours" >= e."totalHours" - 0.05)::int AS used_eq_total,
            count(*) FILTER (WHERE e."remainHours" <= 0.05)::int AS enr_remain_zero,
            count(*) FILTER (WHERE e."usedHours" < e."totalHours" - 0.05)::int AS used_lt_total
     FROM "Student" s
     JOIN "Enrollment" e ON e."studentId"=s.id AND e.status='ACTIVE' AND e."deletedAt" IS NULL
     WHERE s."deletedAt" IS NULL AND s."remainHours" > 0.05
       AND COALESCE((SELECT SUM(x."remainHours") FROM "Enrollment" x WHERE x."studentId"=s.id AND x.status='ACTIVE' AND x."deletedAt" IS NULL),0)=0`)
  const q3b = await q('Q3_no_active_enrollment',
    `SELECT count(*)::int AS students_without_active_enrollment
     FROM "Student" s
     WHERE s."deletedAt" IS NULL AND s."remainHours" > 0.05
       AND NOT EXISTS (SELECT 1 FROM "Enrollment" e WHERE e."studentId"=s.id AND e.status='ACTIVE' AND e."deletedAt" IS NULL)`)
  const q3c = await q('Q3_mismatch_sample',
    `SELECT s.name AS student, s."remainHours" AS student_remain, s."totalHours" AS student_total,
            e.status, e."totalHours" AS enr_total, e."usedHours", e."remainHours" AS enr_remain,
            g.name AS group_name
     FROM "Student" s
     JOIN "Enrollment" e ON e."studentId"=s.id AND e.status='ACTIVE' AND e."deletedAt" IS NULL
     LEFT JOIN "ClassGroup" g ON g.id=e."groupId"
     WHERE s."deletedAt" IS NULL AND s."remainHours" > 0.05
       AND COALESCE((SELECT SUM(x."remainHours") FROM "Enrollment" x WHERE x."studentId"=s.id AND x.status='ACTIVE' AND x."deletedAt" IS NULL),0)=0
     ORDER BY s."remainHours" DESC LIMIT 15`)

  // Q4: 软删考勤行 vs 未提交课次
  const q4a = await q('Q4_soft_deleted_overview',
    `SELECT count(*)::int AS deleted_rows,
            count(*) FILTER (WHERE l."attendanceSubmittedAt" IS NULL)::int AS on_unsubmitted,
            count(*) FILTER (WHERE l."attendanceSubmittedAt" IS NOT NULL)::int AS on_submitted,
            count(*) FILTER (WHERE l."deletedAt" IS NULL)::int AS lesson_active,
            count(*) FILTER (WHERE l.id IS NULL)::int AS orphan_lesson
     FROM "Attendance" a
     LEFT JOIN "ClassLesson" l ON l.id=a."lessonId"
     WHERE a."deletedAt" IS NOT NULL`)
  const q4b = await q('Q4_soft_deleted_unsubmitted_sample',
    `SELECT a.id, s.name AS student, l."lessonDate", a.status::text, a."deletedAt",
            a."deletionBatchId", l."attendanceSubmittedAt"::text AS submitted_at, l.status::text AS lesson_status
     FROM "Attendance" a
     LEFT JOIN "ClassLesson" l ON l.id=a."lessonId"
     LEFT JOIN "Student" s ON s.id=a."studentId"
     WHERE a."deletedAt" IS NOT NULL AND l."attendanceSubmittedAt" IS NULL
     ORDER BY a."deletedAt" DESC LIMIT 10`)

  // Q5: 203 行 APPROVED+PRESENT+零扣减 分桶
  const q5a = await q('Q5_buckets',
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE a."enrollmentId" IS NULL)::int AS no_enrollment,
            count(*) FILTER (WHERE a."enrollmentId" IS NOT NULL AND e."remainHours" <= 0.05)::int AS exhausted_clamp,
            count(*) FILTER (WHERE a."enrollmentId" IS NOT NULL AND e."remainHours" > 0.05)::int AS remain_positive_suspect,
            count(*) FILTER (WHERE a."enrollmentId" IS NOT NULL AND e."totalHours" = 0)::int AS accrual_mode
     FROM "Attendance" a
     JOIN "ClassLesson" l ON l.id=a."lessonId"
     LEFT JOIN "ClassGroup" g ON g.id=l."groupId"
     LEFT JOIN "Enrollment" e ON e.id=a."enrollmentId"
     WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL
       AND g."intensiveMode"::text='INTENSIVE' AND l."intensiveReviewStatus"='APPROVED'
       AND a.status='PRESENT' AND COALESCE(a."hoursDeducted",0)=0`)
  // 真漏扣嫌疑（remain>0）与累计制（totalHours=0）行的 HourTransaction 流水核对
  const q5b = await q('Q5_tx_check',
    `SELECT a.id, s.name AS student, l."lessonDate", e."status" AS enr_status,
            e."totalHours", e."usedHours", e."remainHours" AS enr_remain,
            (SELECT count(*) FROM "HourTransaction" h
              WHERE h."studentId"=a."studentId" AND h."lessonId"=l.id AND h."deletedAt" IS NULL
                AND h.type IN ('INTENSIVE_REVIEW_APPROVED','ATTENDANCE_DEDUCT','ATTENDANCE_ACCRUE'))::int AS tx_count,
            (SELECT array_agg(h.type) FROM "HourTransaction" h
              WHERE h."studentId"=a."studentId" AND h."lessonId"=l.id AND h."deletedAt" IS NULL) AS tx_types,
            CASE WHEN e."remainHours" > 0.05 THEN 'remain_positive'
                 WHEN e."totalHours" = 0 THEN 'accrual_mode' ELSE 'other' END AS bucket
     FROM "Attendance" a
     JOIN "ClassLesson" l ON l.id=a."lessonId"
     LEFT JOIN "ClassGroup" g ON g.id=l."groupId"
     LEFT JOIN "Enrollment" e ON e.id=a."enrollmentId"
     LEFT JOIN "Student" s ON s.id=a."studentId"
     WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL
       AND g."intensiveMode"::text='INTENSIVE' AND l."intensiveReviewStatus"='APPROVED'
       AND a.status='PRESENT' AND COALESCE(a."hoursDeducted",0)=0
       AND (a."enrollmentId" IS NOT NULL AND (e."remainHours" > 0.05 OR e."totalHours" = 0))
     ORDER BY bucket, l."lessonDate" DESC`)
  const q5c = await q('Q5_tx_summary',
    `SELECT bucket, count(*)::int AS rows,
            count(*) FILTER (WHERE tx_count = 0)::int AS no_tx,
            count(*) FILTER (WHERE tx_count > 0)::int AS has_tx
     FROM (
       SELECT a.id,
              CASE WHEN e."remainHours" > 0.05 THEN 'remain_positive'
                   WHEN e."totalHours" = 0 THEN 'accrual_mode' ELSE 'other' END AS bucket,
              (SELECT count(*) FROM "HourTransaction" h
                WHERE h."studentId"=a."studentId" AND h."lessonId"=l.id AND h."deletedAt" IS NULL
                  AND h.type IN ('INTENSIVE_REVIEW_APPROVED','ATTENDANCE_DEDUCT','ATTENDANCE_ACCRUE'))::int AS tx_count
       FROM "Attendance" a
       JOIN "ClassLesson" l ON l.id=a."lessonId"
       LEFT JOIN "ClassGroup" g ON g.id=l."groupId"
       LEFT JOIN "Enrollment" e ON e.id=a."enrollmentId"
       WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL
         AND g."intensiveMode"::text='INTENSIVE' AND l."intensiveReviewStatus"='APPROVED'
         AND a.status='PRESENT' AND COALESCE(a."hoursDeducted",0)=0
         AND a."enrollmentId" IS NOT NULL
     ) x GROUP BY bucket ORDER BY bucket`)

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
  const p = path.join('D:\\01muzhexuetang\\muzhexuetang\\coding\\_audit20261108', 'e_sample5_results.json')
  fs.writeFileSync(p, JSON.stringify(out, null, 2), 'utf8')

  // Q1 分类
  const cls = { b_no_enrollment: 0, a_exhausted: 0, c_real_miss: 0 }
  for (const r of q1) {
    if (r.enrollmentId == null) cls.b_no_enrollment++
    else if (Number(r.enr_remain) <= 0.05) cls.a_exhausted++
    else cls.c_real_miss++
  }
  console.log('Q1 rows:', q1.length, '| 分类:', JSON.stringify(cls))
  console.log('Q2:', JSON.stringify(q2a))
  console.log('Q3a:', JSON.stringify(q3a[0]), '| Q3b 无活跃报名:', q3b[0].students_without_active_enrollment)
  console.log('Q4a:', JSON.stringify(q4a[0]))
  console.log('Q5a buckets:', JSON.stringify(q5a[0]))
  console.log('Q5c tx summary:', JSON.stringify(q5c))
  console.log('written:', p)
}
main().catch((e) => { console.error('ERR', e); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect() })
