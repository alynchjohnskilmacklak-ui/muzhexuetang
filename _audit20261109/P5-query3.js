/* P5 只读诊断：第一轮 49 条带 studentId 的家长通知按学生状态/归属细分。仅 SELECT。 */
const fs = require('fs')
const { PrismaClient } = require('D:/01muzhexuetang/muzhexuetang/coding/edu-manage/node_modules/@prisma/client')
const env = Object.fromEntries(
  fs.readFileSync('D:/01muzhexuetang/muzhexuetang/coding/edu-manage/.env', 'utf8').split(/\r?\n/)
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] })
)
const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } })
const bi = (k, v) => (typeof v === 'bigint' ? Number(v) : v)
;(async () => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(s.status,'(missing)') student_status,
           CASE WHEN s."deletedAt" IS NOT NULL THEN 'deleted'
                WHEN COALESCE(s."parentId",s."parentUserId") IS NULL THEN 'unlinked'
                WHEN COALESCE(s."parentId",s."parentUserId") = n."userId" THEN 'bound'
                ELSE 'other_parent' END bind_state,
           COUNT(*)::int cnt,
           COUNT(*) FILTER (WHERE NOT n.read)::int unread
    FROM "Notification" n
    JOIN "User" u ON u.id=n."userId"
    LEFT JOIN "Student" s ON s.id=n."studentId"
    WHERE u.role='parent' AND n.status='ACTIVE' AND n."studentId" IS NOT NULL
    GROUP BY 1,2 ORDER BY cnt DESC`)
  console.log(JSON.stringify(rows, bi, 2))

  const rows2 = await prisma.$queryRawUnsafe(`
    SELECT n.id, n."userId", n."studentId", n.type, n.read, s.status,
           s."parentId", s."parentUserId", s."deletedAt" IS NOT NULL AS deleted,
           LEFT(n.title,28) title
    FROM "Notification" n
    JOIN "User" u ON u.id=n."userId"
    LEFT JOIN "Student" s ON s.id=n."studentId"
    WHERE u.role='parent' AND n.status='ACTIVE' AND n."studentId" IS NOT NULL
      AND NOT (s.id IS NOT NULL AND s."deletedAt" IS NULL AND s.status<>'INACTIVE'
               AND COALESCE(s."parentId",s."parentUserId")=n."userId")
    ORDER BY n."createdAt" DESC LIMIT 20`)
  console.log('\n--- detail ---')
  console.log(JSON.stringify(rows2, bi, 2))

  await prisma.$disconnect()
})().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1) })
