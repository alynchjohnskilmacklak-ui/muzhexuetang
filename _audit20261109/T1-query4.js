const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const q = (sql) => prisma.$queryRawUnsafe(sql);
(async () => {
  const r = await q(`
    SELECT h.type, h."studentId", h.amount, h.reason
    FROM "HourTransaction" h
    WHERE h."lessonId"='cmuv1enu9000eysw9og7rp5fe' AND h."deletedAt" IS NULL
    ORDER BY h."createdAt"
  `);
  console.table(r);
})().then(() => prisma.$disconnect()).catch(async (e) => { console.error(e.message); await prisma.$disconnect(); });
