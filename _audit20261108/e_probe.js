const path = require('path')
const repoRoot = 'D:\\01muzhexuetang\\muzhexuetang\\coding\\edu-manage'
process.chdir(repoRoot)
require(path.join(repoRoot, 'node_modules', 'dotenv')).config({ path: path.join(repoRoot, '.env') })
const { PrismaClient } = require(path.join(repoRoot, 'node_modules', '@prisma/client'))
const prisma = new PrismaClient()
async function main() {
  const tables = await prisma.$queryRawUnsafe(
    `SELECT table_name FROM information_schema.tables WHERE table_name ILIKE '%fee%' OR table_name ILIKE '%salary%' OR table_name ILIKE '%transaction%' ORDER BY 1`)
  console.log('tables:', tables)
  for (const t of tables) {
    const name = t.table_name
    try {
      const c = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS n FROM "${name}"`)
      console.log(name, c[0].n)
    } catch (e) { console.log(name, 'ERR', e.message) }
  }
}
main().catch((e) => console.error(e)).finally(async () => { await prisma.$disconnect() })
