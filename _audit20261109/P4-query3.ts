// P4 第三轮只读复核：家长接收人脱节子集 + 看板弱 where 影响面
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

  // 1. 脱节通知中接收人角色=parent 的条数（家长自己看到旧孩子通知的实际风险）
  out.p_receiverParent = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS cnt
    FROM "Notification" n
    JOIN "Student" s ON s."id" = n."studentId"
    JOIN "User" u ON u."id" = n."userId"
    WHERE n.status='ACTIVE' AND n."deletedAt" IS NULL AND n."studentId" IS NOT NULL
      AND s."deletedAt" IS NULL
      AND COALESCE(s."parentUserId", s."parentId") IS NOT NULL
      AND n."userId" <> COALESCE(s."parentUserId", s."parentId")
      AND u.role = 'parent'`

  // 2. 家长账号通知总量 vs 绑定学员通知量（看板弱 where 与通知页强 where 的差集）
  out.p_parentNotificationScope = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int AS parentActiveNotifications,
      COUNT(*) FILTER (WHERE n."studentId" IS NULL)::int AS nullStudent,
      COUNT(*) FILTER (WHERE n."studentId" IS NOT NULL AND s."id" IS NOT NULL)::int AS linkedStudent,
      COUNT(*) FILTER (WHERE n."studentId" IS NOT NULL AND s."id" IS NULL)::int AS orphanStudentId
    FROM "Notification" n
    LEFT JOIN "Student" s ON s."id" = n."studentId"
    JOIN "User" u ON u."id" = n."userId"
    WHERE n.status='ACTIVE' AND n."deletedAt" IS NULL AND u.role = 'parent'`

  // 3. 绑定字段为空的 11 个学员：是否还有通知遗留
  out.p_unboundStudentNotifications = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS students, COUNT(*)::int AS notifications
    FROM "Student" s
    JOIN "Notification" n ON n."studentId" = s."id"
    WHERE s."deletedAt" IS NULL AND s."parentUserId" IS NULL AND s."parentId" IS NULL
      AND n.status='ACTIVE' AND n."deletedAt" IS NULL`

  // 4. 通知接收人账号已停用/删除的遗留
  out.p_disabledReceiver = await prisma.$queryRaw`
    SELECT u.status::text AS status, COUNT(*)::int AS cnt
    FROM "Notification" n JOIN "User" u ON u."id" = n."userId"
    WHERE n.status='ACTIVE' AND n."deletedAt" IS NULL
    GROUP BY u.status ORDER BY cnt DESC`

  // 5. 家长端读点各表覆盖：按绑定学员聚合反馈/试卷/薄弱点/徽章
  out.p_linkedStudentCoverage = await prisma.$queryRaw`
    SELECT
      (SELECT COUNT(*)::int FROM "ClassroomFeedback" WHERE status='PUBLISHED' AND "deletedAt" IS NULL) AS feedbackLive,
      (SELECT COUNT(*)::int FROM "ExamPaper" WHERE status='PUBLISHED' AND "deletedAt" IS NULL) AS paperLive,
      (SELECT COUNT(*)::int FROM "WeaknessRecord") AS weakness,
      (SELECT COUNT(*)::int FROM "MasteryRecord") AS mastery,
      (SELECT COUNT(*)::int FROM "PerformancePost" WHERE "deletedAt" IS NULL) AS postLive,
      (SELECT COUNT(*)::int FROM "GradeRecord") AS grade,
      (SELECT COUNT(*)::int FROM "StageSummary" WHERE status='PUBLISHED') AS stagePublished,
      (SELECT COUNT(*)::int FROM "AchievementBadge") AS badge,
      (SELECT COUNT(*)::int FROM "HourTransaction" WHERE "deletedAt" IS NULL) AS hourTx,
      (SELECT COUNT(*)::int FROM "Attendance" WHERE "deletedAt" IS NULL) AS attendance`

  // 6. 15 份试卷的归属与家长可见性
  out.p_paperOwners = await prisma.$queryRaw`
    SELECT s.status::text AS studentStatus, COUNT(*)::int AS papers
    FROM "ExamPaper" p JOIN "Student" s ON s."id" = p."studentId"
    WHERE p.status='PUBLISHED' AND p."deletedAt" IS NULL
    GROUP BY s.status ORDER BY papers DESC`

  console.log(JSON.stringify(out, null, 2))
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
