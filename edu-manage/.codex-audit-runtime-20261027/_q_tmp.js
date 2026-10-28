const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  try {
    const rows = await p.student.findMany({
      where: { OR: [{ parentId: 'cmpamlvc9000tcv8lwq882x1b' }, { parentUserId: 'cmpamlvc9000tcv8lwq882x1b' }], status: { not: 'INACTIVE' }, deletedAt: null },
      select: { id:true, identityId:true, name:true, grade:true, createdAt:true, termMemberships: { select: { grade:true, status:true, joinedAt:true, term: { select: { name:true, status:true, startDate:true } } } } }
    });
    for (const r of rows) {
      console.log(JSON.stringify({id:r.id, identityId:r.identityId, name:r.name, grade:r.grade, tm: r.termMemberships.map(t=>({g:t.grade,s:t.status,j:t.joinedAt,term:t.term?.name}))}));
    }
  } catch (e) { console.error('ERR', e.message); } finally { await p.$disconnect(); }
})();
