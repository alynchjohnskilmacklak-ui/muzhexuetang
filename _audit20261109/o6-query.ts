// O6 只读审计脚本：仅 SELECT，不写库、不 migrate、不碰 dev 端口。
// 运行：在 edu-manage 目录下执行 npx tsx ../_audit20261109/o6-query.ts
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

  // 1. 志愿子系统各表行数（是否只有测试/种子数据）
  out.guide = await prisma.$queryRaw`SELECT COUNT(*)::int AS cnt, MAX("updatedAt")::text AS lastUpdated FROM "VolunteerGuide"`
  out.guideSteps = await prisma.$queryRaw`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE "isPublished" = true)::int AS published FROM "GuideStep"`
  out.guideDocs = await prisma.$queryRaw`SELECT COUNT(*)::int AS cnt FROM "GuideDocument"`
  out.quotaRecordByYear = await prisma.$queryRaw`SELECT "year", COUNT(*)::int AS cnt, COUNT(DISTINCT "schoolName")::int AS schools, COUNT(DISTINCT "district")::int AS districts FROM "QuotaRecord" GROUP BY "year" ORDER BY "year" DESC`
  out.highSchool = await prisma.$queryRaw`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE "infoConfidence" = 'official')::int AS official, COUNT(*) FILTER (WHERE "infoConfidence" IN ('unverified','unknown') OR "infoConfidence" IS NULL)::int AS unverified, COUNT(*) FILTER (WHERE "address" IS NULL OR "address" = '')::int AS noAddress, COUNT(*) FILTER (WHERE "phone" IS NULL OR "phone" = '')::int AS noPhone FROM "HighSchoolInfo"`
  out.yifenYidangByYear = await prisma.$queryRaw`SELECT "year", COUNT(*)::int AS rows, MAX("cumulative")::int AS maxCum, MIN("score")::int AS minScore, MAX("score")::int AS maxScore FROM "YifenYidang" GROUP BY "year" ORDER BY "year" DESC`
  out.allocationQuotaByYear = await prisma.$queryRaw`SELECT "year", COUNT(*)::int AS rows, COUNT(DISTINCT "juniorSchool")::int AS juniors, COUNT(DISTINCT "seniorSchool")::int AS seniors FROM "AllocationQuota" GROUP BY "year" ORDER BY "year" DESC`
  out.consultation = await prisma.$queryRaw`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE "isReplied" = true)::int AS replied, COUNT(*) FILTER (WHERE "isReplied" = false)::int AS pending FROM "VolunteerConsultation"`

  // 2. 调课事件：总量 / 时间分布 / 通知缺口
  out.cceTotal = await prisma.$queryRaw`SELECT COUNT(*)::int AS cnt, MIN("createdAt")::text AS firstAt, MAX("createdAt")::text AS lastAt FROM "CourseChangeEvent"`
  out.cceByMonth = await prisma.$queryRaw`SELECT TO_CHAR("createdAt",'YYYY-MM') AS ym, COUNT(*)::int AS cnt FROM "CourseChangeEvent" GROUP BY ym ORDER BY ym DESC LIMIT 12`
  out.cceEventTypes = await prisma.$queryRaw`SELECT "eventType", COUNT(*)::int AS cnt FROM "CourseChangeEvent" GROUP BY "eventType" ORDER BY cnt DESC`
  out.cceNotificationGap = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS eventsTotal,
      COUNT(*) FILTER (WHERE n."cnt" IS NULL)::int AS noNotification,
      COUNT(*) FILTER (WHERE COALESCE(n."cnt",0) = 0)::int AS zeroRecipients
    FROM "CourseChangeEvent" e
    LEFT JOIN (SELECT "relatedId", COUNT(*)::int AS cnt FROM "Notification" WHERE "relatedType" = 'COURSE_CHANGE_EVENT' GROUP BY "relatedId") n
      ON n."relatedId" = e."id"`
  out.ccePushStatus = await prisma.$queryRaw`
    SELECT COALESCE("pushStatus",'none') AS status, COUNT(*)::int AS cnt
    FROM "Notification" WHERE "relatedType" = 'COURSE_CHANGE_EVENT'
    GROUP BY COALESCE("pushStatus",'none') ORDER BY cnt DESC`
  out.cceRecent30d = await prisma.$queryRaw`SELECT COUNT(*)::int AS cnt FROM "CourseChangeEvent" WHERE "createdAt" >= NOW() - INTERVAL '30 days'`

  // 3. 练习统计：总量 / 孤儿记录（学员已删或已离校）
  out.practiceAttempt = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE s."id" IS NULL)::int AS orphanStudentMissing,
      COUNT(*) FILTER (WHERE s."deletedAt" IS NOT NULL)::int AS softDeletedStudent,
      COUNT(*) FILTER (WHERE s."status" = 'LEFT')::int AS leftStudent
    FROM "PracticeAttempt" a
    LEFT JOIN "Student" s ON s."id" = a."studentId"`
  out.practiceAttemptByStudent = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS practicingStudents, COALESCE(SUM(cnt),0)::int AS attempts FROM (
      SELECT a."studentId", COUNT(*)::int AS cnt FROM "PracticeAttempt" a
      JOIN "Student" s ON s."id" = a."studentId"
      WHERE s."deletedAt" IS NULL AND s."status" <> 'LEFT'
      GROUP BY a."studentId"
    ) t`

  // 4. SystemConfig 是否承载 AI / PHET / 志愿开关配置（字段层面已在 schema 核对，这里看行内非空）
  out.systemConfig = await prisma.$queryRaw`
    SELECT "id", "orgName",
      CASE WHEN "schedulePeriods" IS NULL THEN 'null' ELSE 'json' END AS schedulePeriods,
      CASE WHEN "membershipBenefits" IS NULL THEN 'null' ELSE 'text' END AS membershipBenefits,
      CASE WHEN "teacherBenefits" IS NULL THEN 'null' ELSE 'text' END AS teacherBenefits
    FROM "SystemConfig"`

  // 5. 配置类表清单：确认没有 AI 开关 / PHET 链接 / 志愿规则配置表
  out.configLikeTables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND (table_name ILIKE '%config%' OR table_name ILIKE '%setting%' OR table_name ILIKE '%phet%' OR table_name ILIKE '%ai%')
    ORDER BY table_name`

  console.log(JSON.stringify(out, null, 2))
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
