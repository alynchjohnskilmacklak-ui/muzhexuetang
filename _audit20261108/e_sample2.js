/* E 分片 · 细化抽样（只读 SELECT） */
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

async function q(label, sql) {
  const rows = await prisma.$queryRawUnsafe(sql)
  out.queries[label] = { sql, rows }
  return rows
}

async function main() {
  // S3 细化：已提交课次下，零/空扣减行按 status 拆分
  const s3d = await q('S3d_zero_deduct_by_status',
    `SELECT a.status::text, count(*)::int AS rows,
            count(*) FILTER (WHERE COALESCE(a."hoursDeducted",0)=0)::int AS zero_deduct
     FROM "Attendance" a
     JOIN "ClassLesson" l ON l.id = a."lessonId"
     WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL
     GROUP BY a.status ORDER BY rows DESC`)
  // PRESENT 但零扣减（漏扣嫌疑最大）
  const s3e = await q('S3e_present_zero_deduct_sample',
    `SELECT a.id, s.name AS student, l."lessonDate", a.status, a."hoursDeducted",
            a."actualMinutes", l."hoursDeductedAt", l."intensiveReviewStatus"
     FROM "Attendance" a
     JOIN "ClassLesson" l ON l.id = a."lessonId"
     LEFT JOIN "Student" s ON s.id = a."studentId"
     WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL
       AND a.status = 'PRESENT' AND COALESCE(a."hoursDeducted",0) = 0
     ORDER BY l."lessonDate" DESC LIMIT 20`)
  // 已提交但缺 hoursDeductedAt 的课次样本
  const s3f = await q('S3f_submitted_no_deducted_at_sample',
    `SELECT l.id, t.name AS teacher, l."lessonDate", l.status, l."attendanceSubmittedAt",
            l."hoursDeductedAt", count(a.id)::int AS att_rows,
            count(*) FILTER (WHERE COALESCE(a."hoursDeducted",0)>0)::int AS deducted_rows
     FROM "ClassLesson" l
     LEFT JOIN "Teacher" t ON t.id = l."teacherId"
     LEFT JOIN "Attendance" a ON a."lessonId" = l.id AND a."deletedAt" IS NULL
     WHERE l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL AND l."hoursDeductedAt" IS NULL
     GROUP BY l.id, t.name, l."lessonDate", l.status, l."attendanceSubmittedAt", l."hoursDeductedAt"
     ORDER BY l."lessonDate" DESC LIMIT 15`)

  // S5 细化：同课同师出现多条 LESSON_PAY（真正重复课时工资嫌疑）
  const s5c = await q('S5c_duplicate_lesson_pay',
    `SELECT "lessonId", "teacherId", count(*)::int AS pay_rows,
            array_agg(amount) AS amounts, array_agg(x."createdAt") AS created
     FROM "TeacherSalaryTransaction" x
     WHERE x."deletedAt" IS NULL AND x."lessonId" IS NOT NULL AND type = 'LESSON_PAY'
     GROUP BY "lessonId", "teacherId" HAVING count(*) > 1 ORDER BY pay_rows DESC LIMIT 20`)
  // 重复组里 LESSON_PAY 条数分布
  const s5d = await q('S5d_groups_pay_breakdown',
    `SELECT pay_rows, count(*)::int AS groups FROM (
       SELECT "lessonId", "teacherId",
              count(*) FILTER (WHERE type='LESSON_PAY')::int AS pay_rows
       FROM "TeacherSalaryTransaction"
       WHERE "deletedAt" IS NULL AND "lessonId" IS NOT NULL
       GROUP BY "lessonId", "teacherId"
     ) g GROUP BY pay_rows ORDER BY pay_rows`)

  // G3a 细化：不一致学生的报名行明细
  const g3b = await q('G3c_mismatch_enrollment_detail',
    `SELECT s.name AS student, s."remainHours" AS student_remain,
            e.id AS enrollment_id, e.status, e."totalHours", e."usedHours", e."remainHours" AS enrollment_remain,
            g.name AS group_name
     FROM "Student" s
     JOIN "Enrollment" e ON e."studentId" = s.id
     LEFT JOIN "ClassGroup" g ON g.id = e."groupId"
     JOIN (SELECT "studentId", SUM("remainHours")::float AS sum FROM "Enrollment"
           WHERE status='ACTIVE' AND "deletedAt" IS NULL GROUP BY "studentId") enr
       ON enr."studentId" = s.id
     WHERE s."deletedAt" IS NULL AND e."deletedAt" IS NULL
       AND ABS(s."remainHours" - enr.sum) > 0.05
     ORDER BY s.name LIMIT 25`)

  // S4 细化：无 lessonId 的非反馈类工资样本
  const s4d = await q('S4d_nonfeedback_no_lesson_sample',
    `SELECT x.id, t.name AS teacher, x.type, x.amount, x."termId", x."lessonDate", x."createdAt", x.description
     FROM "TeacherSalaryTransaction" x
     LEFT JOIN "Teacher" t ON t.id = x."teacherId"
     WHERE x."deletedAt" IS NULL AND x."lessonId" IS NULL AND x.type <> 'FEEDBACK_BONUS'
     ORDER BY x."createdAt" DESC LIMIT 20`)

  // 补充：Student.remainHours 与报名汇总的整体对照（活跃学生）
  const g3d = await q('G3d_overall_compare',
    `SELECT count(*)::int AS active_students,
            count(*) FILTER (WHERE ABS(s."remainHours" - COALESCE(enr.sum,0)) > 0.05)::int AS mismatch,
            count(*) FILTER (WHERE s."remainHours" > 0 AND COALESCE(enr.sum,0) = 0)::int AS student_positive_enrollment_zero
     FROM "Student" s
     LEFT JOIN (SELECT "studentId", SUM("remainHours")::float AS sum FROM "Enrollment"
                WHERE status='ACTIVE' AND "deletedAt" IS NULL GROUP BY "studentId") enr
       ON enr."studentId" = s.id
     WHERE s."deletedAt" IS NULL`)

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

  const p = path.join('D:\\01muzhexuetang\\muzhexuetang\\coding\\_audit20261108', 'e_sample2_results.json')
  fs.writeFileSync(p, JSON.stringify(out, null, 2), 'utf8')
  console.log('S3d:', JSON.stringify(s3d))
  console.log('S3e present-zero count sample rows:', s3e.length)
  console.log('S3f lessons sample rows:', s3f.length)
  console.log('S5c duplicate LESSON_PAY groups:', s5c.length)
  console.log('S5d breakdown:', JSON.stringify(s5d))
  console.log('G3c detail rows:', g3b.length)
  console.log('S4d non-feedback no-lesson:', s4d.length)
  console.log('G3d:', JSON.stringify(g3d))
  console.log('written:', p)
}
main().catch((e) => { console.error('ERR', e); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect() })
