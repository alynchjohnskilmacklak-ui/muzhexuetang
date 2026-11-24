// 只读补充：口径归因（含软删学生）/ 等级分布 / 近 48h 写入
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const q = (sql) => prisma.$queryRawUnsafe(sql);

(async () => {
  const enrAgg = `SELECT e."studentId" AS sid, SUM(e."remainHours") AS rem
                  FROM "Enrollment" e WHERE e."deletedAt" IS NULL AND e.status='ACTIVE' GROUP BY 1`;

  // D6：包含软删学生（看是否得到 149）
  const d6 = await q(`WITH agg AS (${enrAgg})
    SELECT COUNT(*)::int AS mismatch, COUNT(*) FILTER (WHERE s."remainHours" > 0.009 AND COALESCE(agg.rem,0)=0)::int AS zero
    FROM "Student" s LEFT JOIN agg ON agg.sid=s.id
    WHERE ABS(s."remainHours" - COALESCE(agg.rem,0)) > 0.009`);
  console.log('D6 含软删学生(全表):', JSON.stringify(d6[0]));

  // D7：按报名行数计（同一学生多条报名各算一次）
  const d7 = await q(`WITH per AS (
      SELECT s.id, s."remainHours" AS srem, COALESCE(SUM(e."remainHours"),0) AS rem
      FROM "Student" s LEFT JOIN "Enrollment" e
        ON e."studentId"=s.id AND e."deletedAt" IS NULL AND e.status='ACTIVE'
      WHERE s."deletedAt" IS NULL GROUP BY s.id, s."remainHours")
    SELECT COUNT(*)::int AS mismatch FROM per WHERE ABS(srem-rem) > 0.009`);
  console.log('D7 与D4同口径复核:', JSON.stringify(d7[0]));

  const lvl = await q(`SELECT "membershipLevel" lvl, COUNT(*)::int n FROM "Student" WHERE "deletedAt" IS NULL GROUP BY 1 ORDER BY n DESC`);
  console.log('等级分布:', JSON.stringify(lvl));

  const recent = await q(`SELECT
      (SELECT COUNT(*)::int FROM "HourTransaction" WHERE "createdAt" > now() - interval '72 hours') hour_tx_72h,
      (SELECT COUNT(*)::int FROM "Attendance" WHERE "createdAt" > now() - interval '72 hours') att_72h,
      (SELECT COUNT(*)::int FROM "Enrollment" WHERE "createdAt" > now() - interval '72 hours') enr_72h,
      (SELECT COUNT(*)::int FROM "Student" WHERE "createdAt" > now() - interval '72 hours') stu_72h`);
  console.log('近72h新建:', JSON.stringify(recent[0]));
})().then(() => prisma.$disconnect()).catch(async (e) => { console.error('ERR', e.message.slice(0, 300)); await prisma.$disconnect(); });
