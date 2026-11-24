/*
 * E 分片 · 只读数据库抽样脚本
 * 红线：仅使用 $queryRaw 的 SELECT；不执行任何写操作 / DDL / migrate。
 * 运行：在仓库根目录 D:\01muzhexuetang\muzhexuetang\coding\edu-manage 下执行
 *   node ..\_audit20261108\e_sample.js
 */
const path = require('path')
const fs = require('fs')

const repoRoot = 'D:\\01muzhexuetang\\muzhexuetang\\coding\\edu-manage'
process.chdir(repoRoot)

require(path.join(repoRoot, 'node_modules', 'dotenv')).config({ path: path.join(repoRoot, '.env') })
const { PrismaClient } = require(path.join(repoRoot, 'node_modules', '@prisma/client'))
const prisma = new PrismaClient()

const mask = (name) => {
  if (name == null) return null
  const s = String(name).trim()
  if (!s) return null
  return s[0] + '**'
}
const iso = (d) => (d == null ? null : new Date(d).toISOString())
const f = (n) => (n == null ? null : Number(n))

const out = { generatedAt: new Date().toISOString(), queries: {}, findings: {} }

async function q(label, sql, params = []) {
  const rows = await prisma.$queryRawUnsafe(sql, ...params)
  out.queries[label] = { sql, rows }
  return rows
}

