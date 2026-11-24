// P4 只读审计脚本：仅 SELECT，不写库、不 migrate、不碰 dev 端口。
// 运行：在 edu-manage 目录下执行 npx tsx ../_audit20261109/P4-query.ts
import { createRequire } from 'module'
import * as fs from 'fs'
import * as path from 'path'

const require = createRequire('D:/01muzhexuetang/muzhexuetang/coding/edu-manage/')
const { PrismaClient } = require('@prisma/client')

const envPath = path.join(__dirname, '..', 'edu-manage', '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
  }
}

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } })

async function main() {
  const out: Record<string, unknown> = {}

  // Q1 双口径余额：Student 快照 vs Enrollment 报名级（136/37 基线复核）
  out.q1a_studentSnapshot = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS students,
      COUNT(*) FILTER (WHERE "remainHours" > 0)::int AS remainPositive,
      COUNT(*) FILTER (WHERE "remainHours" = 0)::int AS remainZero,
      COALESCE(SUM("remainHours"),0)::float AS sumRemain,
      COALESCE(SUM("totalHours"),0)::float AS sumTotal
    FROM "Student" WHERE "deletedAt" IS NULL`
  out.q1b_enrollmentActive = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS enrollments,
      COUNT(*) FILTER (WHERE "remainHours" > 0)::int AS remainPositive,
      COUNT(*) FILTER (WHERE "remainHours" = 0)::int AS remainZero,
      COALESCE(SUM("remainHours"),0)::float AS sumRemain,
      COALESCE(SUM("totalHours"),0)::float AS sumTotal,
      COALESCE(SUM("usedHours"),0)::float AS sumUsed
    FROM "Enrollment" WHERE "status"='ACTIVE' AND "deletedAt" IS NULL`
  out.q1c_studentLevelZeroWithActiveEnroll = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT s."id")::int AS cnt
    FROM "Student" s
    JOIN "Enrollment" e ON e."studentId" = s."id"
    WHERE s."deletedAt" IS NULL AND s."remainHours" = 0
      AND e."status"='ACTIVE' AND e."deletedAt" IS NULL`
  out.q1d_snapshotVsEnrollmentMismatch = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int AS activeEnrollments,
      COUNT(*) FILTER (WHERE e."remainHours" <> s."remainHours")::int AS rowMismatch,
      COUNT(*) FILTER (WHERE e."remainHours" = 0 AND s."remainHours" > 0)::int AS snapshotOnlyPositive
    FROM "Enrollment" e
    JOIN "Student" s ON s."id" = e."studentId"
    WHERE e."status"='ACTIVE' AND e."deletedAt" IS NULL AND s."deletedAt" IS NULL`
  // 按学生汇总报名级余额 vs 快照余额，差异学生数
  out.q1e_perStudentMismatch = await prisma.$queryRaw`
    WITH enr AS (
      SELECT "studentId", SUM("remainHours")::float AS enrremain, SUM("totalHours")::float AS enrtotal
      FROM "Enrollment" WHERE "status"='ACTIVE' AND "deletedAt" IS NULL
      GROUP BY "studentId"
    )
    SELECT COUNT(*)::int AS studentsWithActiveEnr,
      COUNT(*) FILTER (WHERE s."remainHours" <> COALESCE(enr.enrremain,0))::int AS balanceMismatch,
      COUNT(*) FILTER (WHERE s."remainHours" > COALESCE(enr.enrremain,0))::int AS snapshotHigher,
      COUNT(*) FILTER (WHERE s."remainHours" < COALESCE(enr.enrremain,0))::int AS enrollmentHigher
    FROM "Student" s
    LEFT JOIN enr ON enr."studentId" = s."id"
    WHERE s."deletedAt" IS NULL`

  // Q2 内容表覆盖（家长档案各读点对应表行数）
  out.q2_classroomFeedback = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status='PUBLISHED')::int AS published,
      COUNT(*) FILTER (WHERE status='PUBLISHED' AND "deletedAt" IS NULL)::int AS publishedLive,
      COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL)::int AS deleted
    FROM "ClassroomFeedback"`
  out.q2_weakness = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total, COUNT(DISTINCT "studentId")::int AS students FROM "WeaknessRecord"`
  out.q2_mastery = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total, COUNT(DISTINCT "studentId")::int AS students FROM "MasteryRecord"`
  out.q2_performancePost = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE "deletedAt" IS NULL)::int AS live,
      COUNT(*) FILTER (WHERE "deletedAt" IS NULL AND visibility IN ('PARENT_ONLY','CLASS_PUBLIC'))::int AS parentVisible
    FROM "PerformancePost"`
  out.q2_examPaper = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status='PUBLISHED')::int AS published,
      COUNT(*) FILTER (WHERE status='PUBLISHED' AND "deletedAt" IS NULL)::int AS publishedLive,
      COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL)::int AS deleted
    FROM "ExamPaper"`
  out.q2_gradeRecord = await prisma.$queryRaw`SELECT COUNT(*)::int AS total, COUNT(DISTINCT "studentId")::int AS students FROM "GradeRecord"`
  out.q2_stageSummary = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='PUBLISHED')::int AS published FROM "StageSummary"`
  out.q2_badge = await prisma.$queryRaw`SELECT COUNT(*)::int AS total FROM "AchievementBadge"`
  out.q2_paperQuestionMastery = await prisma.$queryRaw`
    SELECT mastery, COUNT(*)::int AS cnt FROM "PaperQuestion" GROUP BY mastery ORDER BY cnt DESC`

  // Q3 家长-孩子绑定关系
  out.q3_bindRows = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int AS students,
      COUNT(*) FILTER (WHERE "parentUserId" IS NOT NULL)::int AS byParentUserId,
      COUNT(*) FILTER (WHERE "parentId" IS NOT NULL)::int AS byParentId,
      COUNT(*) FILTER (WHERE "parentUserId" IS NOT NULL AND "parentId" IS NOT NULL)::int AS bothSet,
      COUNT(*) FILTER (WHERE "parentUserId" IS NULL AND "parentId" IS NULL)::int AS bothNull,
      COUNT(*) FILTER (WHERE "status" <> 'INACTIVE' AND "deletedAt" IS NULL)::int AS activeStudents
    FROM "Student"`
  out.q3_bindFieldConsistency = await prisma.$queryRaw`
    SELECT
      COUNT(*) FILTER (WHERE "parentUserId" IS NOT NULL AND "parentId" IS NOT NULL AND "parentUserId" <> "parentId")::int AS bothSetDiffer,
      COUNT(*) FILTER (WHERE "parentUserId" IS NOT NULL AND "parentId" IS NOT NULL AND "parentUserId" = "parentId")::int AS bothSetEqual,
      COUNT(*) FILTER (WHERE "parentUserId" IS NOT NULL AND "parentId" IS NULL)::int AS userIdOnly,
      COUNT(*) FILTER (WHERE "parentUserId" IS NULL AND "parentId" IS NOT NULL)::int AS legacyIdOnly
    FROM "Student" WHERE "deletedAt" IS NULL`
  out.q3_parentUserIdOrphan = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS cnt FROM "Student" s
    LEFT JOIN "User" u ON u."id" = s."parentUserId"
    WHERE s."deletedAt" IS NULL AND s."parentUserId" IS NOT NULL AND u."id" IS NULL`
  out.q3_parentIdOrphan = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS cnt FROM "Student" s
    LEFT JOIN "User" u ON u."id" = s."parentId"
    WHERE s."deletedAt" IS NULL AND s."parentId" IS NOT NULL AND u."id" IS NULL`

  // Q3b 通知脱节复核（基线 56）：ACTIVE 通知接收人与当前学生归属不一致
  out.q3b_notificationMismatch = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS cnt
    FROM "Notification" n
    JOIN "Student" s ON s."id" = n."studentId"
    WHERE n.status='ACTIVE' AND n."deletedAt" IS NULL AND n."studentId" IS NOT NULL
      AND s."deletedAt" IS NULL
      AND COALESCE(s."parentUserId", s."parentId") IS NOT NULL
      AND n."userId" <> COALESCE(s."parentUserId", s."parentId")`
  out.q3b_notificationMismatchByType = await prisma.$queryRaw`
    SELECT COALESCE(n."relatedType", n.type)::text AS rtype, COUNT(*)::int AS cnt
    FROM "Notification" n
    JOIN "Student" s ON s."id" = n."studentId"
    WHERE n.status='ACTIVE' AND n."deletedAt" IS NULL AND n."studentId" IS NOT NULL
      AND s."deletedAt" IS NULL
      AND COALESCE(s."parentUserId", s."parentId") IS NOT NULL
      AND n."userId" <> COALESCE(s."parentUserId", s."parentId")
    GROUP BY rtype ORDER BY cnt DESC`
  out.q3b_notificationNullStudent = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS cnt, COUNT(*) FILTER (WHERE read=false)::int AS unread
    FROM "Notification" WHERE status='ACTIVE' AND "deletedAt" IS NULL AND "studentId" IS NULL`
  out.q3b_notificationTotalActive = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE "studentId" IS NOT NULL)::int AS withStudent,
      COUNT(*) FILTER (WHERE read=false)::int AS unread
    FROM "Notification" WHERE status='ACTIVE' AND "deletedAt" IS NULL`
  // 脱节通知里，接收人账号是否已不存在
  out.q3b_mismatchReceiverOrphan = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS cnt
    FROM "Notification" n
    JOIN "Student" s ON s."id" = n."studentId"
    LEFT JOIN "User" u ON u."id" = n."userId"
    WHERE n.status='ACTIVE' AND n."deletedAt" IS NULL AND n."studentId" IS NOT NULL
      AND s."deletedAt" IS NULL AND u."id" IS NULL`

  // Q4 教师名册（家长教师列表口径：全部非 RESIGNED）
  out.q4_teachers = await prisma.$queryRaw`
    SELECT status, COUNT(*)::int AS cnt,
      COUNT(*) FILTER (WHERE phone IS NOT NULL AND phone <> '')::int AS withPhone
    FROM "Teacher" GROUP BY status ORDER BY cnt DESC`

  // Q5 反馈可见性：已发布反馈覆盖学员数 / 家长可解读的学员数
  out.q5_feedbackCoverage = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS feedbacks,
      COUNT(DISTINCT s."id")::int AS students
    FROM "ClassroomFeedback" f
    CROSS JOIN LATERAL unnest(f."studentIds") AS sid(sid)
    JOIN "Student" s ON s."id" = sid
    WHERE f.status='PUBLISHED' AND f."deletedAt" IS NULL`
  out.q5_feedbackStudentIdEmpty = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS cnt FROM "ClassroomFeedback"
    WHERE status='PUBLISHED' AND "deletedAt" IS NULL AND cardinality("studentIds") = 0`

  // Q6 家长账号（role=parent）与绑定学员数
  out.q6_parentAccounts = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS parents,
      COUNT(*) FILTER (WHERE "qywxExternalUserId" IS NOT NULL)::int AS boundQywx,
      COUNT(*) FILTER (WHERE "wxpusherUid" IS NOT NULL)::int AS boundWxpusher
    FROM "User" WHERE role='parent' AND status='active'`

  console.log(JSON.stringify(out, null, 2))
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

