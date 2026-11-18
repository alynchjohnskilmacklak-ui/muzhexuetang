const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const target = process.argv[2];
(async () => {
  try {
    const upd = await p.studentTermMembership.updateMany({
      where: { studentId: 'cmty5x9hq006ebsanz7mjhmz9', status: 'ACTIVE' },
      data: { grade: target },
    });
    console.log('MEMBERSHIP UPDATED count:', upd.count);
    const rows = await p.studentTermMembership.findMany({ where: { studentId: 'cmty5x9hq006ebsanz7mjhmz9' }, select: { id:true, grade:true, status:true } });
    console.log('NOW:', JSON.stringify(rows));
  } catch (e) { console.error('ERR', e.message); } finally { await p.$disconnect(); }
})();
