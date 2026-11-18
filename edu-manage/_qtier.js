const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:edu_manage_test@localhost:5432/edu_manage' } } });
(async () => {
  const level = process.argv[2] || 'ELITE';
  const up = await p.teacher.updateMany({ where: { name: '胡老师' }, data: { tierLevel: level } });
  console.log('updated:', up.count, level);
  await p.$disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
