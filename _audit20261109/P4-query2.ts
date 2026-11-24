// P4 第二轮只读复核：仅 SELECT
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

  // A. 报名级按学生汇总（对齐 136/37 基线口径）
  out.a_enrollmentByStudent = await prisma.$queryRaw`
    WITH enr AS (
      SELECT "studentId", SUM("remainHours")::float AS enrremain, SUM("totalHours")::float AS enrtotal
      FROM "Enrollment" WHERE "status"='ACTIVE' AND "deletedAt" IS NULL
      GROUP BY "studentId"
    )
    SELECT
      COUNT(*)::int AS studentsWithActiveEnr,
      COUNT(*) FILTER (WHERE COALESCE(enr.enrremain,0) > 0)::int AS enrPositive,
      COUNT(*) FILTER (WHERE COALESCE(enr.enrremain,0) = 0)::int AS enrZero,
      COUNT(*) FILTER (WHERE s."remainHours" > 0)::int AS snapshotPositive,
      COUNT(*) FILTER (WHERE s."remainHours" = 0)::int AS snapshotZero
    FROM "Student" s
    LEFT JOIN enr ON enr."studentId" = s."id"
    WHERE s."deletedAt" IS NULL`
  out.a_snapshotPositiveButEnrZero = await prisma.$queryRaw`
    WITH enr AS (
      SELECT "studentId", SUM("remainHours")::float AS enrremain
      FROM "Enrollment" WHERE "status"='ACTIVE' AND "deletedAt" IS NULL
      GROUP BY "studentId"
    )
    SELECT COUNT(*)::int AS cnt
    FROM "Student" s LEFT JOIN enr ON enr."studentId" = s."id"
    WHERE s."deletedAt" IS NULL AND s."remainHours" > 0 AND COALESCE(enr.enrremain,0) = 0`

  // B. 试卷与题目
  out.b_papers = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS papers,
      COUNT(*) FILTER (WHERE status='PUBLISHED' AND "deletedAt" IS NULL)::int AS publishedLive,
      COUNT(*) FILTER (WHERE "isReadByParent" = true)::int AS readByParent
    FROM "ExamPaper"`
  out.b_paperQuestions = await prisma.$queryRaw`SELECT COUNT(*)::int AS cnt FROM "PaperQuestion"`
  out.b_papersWithQuestions = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS cnt FROM "ExamPaper" p
    WHERE EXISTS (SELECT 1 FROM "PaperQuestion" q WHERE q."paperId" = p."id")`

  // C. 回流表行数
  out.c_readReceipts = await prisma.$queryRaw`SELECT COUNT(*)::int AS cnt FROM "FeedbackParentReadReceipt"`
  out.c_evaluations = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS cnt,
      COUNT(*) FILTER (WHERE satisfied = true)::int AS satisfied,
      COUNT(*) FILTER (WHERE satisfied = false)::int AS unsatisfied,
      COUNT(*) FILTER (WHERE "reviewStatus" = 'PENDING')::int AS pending
    FROM "ParentClassroomFeedbackEvaluation"`
  out.c_checkins = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS cnt,
      COUNT(*) FILTER (WHERE status='DONE')::int AS done,
      COUNT(*) FILTER (WHERE status='NEED_HELP')::int AS needHelp
    FROM "ClassroomFeedbackHomeworkCheckin"`
  out.c_postReactions = await prisma.$queryRaw`SELECT COUNT(*)::int AS cnt FROM "PostReaction"`
  out.c_paperReactions = await prisma.$queryRaw`SELECT COUNT(*)::int AS cnt FROM "PaperReaction"`

  // D. 56 条脱节通知：按类型细分（含 relatedType vs type），是否带 studentId
  out.d_mismatchDetail = await prisma.$queryRaw`
    SELECT n.type::text AS ntype, COALESCE(n."relatedType",'NULL')::text AS rtype,
      COUNT(*)::int AS cnt, COUNT(*) FILTER (WHERE n.read=false)::int AS unread
    FROM "Notification" n
    JOIN "Student" s ON s."id" = n."studentId"
    WHERE n.status='ACTIVE' AND n."deletedAt" IS NULL AND n."studentId" IS NOT NULL
      AND s."deletedAt" IS NULL
      AND COALESCE(s."parentUserId", s."parentId") IS NOT NULL
      AND n."userId" <> COALESCE(s."parentUserId", s."parentId")
    GROUP BY n.type, rtype ORDER BY cnt DESC`
  // 脱节通知接收人是否仍是家长角色账号
  out.d_mismatchReceiverRole = await prisma.$queryRaw`
    SELECT u.role::text AS role, COUNT(*)::int AS cnt
    FROM "Notification" n
    JOIN "Student" s ON s."id" = n."studentId"
    LEFT JOIN "User" u ON u."id" = n."userId"
    WHERE n.status='ACTIVE' AND n."deletedAt" IS NULL AND n."studentId" IS NOT NULL
      AND s."deletedAt" IS NULL
      AND COALESCE(s."parentUserId", s."parentId") IS NOT NULL
      AND n."userId" <> COALESCE(s."parentUserId", s."parentId")
    GROUP BY u.role ORDER BY cnt DESC`

  // E. 被换绑学生：当前家长账号名下学员 vs 历史通知指向的学员
  out.e_unlinkedStudentNotifications = await prisma.$queryRaw`
    SELECT COUNT(DISTINCT s."id")::int AS students, COUNT(*)::int AS notifications
    FROM "Notification" n
    JOIN "Student" s ON s."id" = n."studentId"
    WHERE n.status='ACTIVE' AND n."deletedAt" IS NULL AND n."studentId" IS NOT NULL
      AND s."deletedAt" IS NULL
      AND COALESCE(s."parentUserId", s."parentId") IS NOT NULL
      AND n."userId" <> COALESCE(s."parentUserId", s."parentId")`

  // F. MasteryRecord 实际库列（核对 termId 基线）
  out.f_masteryColumns = await prisma.$queryRaw`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'MasteryRecord' ORDER BY ordinal_position`

  // G. PerformancePost 表是否真为空 + visibility 分布
  out.g_postVisibility = await prisma.$queryRaw`
    SELECT visibility, COUNT(*)::int AS cnt FROM "PerformancePost" GROUP BY visibility`

  // H. 家长账号绑定学员数分布
  out.h_childrenPerParent = await prisma.$queryRaw`
    WITH c AS (
      SELECT COALESCE("parentUserId","parentId") AS pid, COUNT(*)::int AS kids
      FROM "Student" WHERE "deletedAt" IS NULL AND COALESCE("parentUserId","parentId") IS NOT NULL
      GROUP BY 1
    )
    SELECT kids, COUNT(*)::int AS parents FROM c GROUP BY kids ORDER BY kids`

  // I. 教师表电话字段填充情况（家长端不展示电话，仅核对数据存在性）
  out.i_teacherPhone = await prisma.$queryRaw`
    SELECT status, COUNT(*)::int AS cnt,
      COUNT(*) FILTER (WHERE phone IS NOT NULL AND phone <> '')::int AS withPhone
    FROM "Teacher" GROUP BY status ORDER BY cnt DESC`

  console.log(JSON.stringify(out, null, 2))
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
