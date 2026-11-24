/* G 分片补充 · 请假/餐食/退班考勤/请假扣课时 只读抽样（仅 SELECT） */
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
  // Q1 已批准请假，对应考勤仍 PRESENT
  const q1 = await q('Q1_approved_leave_present',
    `WITH approved AS (
       SELECT lr.id, lr."studentId", lr."lessonId", lr."leaveDate"::date AS leave_date
       FROM "LeaveRequest" lr
       WHERE lr.status='approved' AND lr."deletedAt" IS NULL
     ),
     matched AS (
       SELECT ap.id AS leave_id, ap."studentId", ap."lessonId", ap.leave_date,
              a.id AS att_id, a.status::text AS att_status, cl."lessonDate"::date AS lesson_date
       FROM approved ap
       LEFT JOIN "Attendance" a
         ON a."studentId"=ap."studentId" AND a."deletedAt" IS NULL
        AND ( (ap."lessonId" IS NOT NULL AND a."lessonId"=ap."lessonId")
           OR (ap."lessonId" IS NULL AND EXISTS (
                 SELECT 1 FROM "ClassLesson" cl2
                 WHERE cl2.id=a."lessonId" AND cl2."lessonDate"::date=ap.leave_date)) )
       LEFT JOIN "ClassLesson" cl ON cl.id=a."lessonId"
     )
     SELECT (SELECT count(*) FROM approved)::int AS approved_total,
            count(*) FILTER (WHERE att_status='PRESENT')::int AS present_att_rows,
            count(*) FILTER (WHERE att_status IS NULL)::int AS no_attendance_row,
            count(DISTINCT leave_id) FILTER (WHERE att_status='PRESENT')::int AS approved_with_present
     FROM matched`)
  await q('Q1_sample',
    `WITH approved AS (
       SELECT lr.id, lr."studentId", lr."lessonId", lr."leaveDate"::date AS leave_date, lr.status
       FROM "LeaveRequest" lr WHERE lr.status='approved' AND lr."deletedAt" IS NULL
     )
     SELECT s.name, cl."lessonDate"::text AS lesson_date, ap.status AS leave_status,
            a.status::text AS att_status,
            CASE WHEN ap."lessonId" IS NOT NULL THEN 'lesson' ELSE 'date' END AS match_by
     FROM approved ap
     JOIN "Attendance" a ON a."studentId"=ap."studentId" AND a."deletedAt" IS NULL
       AND ( (ap."lessonId" IS NOT NULL AND a."lessonId"=ap."lessonId")
          OR (ap."lessonId" IS NULL AND EXISTS (
                SELECT 1 FROM "ClassLesson" cl2 WHERE cl2.id=a."lessonId" AND cl2."lessonDate"::date=ap.leave_date)) )
     JOIN "Student" s ON s.id=ap."studentId"
     LEFT JOIN "ClassLesson" cl ON cl.id=a."lessonId"
     WHERE a.status::text='PRESENT'
     ORDER BY cl."lessonDate" DESC LIMIT 5`)
  out.queries.Q1_summary = { sql: 'derived from Q1_approved_leave_present', rows: [q1[0]] }

  // Q2 考勤 LEAVE 但无请假单（任意状态 / 仅 approved 两口径）
  await q('Q2_leave_without_request',
    `WITH leave_att AS (
       SELECT a.id, a."studentId", a."lessonId"
       FROM "Attendance" a
       WHERE a.status::text='LEAVE' AND a."deletedAt" IS NULL
     ),
     covered_any AS (
       SELECT DISTINCT la.id AS att_id
       FROM leave_att la
       JOIN "LeaveRequest" lr ON lr."studentId"=la."studentId" AND lr."deletedAt" IS NULL
       LEFT JOIN "ClassLesson" cl ON cl.id=la."lessonId"
       WHERE (lr."lessonId" IS NOT NULL AND lr."lessonId"=la."lessonId")
          OR (lr."lessonId" IS NULL AND cl."lessonDate"::date=lr."leaveDate"::date)
     ),
     covered_approved AS (
       SELECT DISTINCT la.id AS att_id
       FROM leave_att la
       JOIN "LeaveRequest" lr ON lr."studentId"=la."studentId" AND lr.status='approved' AND lr."deletedAt" IS NULL
       LEFT JOIN "ClassLesson" cl ON cl.id=la."lessonId"
       WHERE (lr."lessonId" IS NOT NULL AND lr."lessonId"=la."lessonId")
          OR (lr."lessonId" IS NULL AND cl."lessonDate"::date=lr."leaveDate"::date)
     )
     SELECT count(*)::int AS leave_att_rows,
            count(*) FILTER (WHERE ca.att_id IS NULL)::int AS no_request_any,
            count(*) FILTER (WHERE cp.att_id IS NULL)::int AS no_request_approved
     FROM leave_att la
     LEFT JOIN covered_any ca ON ca.att_id=la.id
     LEFT JOIN covered_approved cp ON cp.att_id=la.id`)
  await q('Q2_sample',
    `WITH leave_att AS (
       SELECT a.id, a."studentId", a."lessonId", a."hoursDeducted"
       FROM "Attendance" a WHERE a.status::text='LEAVE' AND a."deletedAt" IS NULL
     ),
     covered_any AS (
       SELECT DISTINCT la.id AS att_id
       FROM leave_att la
       JOIN "LeaveRequest" lr ON lr."studentId"=la."studentId" AND lr."deletedAt" IS NULL
       LEFT JOIN "ClassLesson" cl ON cl.id=la."lessonId"
       WHERE (lr."lessonId" IS NOT NULL AND lr."lessonId"=la."lessonId")
          OR (lr."lessonId" IS NULL AND cl."lessonDate"::date=lr."leaveDate"::date)
     )
     SELECT s.name, cl."lessonDate"::text AS lesson_date, a.status::text AS att_status, a."hoursDeducted"
     FROM leave_att la
     JOIN "Attendance" a ON a.id=la.id
     JOIN "Student" s ON s.id=a."studentId"
     LEFT JOIN "ClassLesson" cl ON cl.id=a."lessonId"
     LEFT JOIN covered_any ca ON ca.att_id=la.id
     WHERE ca.att_id IS NULL
     ORDER BY cl."lessonDate" DESC NULLS LAST LIMIT 5`)

  // Q3 餐食自动行规模
  await q('Q3_meal_overview',
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE source='AUTO')::int AS auto_n,
            count(*) FILTER (WHERE source='MANUAL')::int AS manual_n,
            count(*) FILTER (WHERE eating)::int AS eating_true,
            count(*) FILTER (WHERE NOT eating)::int AS eating_false,
            count(*) FILTER (WHERE "updatedAt" > "createdAt")::int AS ever_updated,
            count(*) FILTER (WHERE source='AUTO' AND "updatedAt" > "createdAt")::int AS auto_resynced,
            count(*) FILTER (WHERE source='MANUAL' AND "updatedAt" > "createdAt")::int AS manual_edited
     FROM "StudentMealAttendance"`)
  await q('Q3_source_eating_breakdown',
    `SELECT source, eating, count(*)::int AS n
     FROM "StudentMealAttendance" GROUP BY source, eating ORDER BY source, eating`)

  // Q4 退班/无报名/课次软删 的考勤仍挂课时
  await q('Q4_withdrawn_deducted',
    `SELECT count(*)::int AS rows_deducted,
            COALESCE(SUM(a."hoursDeducted"),0)::float AS sum_hours,
            count(*) FILTER (WHERE e.id IS NOT NULL AND e.status::text <> 'ACTIVE')::int AS inactive_enrollment,
            count(*) FILTER (WHERE e.id IS NULL)::int AS no_enrollment,
            count(*) FILTER (WHERE cl."deletedAt" IS NOT NULL)::int AS lesson_deleted,
            count(*) FILTER (WHERE a."deletedAt" IS NOT NULL)::int AS att_soft_deleted
     FROM "Attendance" a
     LEFT JOIN "Enrollment" e ON e.id=a."enrollmentId"
     LEFT JOIN "ClassLesson" cl ON cl.id=a."lessonId"
     WHERE a."hoursDeducted" > 0
       AND ( e.id IS NULL OR e.status::text <> 'ACTIVE' OR cl."deletedAt" IS NOT NULL )`)
  await q('Q4_sample',
    `SELECT s.name, cl."lessonDate"::text AS lesson_date, e.status::text AS enr_status,
            a."hoursDeducted", a.status::text AS att_status,
            CASE WHEN e.id IS NULL THEN 'NO_ENROLLMENT' WHEN cl."deletedAt" IS NOT NULL THEN 'LESSON_DELETED' ELSE e.status::text END AS bucket
     FROM "Attendance" a
     LEFT JOIN "Enrollment" e ON e.id=a."enrollmentId"
     LEFT JOIN "ClassLesson" cl ON cl.id=a."lessonId"
     JOIN "Student" s ON s.id=a."studentId"
     WHERE a."deletedAt" IS NULL AND a."hoursDeducted" > 0
       AND ( e.id IS NULL OR e.status::text <> 'ACTIVE' OR cl."deletedAt" IS NOT NULL )
     ORDER BY a."hoursDeducted" DESC LIMIT 5`)

  // Q5 请假扣课时合计
  await q('Q5_leave_deducted_hours',
    `SELECT count(*)::int AS leave_deducted_rows,
            COALESCE(SUM(a."hoursDeducted"),0)::float AS sum_hours,
            COALESCE(AVG(a."hoursDeducted"),0)::float AS avg_hours
     FROM "Attendance" a
     WHERE a.status::text='LEAVE' AND a."deletedAt" IS NULL AND a."hoursDeducted" > 0`)
  await q('Q5_by_value',
    `SELECT a."hoursDeducted"::float AS h, count(*)::int AS n
     FROM "Attendance" a
     WHERE a.status::text='LEAVE' AND a."deletedAt" IS NULL AND a."hoursDeducted" > 0
     GROUP BY a."hoursDeducted" ORDER BY h`)

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
  const p = path.join('D:\\01muzhexuetang\\muzhexuetang\\coding\\_audit20261108', 'e_sample14_results.json')
  fs.writeFileSync(p, JSON.stringify(out, null, 2), 'utf8')
  console.log('Q1:', JSON.stringify(out.queries.Q1_summary.rows[0]))
  console.log('Q2:', JSON.stringify(out.queries.Q2_leave_without_request.rows[0]))
  console.log('Q3:', JSON.stringify(out.queries.Q3_meal_overview.rows[0]))
  console.log('Q4:', JSON.stringify(out.queries.Q4_withdrawn_deducted.rows[0]))
  console.log('Q5:', JSON.stringify(out.queries.Q5_leave_deducted_hours.rows[0]))
  console.log('written:', p)
}
main().catch((e) => { console.error('ERR', e); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect() })
