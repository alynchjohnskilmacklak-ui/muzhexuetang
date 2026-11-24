/* G 补充2 · Q4 拆桶 / Q1 逐单 / Q2 已覆盖4行 只读 SELECT */
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
  // Q4-a 按报名状态 × 课次软删 拆桶
  await q('Q4a_bucket_breakdown',
    `SELECT COALESCE(e.status::text,'NULL') AS enr_status,
            CASE WHEN cl."deletedAt" IS NOT NULL THEN 'lesson_deleted' ELSE 'lesson_active' END AS lesson_bucket,
            count(*)::int AS rows_n,
            COALESCE(SUM(a."hoursDeducted"),0)::float AS sum_hours
     FROM "Attendance" a
     LEFT JOIN "Enrollment" e ON e.id=a."enrollmentId"
     LEFT JOIN "ClassLesson" cl ON cl.id=a."lessonId"
     WHERE a."deletedAt" IS NULL AND a."hoursDeducted" > 0
       AND ( e.id IS NULL OR e.status::text <> 'ACTIVE' OR cl."deletedAt" IS NOT NULL )
     GROUP BY 1,2 ORDER BY 1,2`)

  // Q4-b WITHDRAWN 行：考勤课次日期 vs 报名 deletedAt（退班时间），区分历史档案 / 退班后扣减
  await q('Q4b_withdrawn_timing',
    `SELECT
       count(*)::int AS withdrawn_rows,
       count(*) FILTER (WHERE e."deletedAt" IS NULL)::int AS withdrawn_no_deletedAt,
       count(*) FILTER (WHERE cl."lessonDate"::date <= e."deletedAt"::date)::int AS lesson_before_delete,
       count(*) FILTER (WHERE e."deletedAt" IS NOT NULL AND cl."lessonDate"::date > e."deletedAt"::date)::int AS lesson_after_delete,
       COALESCE(SUM(a."hoursDeducted"),0)::float AS sum_hours
     FROM "Attendance" a
     JOIN "Enrollment" e ON e.id=a."enrollmentId"
     LEFT JOIN "ClassLesson" cl ON cl.id=a."lessonId"
     WHERE a."deletedAt" IS NULL AND a."hoursDeducted" > 0 AND e.status::text='WITHDRAWN'`)

  // Q4-c COMPLETED 行课时合计与样本
  await q('Q4c_completed_sample',
    `SELECT s.name, cl."lessonDate"::text AS lesson_date, e.status::text AS enr_status,
            a."hoursDeducted", a.status::text AS att_status
     FROM "Attendance" a
     JOIN "Enrollment" e ON e.id=a."enrollmentId"
     LEFT JOIN "ClassLesson" cl ON cl.id=a."lessonId"
     JOIN "Student" s ON s.id=a."studentId"
     WHERE a."deletedAt" IS NULL AND a."hoursDeducted" > 0 AND e.status::text='COMPLETED'
     ORDER BY cl."lessonDate" DESC LIMIT 5`)

  // Q1-b 逐请假单：学生/日期/lessonId/匹配考勤状态分布
  await q('Q1b_per_request',
    `SELECT s.name, lr."leaveDate"::text AS leave_date,
            CASE WHEN lr."lessonId" IS NOT NULL THEN 'lesson' ELSE 'date' END AS match_by,
            lr.status::text AS leave_status,
            count(a.id)::int AS matched_att,
            count(*) FILTER (WHERE a.status::text='PRESENT')::int AS present_n,
            count(*) FILTER (WHERE a.status::text='LEAVE')::int AS leave_n,
            count(*) FILTER (WHERE a.status::text='ABSENT')::int AS absent_n
     FROM "LeaveRequest" lr
     JOIN "Student" s ON s.id=lr."studentId"
     LEFT JOIN "Attendance" a ON a."studentId"=lr."studentId" AND a."deletedAt" IS NULL
       AND ( (lr."lessonId" IS NOT NULL AND a."lessonId"=lr."lessonId")
          OR (lr."lessonId" IS NULL AND EXISTS (
                SELECT 1 FROM "ClassLesson" cl2 WHERE cl2.id=a."lessonId" AND cl2."lessonDate"::date=lr."leaveDate"::date)) )
     WHERE lr.status='approved' AND lr."deletedAt" IS NULL
     GROUP BY s.name, lr."leaveDate", match_by, lr.status`)

  // Q2-b 被请假单覆盖的 4 行 LEAVE：单据状态
  await q('Q2b_covered_leave_rows',
    `SELECT s.name, cl."lessonDate"::text AS lesson_date, a.status::text AS att_status,
            a."hoursDeducted", lr.status::text AS request_status, lr."lessonId" IS NOT NULL AS linked_lesson
     FROM "Attendance" a
     JOIN "Student" s ON s.id=a."studentId"
     JOIN "LeaveRequest" lr ON lr."studentId"=a."studentId" AND lr."deletedAt" IS NULL
     LEFT JOIN "ClassLesson" cl ON cl.id=a."lessonId"
     WHERE a.status::text='LEAVE' AND a."deletedAt" IS NULL
       AND ( (lr."lessonId" IS NOT NULL AND lr."lessonId"=a."lessonId")
          OR (lr."lessonId" IS NULL AND cl."lessonDate"::date=lr."leaveDate"::date) )
     ORDER BY cl."lessonDate" DESC`)

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
  const p = path.join('D:\\01muzhexuetang\\muzhexuetang\\coding\\_audit20261108', 'e_sample15_results.json')
  fs.writeFileSync(p, JSON.stringify(out, null, 2), 'utf8')
  console.log('Q4a:', JSON.stringify(out.queries.Q4a_bucket_breakdown.rows))
  console.log('Q4b:', JSON.stringify(out.queries.Q4b_withdrawn_timing.rows[0]))
  console.log('Q1b:', JSON.stringify(out.queries.Q1b_per_request.rows))
  console.log('Q2b:', JSON.stringify(out.queries.Q2b_covered_leave_rows.rows))
  console.log('written:', p)
}
main().catch((e) => { console.error('ERR', e); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect() })
