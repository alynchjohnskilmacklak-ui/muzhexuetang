const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:edu_manage_test@localhost:5432/edu_manage' } } });
(async () => {
  const up = await p.student.updateMany({ where: { name: { in: ['马子墨', '牛博研'] } }, data: { membershipLevel: 'SVIP' } });
  console.log('updated:', up.count);
  const rs = await p.student.findMany({ where: { name: { in: ['马子墨', '牛博研'] } }, select: { name: true, membershipLevel: true } });
  console.log(JSON.stringify(rs));
  await p.$disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
