/*
 * J 分片 · 只读数据库抽样脚本
 * 红线：仅使用 $queryRaw 的 SELECT；不执行任何写操作 / DDL / migrate。
 * 运行：在仓库根目录 D:\01muzhexuetang\muzhexuetang\coding\edu-manage 下执行
 *   node ..\_audit20261108\j_sample.js
 */
const path = require('path')

const repoRoot = 'D:\\01muzhexuetang\\muzhexuetang\\coding\\edu-manage'
process.chdir(repoRoot)

require(path.join(repoRoot, 'node_modules', 'dotenv')).config({ path: path.join(repoRoot, '.env') })
const { PrismaClient } = require(path.join(repoRoot, 'node_modules', '@prisma/client'))
const prisma = new PrismaClient()

async function section(title) {
  console.log('\n===== ' + title + ' =====')
}

async function main() {
  // 1. 背单词落库量
  section('1. VocabProgress / VocabSession 落库情况')
  const progress = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS total, count(DISTINCT "studentId")::int AS students,
            count(*) FILTER (WHERE status = 'MASTERED')::int AS mastered,
            count(*) FILTER (WHERE status = 'WRONG')::int AS wrong,
            max("updatedAt") AS last_at
     FROM "VocabProgress"`
  )
  console.log('VocabProgress:', JSON.stringify(progress, null, 0))
  const sessions = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS total, count(DISTINCT "studentId")::int AS students,
            count(*) FILTER (WHERE "finishedAt" IS NOT NULL)::int AS finished,
            max("createdAt") AS last_at
     FROM "VocabSession"`
  )
  console.log('VocabSession:', JSON.stringify(sessions, null, 0))
  const vocabStudents = await prisma.$queryRawUnsafe(
    `SELECT s.id, s.name, s.status, s."parentId", s."parentUserId",
            (SELECT count(*) FROM "VocabSession" v WHERE v."studentId" = s.id)::int AS sessions
     FROM "Student" s WHERE s.id IN (SELECT "studentId" FROM "VocabSession")
     ORDER BY sessions DESC`
  )
  console.log('有背单词记录的学生:', JSON.stringify(vocabStudents, null, 1))

  // 2. 通知类型 × 接收方角色分布
  section('2. Notification 类型 / 接收角色分布')
  const typeDist = await prisma.$queryRawUnsafe(
    `SELECT n.type, COALESCE(u.role, 'NULL') AS role, count(*)::int AS cnt
     FROM "Notification" n LEFT JOIN "User" u ON u.id = n."userId"
     GROUP BY 1, 2 ORDER BY cnt DESC`
  )
  console.log(JSON.stringify(typeDist, null, 1))

  // 3. href / link 空值分布（死跳转排查）
  section('3. Notification href/link 空值与落地链接抽样')
  const hrefDist = await prisma.$queryRawUnsafe(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE href IS NULL)::int AS href_null,
            count(*) FILTER (WHERE link IS NULL)::int AS link_null,
            count(*) FILTER (WHERE href IS NULL AND link IS NULL)::int AS both_null
     FROM "Notification" WHERE "deletedAt" IS NULL`
  )
  console.log(JSON.stringify(hrefDist, null, 0))
  const hrefSample = await prisma.$queryRawUnsafe(
    `SELECT type, href, link, count(*)::int AS cnt
     FROM "Notification" WHERE "deletedAt" IS NULL
     GROUP BY 1, 2, 3 ORDER BY cnt DESC LIMIT 30`
  )
  console.log('链接取值分布:', JSON.stringify(hrefSample, null, 1))

  // 4. 已读口径一致性
  section('4. 已读标记口径一致性')
  const readConsistency = await prisma.$queryRawUnsafe(
    `SELECT
      count(*) FILTER (WHERE read = false AND "readAt" IS NOT NULL)::int AS unread_but_readAt,
      count(*) FILTER (WHERE read = true  AND "readAt" IS NULL)::int AS read_but_no_readAt,
      count(*) FILTER (WHERE read = false)::int AS unread,
      count(*) FILTER (WHERE read = true)::int AS read,
      count(*) FILTER (WHERE status <> 'ACTIVE')::int AS not_active,
      count(*) FILTER (WHERE "deletedAt" IS NOT NULL)::int AS soft_deleted
     FROM "Notification"`
  )
  console.log(JSON.stringify(readConsistency, null, 0))

  // 4b. 历史脏数据：read=true 但无 readAt 的类型/时间分布
  section('4b. read=true 但 readAt 为空的历史行分布')
  const legacyRead = await prisma.$queryRawUnsafe(
    `SELECT type, count(*)::int AS cnt, min("createdAt")::date AS first_day, max("createdAt")::date AS last_day
     FROM "Notification" WHERE read = true AND "readAt" IS NULL
     GROUP BY 1 ORDER BY cnt DESC`
  )
  console.log(JSON.stringify(legacyRead, null, 1))

  // 5. 解绑残留：通知指向的学生已无家长绑定
  section('5. 解绑残留：Notification.studentId 对应学生已解绑')
  const residual = await prisma.$queryRawUnsafe(
    `SELECT n.type, count(*)::int AS cnt
     FROM "Notification" n
     LEFT JOIN "Student" s ON s.id = n."studentId"
     WHERE n."deletedAt" IS NULL
       AND n."studentId" IS NOT NULL
       AND (s.id IS NULL OR (s."parentId" IS NULL AND s."parentUserId" IS NULL))
     GROUP BY 1 ORDER BY cnt DESC`
  )
  console.log('已解绑学生的残留通知:', JSON.stringify(residual, null, 1))

  // 6. 多孩子家长绑定规模
  section('6. 多孩子家长绑定规模')
  const multi = await prisma.$queryRawUnsafe(
    `WITH bind AS (
       SELECT COALESCE("parentUserId", "parentId") AS pid, count(*)::int AS kids
       FROM "Student"
       WHERE "deletedAt" IS NULL AND status <> 'INACTIVE'
         AND COALESCE("parentUserId", "parentId") IS NOT NULL
       GROUP BY 1
     )
     SELECT kids, count(*)::int AS parents FROM bind GROUP BY 1 ORDER BY 1`
  )
  console.log('每个家长名下活跃孩子数分布:', JSON.stringify(multi, null, 1))

  // 7. 家长端可达表中是否出现工资流水（反查：通知/反馈/成绩里是否夹带 salary 字段名无法从 SQL 看，跳过）
  section('7. 教师工资表接收方角色反查')
  const salaryRoles = await prisma.$queryRawUnsafe(
    `SELECT COALESCE(u.role, 'NULL') AS role, count(*)::int
     FROM "TeacherSalaryTransaction" t
     LEFT JOIN "Teacher" tc ON tc.id = t."teacherId"
     LEFT JOIN "User" u ON u."teacherId" = tc.id
     GROUP BY 1 ORDER BY 2 DESC`
  ).catch((e) => { console.log('TeacherSalaryTransaction 反查失败: ' + e.message); return [] })
  console.log(JSON.stringify(salaryRoles, null, 1))
}

main()
  .catch((e) => { console.error('ERROR', e.message) })
  .finally(() => prisma.$disconnect())