async function main() {
  // ---------- 0. 总览 ----------
  const attTotal = await q('0a_attendance_total',
    `SELECT count(*)::int AS n FROM "Attendance" WHERE "deletedAt" IS NULL`)
  const attStatus = await q('0b_attendance_status_dist',
    `SELECT status, count(*)::int AS n FROM "Attendance" WHERE "deletedAt" IS NULL GROUP BY status ORDER BY n DESC`)
  const attRoll = await q('0c_rollcall_dist',
    `SELECT "rollCallStatus", count(*)::int AS n FROM "Attendance" WHERE "deletedAt" IS NULL GROUP BY "rollCallStatus" ORDER BY n DESC NULLS FIRST`)
  const lessonTotal = await q('0d_lesson_total',
    `SELECT count(*)::int AS n FROM "ClassLesson" WHERE "deletedAt" IS NULL`)
  const lessonSubmitted = await q('0e_lesson_submitted',
    `SELECT count(*)::int AS n FROM "ClassLesson" WHERE "deletedAt" IS NULL AND "attendanceSubmittedAt" IS NOT NULL`)

  // ---------- S1: status='LATE' 且 hoursDeducted > 0 ----------
  const s1 = await q('S1_late_with_deduction',
    `SELECT a.id, s.name AS student, t.name AS teacher, l."lessonDate",
            a.status, a."rollCallStatus", a."hoursDeducted",
            a."rollCallMarkedAt", l."attendanceSubmittedAt", l."hoursDeductedAt"
     FROM "Attendance" a
     LEFT JOIN "Student" s ON s.id = a."studentId"
     LEFT JOIN "ClassLesson" l ON l.id = a."lessonId"
     LEFT JOIN "Teacher" t ON t.id = l."teacherId"
     WHERE a."deletedAt" IS NULL AND a.status::text = 'LATE' AND COALESCE(a."hoursDeducted",0) > 0
     ORDER BY l."lessonDate" DESC LIMIT 20`)
  // 补充：有点名痕迹但考勤未提交，却已写课时扣减（点名阶段被扣课时）
  const s1b = await q('S1b_rollmarked_before_submit_with_deduction',
    `SELECT a.id, s.name AS student, l."lessonDate", a.status, a."rollCallStatus",
            a."hoursDeducted", a."rollCallMarkedAt", l."attendanceSubmittedAt"
     FROM "Attendance" a
     LEFT JOIN "Student" s ON s.id = a."studentId"
     LEFT JOIN "ClassLesson" l ON l.id = a."lessonId"
     WHERE a."deletedAt" IS NULL AND a."rollCallMarkedAt" IS NOT NULL
       AND l."attendanceSubmittedAt" IS NULL AND COALESCE(a."hoursDeducted",0) > 0
     ORDER BY l."lessonDate" DESC LIMIT 20`)

  // ---------- S2: status 与 rollCallStatus 互相矛盾 ----------
  const s2a = await q('S2a_absent_but_rollpresent',
    `SELECT a.id, s.name AS student, l."lessonDate", a.status, a."rollCallStatus"
     FROM "Attendance" a
     LEFT JOIN "Student" s ON s.id = a."studentId"
     LEFT JOIN "ClassLesson" l ON l.id = a."lessonId"
     WHERE a."deletedAt" IS NULL AND a.status = 'ABSENT' AND a."rollCallStatus" IN ('PRESENT','LATE')
     ORDER BY l."lessonDate" DESC LIMIT 20`)
  const s2b = await q('S2b_present_but_rollabsent',
    `SELECT a.id, s.name AS student, l."lessonDate", a.status, a."rollCallStatus"
     FROM "Attendance" a
     LEFT JOIN "Student" s ON s.id = a."studentId"
     LEFT JOIN "ClassLesson" l ON l.id = a."lessonId"
     WHERE a."deletedAt" IS NULL AND a.status = 'PRESENT' AND a."rollCallStatus" = 'ABSENT'
     ORDER BY l."lessonDate" DESC LIMIT 20`)
  const s2c = await q('S2c_leave_but_rollmarked',
    `SELECT a.id, s.name AS student, l."lessonDate", a.status, a."rollCallStatus"
     FROM "Attendance" a
     LEFT JOIN "Student" s ON s.id = a."studentId"
     LEFT JOIN "ClassLesson" l ON l.id = a."lessonId"
     WHERE a."deletedAt" IS NULL AND a.status = 'LEAVE' AND a."rollCallStatus" IN ('PRESENT','LATE','ABSENT')
     ORDER BY l."lessonDate" DESC LIMIT 20`)
  const s2d = await q('S2d_status_late_rows',
    `SELECT count(*)::int AS n FROM "Attendance" WHERE "deletedAt" IS NULL AND status::text = 'LATE'`)

  // ---------- S3: 已提交考勤的课次下漏扣课时 ----------
  const s3a = await q('S3a_submitted_rows_zero_deduction',
    `SELECT count(*)::int AS total_rows,
            count(*) FILTER (WHERE COALESCE(a."hoursDeducted",0) = 0)::int AS zero_or_null_deduction,
            count(*) FILTER (WHERE a."hoursDeducted" IS NULL)::int AS null_deduction
     FROM "Attendance" a
     JOIN "ClassLesson" l ON l.id = a."lessonId"
     WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL`)
  const s3b = await q('S3b_submitted_lesson_without_deducted_at',
    `SELECT count(*)::int AS submitted_lessons,
            count(*) FILTER (WHERE l."hoursDeductedAt" IS NULL)::int AS missing_deducted_at
     FROM "ClassLesson" l
     WHERE l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL`)
  const s3c = await q('S3c_sample_zero_deduction_rows',
    `SELECT a.id, s.name AS student, l."lessonDate", a.status, a."hoursDeducted",
            l."attendanceSubmittedAt", l."hoursDeductedAt"
     FROM "Attendance" a
     JOIN "ClassLesson" l ON l.id = a."lessonId"
     LEFT JOIN "Student" s ON s.id = a."studentId"
     WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL
       AND COALESCE(a."hoursDeducted",0) = 0
     ORDER BY l."lessonDate" DESC LIMIT 20`)

  // ---------- S4: 工资记录 lessonId / termId 为空 ----------
  const s4 = await q('S4_salary_null_refs',
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE "lessonId" IS NULL)::int AS lesson_id_null,
            count(*) FILTER (WHERE "termId" IS NULL)::int AS term_id_null,
            count(*) FILTER (WHERE "lessonId" IS NULL AND "termId" IS NULL)::int AS both_null
     FROM "TeacherSalaryTransaction" WHERE "deletedAt" IS NULL`)
  const s4b = await q('S4b_null_refs_by_type',
    `SELECT type, count(*)::int AS n,
            count(*) FILTER (WHERE "lessonId" IS NULL)::int AS lesson_null,
            count(*) FILTER (WHERE "termId" IS NULL)::int AS term_null
     FROM "TeacherSalaryTransaction" WHERE "deletedAt" IS NULL
     GROUP BY type ORDER BY n DESC`)
  const s4c = await q('S4c_sample_null_term',
    `SELECT x.id, t.name AS teacher, type, amount, "lessonId", "termId", "lessonDate", x."createdAt"
     FROM "TeacherSalaryTransaction" x
     LEFT JOIN "Teacher" t ON t.id = x."teacherId"
     WHERE x."deletedAt" IS NULL AND x."termId" IS NULL
     ORDER BY x."createdAt" DESC LIMIT 15`)

  // ---------- S5: 同一 lesson+teacher 重复入账 ----------
  const s5 = await q('S5_duplicate_lesson_teacher',
    `SELECT "lessonId", "teacherId", count(*)::int AS n,
            array_agg(type) AS types, array_agg(amount) AS amounts
     FROM "TeacherSalaryTransaction"
     WHERE "deletedAt" IS NULL AND "lessonId" IS NOT NULL
     GROUP BY "lessonId", "teacherId"
     HAVING count(*) > 1
     ORDER BY n DESC LIMIT 20`)
  const s5b = await q('S5b_duplicate_paykey',
    `SELECT "lessonPayKey", count(*)::int AS n
     FROM "TeacherSalaryTransaction"
     WHERE "deletedAt" IS NULL AND "lessonPayKey" IS NOT NULL
     GROUP BY "lessonPayKey" HAVING count(*) > 1 LIMIT 20`)

  // ---------- S6: 孤儿考勤行 / lessonId+studentId 重复 ----------
  const s6a = await q('S6a_orphan_attendance',
    `SELECT count(*)::int AS n
     FROM "Attendance" a
     WHERE a."deletedAt" IS NULL AND a."lessonId" IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM "ClassLesson" l WHERE l.id = a."lessonId")`)
  const s6b = await q('S6b_duplicate_lesson_student',
    `SELECT "lessonId", "studentId", count(*)::int AS n
     FROM "Attendance"
     WHERE "deletedAt" IS NULL AND "lessonId" IS NOT NULL
     GROUP BY "lessonId", "studentId"
     HAVING count(*) > 1 LIMIT 20`)
  const s6c = await q('S6c_sample_orphan',
    `SELECT a.id, s.name AS student, a."lessonId", a.status, a."createdAt"
     FROM "Attendance" a LEFT JOIN "Student" s ON s.id = a."studentId"
     WHERE a."deletedAt" IS NULL AND a."lessonId" IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM "ClassLesson" l WHERE l.id = a."lessonId")
     LIMIT 15`)

  // ---------- S7: 有点名痕迹但考勤未提交 ----------
  const s7 = await q('S7_rollmarked_not_submitted',
    `SELECT count(*) FILTER (WHERE a."rollCallMarkedAt" IS NOT NULL)::int AS rollmarked,
            count(*) FILTER (WHERE a."rollCallMarkedAt" IS NOT NULL AND l."attendanceSubmittedAt" IS NULL)::int AS rollmarked_not_submitted
     FROM "Attendance" a
     LEFT JOIN "ClassLesson" l ON l.id = a."lessonId"
     WHERE a."deletedAt" IS NULL`)
  const s7b = await q('S7b_sample_dangling',
    `SELECT a.id, s.name AS student, l."lessonDate", a.status, a."rollCallStatus",
            a."rollCallMarkedAt", l."attendanceSubmittedAt"
     FROM "Attendance" a
     LEFT JOIN "Student" s ON s.id = a."studentId"
     LEFT JOIN "ClassLesson" l ON l.id = a."lessonId"
     WHERE a."deletedAt" IS NULL AND a."rollCallMarkedAt" IS NOT NULL
       AND l."attendanceSubmittedAt" IS NULL
     ORDER BY a."rollCallMarkedAt" DESC LIMIT 20`)

  // ---------- 补充 G3: Student.remainHours vs Enrollment.remainHours 汇总 ----------
  const g3a = await q('G3a_student_vs_enrollment_remain',
    `SELECT s.id, s.name, s."remainHours" AS student_remain,
            COALESCE(SUM(e."remainHours") FILTER (WHERE e.status='ACTIVE' AND e."deletedAt" IS NULL),0)::float AS enrollment_sum,
            count(e.id)::int AS active_enrollments
     FROM "Student" s
     LEFT JOIN "Enrollment" e ON e."studentId" = s.id
     WHERE s."deletedAt" IS NULL
     GROUP BY s.id, s.name, s."remainHours"
     HAVING ABS(s."remainHours" - COALESCE(SUM(e."remainHours") FILTER (WHERE e.status='ACTIVE' AND e."deletedAt" IS NULL),0)) > 0.05
     ORDER BY ABS(s."remainHours" - COALESCE(SUM(e."remainHours") FILTER (WHERE e.status='ACTIVE' AND e."deletedAt" IS NULL),0)) DESC LIMIT 20`)
  const g3b = await q('G3b_enrollment_internal_mismatch',
    `SELECT count(*)::int AS total_active,
            count(*) FILTER (WHERE ABS(e."remainHours" - (e."totalHours" - e."usedHours")) > 0.05)::int AS mismatch
     FROM "Enrollment" e WHERE e.status='ACTIVE' AND e."deletedAt" IS NULL`)

  // ---------- 脱敏与序列化 ----------
  const sanitizeRow = (row) => {
    const r = {}
    for (const [k, v] of Object.entries(row)) {
      if (['student', 'teacher'].includes(k)) r[k] = mask(v)
      else if (v instanceof Date) r[k] = iso(v)
      else if (typeof v === 'number') r[k] = f(v)
      else r[k] = v == null ? null : (Array.isArray(v) ? v.map((x) => (x instanceof Date ? iso(x) : x)) : v)
    }
    return r
  }
  for (const [label, item] of Object.entries(out.queries)) {
    item.rows = item.rows.map(sanitizeRow)
  }

  const resultPath = path.join('D:\\01muzhexuetang\\muzhexuetang\\coding\\_audit20261108', 'e_sample_results.json')
  fs.writeFileSync(resultPath, JSON.stringify(out, null, 2), 'utf8')

  // 控制台摘要
  const brief = (rows) => (Array.isArray(rows) ? rows.length : rows)
  console.log('=== 总览 ===')
  console.log('考勤行(未删):', attTotal[0].n, '| 课次(未删):', lessonTotal[0].n, '| 已提交课次:', lessonSubmitted[0].n)
  console.log('status 分布:', JSON.stringify(attStatus))
  console.log('rollCallStatus 分布:', JSON.stringify(attRoll))
  console.log('\n=== S1 迟到已扣课时:', s1.length, '| 点名后未提交却已扣:', s1b.length)
  console.log('=== S2 缺勤但点名到课:', s2a.length, '| 到课但点名缺勤:', s2b.length, '| 请假但被点名:', s2c.length, '| status=LATE 行数:', s2d[0].n)
  console.log('=== S3 已提交行:', s3a[0].total_rows, '| 零/空扣减:', s3a[0].zero_or_null_deduction, '| 空扣减:', s3a[0].null_deduction)
  console.log('=== S3b 已提交课次:', s3b[0].submitted_lessons, '| 缺 hoursDeductedAt:', s3b[0].missing_deducted_at)
  console.log('=== S4 工资总额:', s4[0].total, '| lessonId空:', s4[0].lesson_id_null, '| termId空:', s4[0].term_id_null, '| 双空:', s4[0].both_null)
  console.log('=== S4b 按类型:', JSON.stringify(s4b))
  console.log('=== S5 同课同师重复:', s5.length, '| payKey 重复:', s5b.length)
  console.log('=== S6 孤儿考勤:', s6a[0].n, '| 同课同人重复:', s6b.length)
  console.log('=== S7 有点名:', s7[0].rollmarked, '| 点名未提交:', s7[0].rollmarked_not_submitted)
  console.log('=== G3a 学生级/报名级余额不一致:', g3a.length, '| G3b 报名内部 remain=total-used 不一致:', g3b[0].mismatch, '/', g3b[0].total_active)
  console.log('\n结果已写入:', resultPath)
}

main()
  .catch((e) => { console.error('SAMPLING ERROR', e); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect() })
