/* J 分片 · 补充抽样：通知链接取值与死跳转核对（只读 SELECT） */
const path = require('path')
const repoRoot = 'D:\\01muzhexuetang\\muzhexuetang\\coding\\edu-manage'
process.chdir(repoRoot)
require(path.join(repoRoot, 'node_modules', 'dotenv')).config({ path: path.join(repoRoot, '.env') })
const { PrismaClient } = require(path.join(repoRoot, 'node_modules', '@prisma/client'))
const prisma = new PrismaClient()

async function main() {
  const hrefs = await prisma.$queryRawUnsafe(
    `SELECT DISTINCT href FROM "Notification" WHERE href IS NOT NULL`
  )
  console.log('--- distinct href ---')
  hrefs.forEach(r => console.log(r.href))
  const links = await prisma.$queryRawUnsafe(
    `SELECT DISTINCT link FROM "Notification" WHERE link IS NOT NULL`
  )
  console.log('--- distinct link ---')
  links.forEach(r => console.log(r.link))
  const nullHref = await prisma.$queryRawUnsafe(
    `SELECT id, type, title, relatedType, relatedId FROM "Notification" WHERE href IS NULL AND link IS NULL`
  )
  console.log('--- 双空链接行 ---')
  console.log(JSON.stringify(nullHref, null, 1))
}
main().catch(e => console.error('ERROR', e.message)).finally(() => prisma.$disconnect())
