const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT migration_name, finished_at, rolled_back_at, logs FROM "_prisma_migrations"
      ORDER BY started_at DESC LIMIT 8
    `);
    for (const r of rows) console.log(r.migration_name, '| finished:', r.finished_at ? 'yes' : 'NO', '| rolledback:', r.rolled_back_at ? 'yes' : 'no');
  } catch (e) {
    console.error('ERR', e.message.slice(0, 300));
  }
})().then(() => prisma.$disconnect()).catch(async () => prisma.$disconnect());
