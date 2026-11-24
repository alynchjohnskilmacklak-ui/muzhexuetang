const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const q = (sql) => prisma.$queryRawUnsafe(sql);
(async () => {
  // 是否 149 来自 totalHours 口径
  const t = await q(`WITH agg AS (
      SELECT e."studentId" sid, SUM(e."totalHours") tot FROM "Enrollment" e
      WHERE e."deletedAt" IS NULL AND e.status='ACTIVE' GROUP BY 1)
    SELECT COUNT(*)::int mismatch FROM "Student" s LEFT JOIN agg ON agg.sid=s.id
    WHERE s."deletedAt" IS NULL AND ABS(s."totalHours" - COALESCE(agg.tot,0)) > 0.009`);
  console.log('口径T totalHours 不一致人数:', t[0].mismatch);

  // 是否 149 来自"报名级 remain 之和 vs 学生级"但含非 ACTIVE 报名
  const t2 = await q(`WITH agg AS (
      SELECT e."studentId" sid, SUM(e."remainHours") rem FROM "Enrollment" e
      WHERE e."deletedAt" IS NULL GROUP BY 1)
    SELECT COUNT(*)::int mismatch FROM "Student" s LEFT JOIN agg ON agg.sid=s.id
    WHERE s."deletedAt" IS NULL AND ABS(s."remainHours" - COALESCE(agg.rem,0)) > 0.009`);
  console.log('口径含非ACTIVE报名 不一致人数:', t2[0].mismatch);

  const h = await q(`SELECT COUNT(*)::int n FROM "HourTransaction" WHERE "createdAt" > now() - interval '72 hours' AND "deletedAt" IS NULL`);
  console.log('近72h课时流水:', h[0].n);
})().then(() => prisma.$disconnect()).catch(async (e) => { console.error('ERR', e.message.slice(0, 200)); await prisma.$disconnect(); });
