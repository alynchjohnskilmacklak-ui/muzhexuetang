// O4 只读审计脚本：仅 SELECT，不写库、不 migrate、不碰 dev 端口。
// 运行：在 edu-manage 目录下执行 npx tsx ../_audit20261109/o4-query.ts
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

  // 1. 学员等级分布（未删除）
  out.levelDistribution = await prisma.$queryRaw`
    SELECT "membershipLevel", COUNT(*)::int AS cnt
    FROM "Student"
    WHERE "deletedAt" IS NULL
    GROUP BY "membershipLevel"
    ORDER BY cnt DESC`

  // 2. 非法等级值（不在 NORMAL/VIP/SVIP 内）
  out.invalidLevels = await prisma.$queryRaw`
    SELECT "id", "name", "membershipLevel", "division"
    FROM "Student"
    WHERE "deletedAt" IS NULL
      AND "membershipLevel" NOT IN ('NORMAL','VIP','SVIP')`

  // 3. Fee 表行数（全量 / 未删 / 按状态）
  out.feeTotal = await prisma.$queryRaw`SELECT COUNT(*)::int AS cnt FROM "Fee"`
  out.feeVisible = await prisma.$queryRaw`SELECT COUNT(*)::int AS cnt FROM "Fee" WHERE "deletedAt" IS NULL`
  out.feeByStatus = await prisma.$queryRaw`
    SELECT "status", COUNT(*)::int AS cnt, COALESCE(SUM("amount"),0)::float AS amount
    FROM "Fee" WHERE "deletedAt" IS NULL GROUP BY "status" ORDER BY cnt DESC`
  // 关联到已停用/已删课程的费用（家长端会被过滤掉）
  out.feeInactiveCourse = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS cnt FROM "Fee" f
    LEFT JOIN "Course" c ON c."id" = f."courseId"
    WHERE f."deletedAt" IS NULL AND f."courseId" IS NOT NULL
      AND (c."isActive" = false OR c."deletedAt" IS NOT NULL)`

  // 4. FeeType 字典
  out.feeTypeTotal = await prisma.$queryRaw`SELECT COUNT(*)::int AS cnt FROM "FeeType"`
  out.feeTypeActive = await prisma.$queryRaw`SELECT COUNT(*)::int AS cnt FROM "FeeType" WHERE "isActive" = true`

  // 5. SystemConfig 权益文案是否被覆盖
  out.systemConfig = await prisma.$queryRaw`
    SELECT "id",
      CASE WHEN "membershipBenefits" IS NULL THEN 'null'
           WHEN TRIM("membershipBenefits") = '' THEN 'empty'
           ELSE 'custom(' || LENGTH("membershipBenefits") || ' chars)' END AS membershipBenefits,
      CASE WHEN "teacherBenefits" IS NULL THEN 'null'
           WHEN TRIM("teacherBenefits") = '' THEN 'empty'
           ELSE 'custom(' || LENGTH("teacherBenefits") || ' chars)' END AS teacherBenefits
    FROM "SystemConfig"`

  // 6. 是否存在服务/权益配置表
  out.serviceLikeTables = await prisma.$queryRaw`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND (table_name ILIKE '%service%' OR table_name ILIKE '%benefit%' OR table_name ILIKE '%membership%')
    ORDER BY table_name`

  // 7. HourTransaction 类型分布（看是否存在金额退费类型）
  out.hourTxTypes = await prisma.$queryRaw`
    SELECT "type", COUNT(*)::int AS cnt, COALESCE(SUM("amount"),0)::float AS amount
    FROM "HourTransaction" WHERE "deletedAt" IS NULL
    GROUP BY "type" ORDER BY cnt DESC`

  // 8. 报名级 vs 学生级余额不一致概览（前轮已知分裂，此处仅复核量级）
  out.hourSplit = await prisma.$queryRaw`
    SELECT
      COUNT(*)::int AS activeEnrollments,
      COUNT(*) FILTER (WHERE e."remainHours" <> s."remainHours")::int AS mismatched,
      COUNT(*) FILTER (WHERE e."remainHours" = 0 AND s."remainHours" > 0)::int AS studentOnly
    FROM "Enrollment" e
    JOIN "Student" s ON s."id" = e."studentId"
    WHERE e."status" = 'ACTIVE' AND e."deletedAt" IS NULL AND s."deletedAt" IS NULL`

  // 9. Course 单价字段是否有值（家长端不读 pricePerLesson）
  out.coursePrice = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE "pricePerLesson" IS NOT NULL)::int AS withPrice,
      COUNT(*) FILTER (WHERE "isActive" = true)::int AS active
    FROM "Course" WHERE "deletedAt" IS NULL`

  // 10. 报名记录数 / 续费跟进记录数
  out.enrollmentActive = await prisma.$queryRaw`SELECT COUNT(*)::int AS cnt FROM "Enrollment" WHERE "status"='ACTIVE' AND "deletedAt" IS NULL`
  out.renewalFollowUp = await prisma.$queryRaw`SELECT COUNT(*)::int AS cnt FROM "RenewalFollowUp"`
  out.renewalFollowUpByStatus = await prisma.$queryRaw`
    SELECT "status", COUNT(*)::int AS cnt FROM "RenewalFollowUp" GROUP BY "status" ORDER BY cnt DESC`

  // 11. INTENSIVE 报名（/parent/vip 皇冠口径）与 membershipLevel 口径交叉
  out.intensiveByLevel = await prisma.$queryRaw`
    SELECT s."membershipLevel", COUNT(DISTINCT e."id")::int AS intensiveEnrollments,
      COUNT(DISTINCT s."id")::int AS students
    FROM "Enrollment" e
    JOIN "Student" s ON s."id" = e."studentId"
    JOIN "ClassGroup" g ON g."id" = e."groupId"
    WHERE e."status" = 'ACTIVE' AND e."deletedAt" IS NULL AND s."deletedAt" IS NULL
      AND g."intensiveMode" = 'INTENSIVE'
    GROUP BY s."membershipLevel" ORDER BY intensiveEnrollments DESC`

  console.log(JSON.stringify(out, null, 2))
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
