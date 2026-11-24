/* E 分片 · 第三轮细化抽样（只读 SELECT） */
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
  // PRESENT 零扣减按课次类型/审核状态拆分
  const a = await q('P1_present_zero_by_review',
    `SELECT l."intensiveReviewStatus"::text, g."intensiveMode"::text, count(*)::int AS n
     FROM "Attendance" a JOIN "ClassLesson" l ON l.id=a."lessonId"
     LEFT JOIN "ClassGroup" g ON g.id=l."groupId"
     WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL
       AND a.status='PRESENT' AND COALESCE(a."hoursDeducted",0)=0
     GROUP BY 1,2 ORDER BY n DESC`)
  // LEAVE / ABSENT 已扣课时样本
  const b = await q('P2_leave_absent_deducted_sample',
    `SELECT a.status::text, s.name AS student, l."lessonDate", a."hoursDeducted", a."actualMinutes",
            l."intensiveReviewStatus"::text, g."intensiveMode"::text
     FROM "Attendance" a JOIN "ClassLesson" l ON l.id=a."lessonId"
     LEFT JOIN "ClassGroup" g ON g.id=l."groupId"
     LEFT JOIN "Student" s ON s.id=a."studentId"
     WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL
       AND a.status IN ('LEAVE','ABSENT') AND COALESCE(a."hoursDeducted",0)>0
     ORDER BY a.status::text, l."lessonDate" DESC LIMIT 20`)
  // 已提交但缺 hoursDeductedAt 的课次：是否所有考勤行都零扣减
  const c = await q('P3_submitted_no_deducted_at_breakdown',
    `SELECT count(*)::int AS lessons,
            count(*) FILTER (WHERE COALESCE(maxded,0)=0)::int AS all_rows_zero,
            count(*) FILTER (WHERE COALESCE(maxded,0)>0)::int AS some_row_deducted
     FROM (
       SELECT l.id, max(a."hoursDeducted") AS maxded
       FROM "ClassLesson" l
       LEFT JOIN "Attendance" a ON a."lessonId"=l.id AND a."deletedAt" IS NULL
       WHERE l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL AND l."hoursDeductedAt" IS NULL
       GROUP BY l.id
     ) x`)
  // 常规班（非突击）已提交课次中 PRESENT 零扣减数量
  const d = await q('P4_regular_present_zero',
    `SELECT count(*)::int AS regular_present_zero
     FROM "Attendance" a JOIN "ClassLesson" l ON l.id=a."lessonId"
     LEFT JOIN "ClassGroup" g ON g.id=l."groupId"
     WHERE a."deletedAt" IS NULL AND l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL
       AND a.status='PRESENT' AND COALESCE(a."hoursDeducted",0)=0
       AND COALESCE(g."intensiveMode"::text,'') <> 'INTENSIVE'`)
  // 家长端可读的 Student.remainHours 出现位置复核：统计 Student 级余额为正但无活跃报名余额的学生数
  const e = await q('P5_student_positive_enrollment_zero_detail',
    `SELECT s.name AS student, s."remainHours" AS student_remain, s."totalHours",
            count(e.id)::int AS active_enrollments,
            COALESCE(SUM(e."remainHours"),0)::float AS enrollment_sum
     FROM "Student" s
     LEFT JOIN "Enrollment" e ON e."studentId"=s.id AND e.status='ACTIVE' AND e."deletedAt" IS NULL
     WHERE s."deletedAt" IS NULL
     GROUP BY s.id, s.name, s."remainHours", s."totalHours"
     HAVING s."remainHours" > 0.05 AND COALESCE(SUM(e."remainHours"),0) = 0
     ORDER BY s."remainHours" DESC LIMIT 20`)

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
  const p = path.join('D:\\01muzhexuetang\\muzhexuetang\\coding\\_audit20261108', 'e_sample3_results.json')
  fs.writeFileSync(p, JSON.stringify(out, null, 2), 'utf8')
  console.log('P1:', JSON.stringify(a))
  console.log('P2 rows:', b.length)
  console.log('P3:', JSON.stringify(c))
  console.log('P4:', JSON.stringify(d))
  console.log('P5 rows:', e.length)
  console.log('written:', p)
}
main().catch((e) => { console.error('ERR', e); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect() })
