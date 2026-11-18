const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:edu_manage_test@localhost:5432/edu_manage' } } });
(async () => {
  const rs = await p.teacher.findMany({ select: { id: true, name: true, tierLevel: true } });
  console.log(JSON.stringify(rs));
  await p.$disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
