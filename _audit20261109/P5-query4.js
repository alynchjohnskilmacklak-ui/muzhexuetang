/* P5 只读诊断：对齐 O1 口径，跨角色复核"通知接收人 ≠ 当前学生归属"的脱节残留。仅 SELECT。 */
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
    SELECT u.role, COALESCE(n.type,'NULL') type, COUNT(*)::int cnt,
           COUNT(*) FILTER (WHERE NOT n.read)::int unread,
           COUNT(*) FILTER (WHERE s.id IS NULL)::int student_missing,
           COUNT(*) FILTER (WHERE s.id IS NOT NULL AND s."deletedAt" IS NOT NULL)::int student_deleted,
           COUNT(*) FILTER (WHERE s.id IS NOT NULL AND s."deletedAt" IS NULL AND s.status='INACTIVE')::int student_inactive,
           COUNT(*) FILTER (WHERE s.id IS NOT NULL AND s."deletedAt" IS NULL AND s.status<>'INACTIVE'
             AND COALESCE(s."parentId",s."parentUserId") IS NULL)::int student_unlinked,
           COUNT(*) FILTER (WHERE s.id IS NOT NULL AND s."deletedAt" IS NULL AND s.status<>'INACTIVE'
             AND COALESCE(s."parentId",s."parentUserId") IS NOT NULL
             AND COALESCE(s."parentId",s."parentUserId") <> n."userId")::int bound_other
    FROM "Notification" n
    JOIN "User" u ON u.id=n."userId"
    LEFT JOIN "Student" s ON s.id=n."studentId"
    WHERE n.status='ACTIVE' AND n."studentId" IS NOT NULL
    GROUP BY 1,2 ORDER BY cnt DESC`)
  console.log(JSON.stringify(rows, bi, 2))

  const rows2 = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*)::int disjoint_total,
           COUNT(*) FILTER (WHERE NOT n.read)::int disjoint_unread
    FROM "Notification" n
    JOIN "User" u ON u.id=n."userId"
    LEFT JOIN "Student" s ON s.id=n."studentId"
    WHERE n.status='ACTIVE' AND n."studentId" IS NOT NULL
      AND s.id IS NOT NULL AND s."deletedAt" IS NULL AND s.status<>'INACTIVE'
      AND COALESCE(s."parentId",s."parentUserId") IS NOT NULL
      AND COALESCE(s."parentId",s."parentUserId") <> n."userId"`)
  console.log('\n--- bound-other disjoint ---')
  console.log(JSON.stringify(rows2, bi, 2))

  await prisma.$disconnect()
})().catch(async e => { console.error(e); await prisma.$disconnect(); process.exit(1) })
