/* J 分片 · 补充抽样 2：双空链接行 + /parent/grades 与 /leave-requests 行核对（只读 SELECT） */
const path = require('path')
const repoRoot = 'D:\\01muzhexuetang\\muzhexuetang\\coding\\edu-manage'
process.chdir(repoRoot)
require(path.join(repoRoot, 'node_modules', 'dotenv')).config({ path: path.join(repoRoot, '.env') })
const { PrismaClient } = require(path.join(repoRoot, 'node_modules', '@prisma/client'))
const prisma = new PrismaClient()

async function main() {
  const nullBoth = await prisma.$queryRawUnsafe(
    `SELECT id, type, title, "relatedType", "relatedId", href, link
     FROM "Notification" WHERE href IS NULL AND link IS NULL`
  )
  console.log('--- 双空链接行 ---')
  console.log(JSON.stringify(nullBoth, null, 1))

  const grades = await prisma.$queryRawUnsafe(
    `SELECT type, count(*)::int AS cnt,
            count(*) FILTER (WHERE href IS NULL)::int AS href_null,
            count(*) FILTER (WHERE link = '/parent/grades')::int AS link_grades
     FROM "Notification" WHERE link = '/parent/grades' OR href = '/parent/grades'
     GROUP BY 1`
  )
  console.log('--- /parent/grades 行 ---')
  console.log(JSON.stringify(grades, null, 1))

  const leave = await prisma.$queryRawUnsafe(
    `SELECT type, count(*)::int AS cnt, href, link,
            (SELECT role FROM "User" u WHERE u.id = "Notification"."userId") AS role
     FROM "Notification" WHERE href = '/leave-requests' OR link = '/leave-requests'
     GROUP BY 1, 3, 4, 5`
  )
  console.log('--- /leave-requests 行 ---')
  console.log(JSON.stringify(leave, null, 1))
}
main().catch(e => console.error('ERROR', e.message)).finally(() => prisma.$disconnect())
