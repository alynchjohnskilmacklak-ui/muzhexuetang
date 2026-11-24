// 只读核对：136/191 与 149/35 的余额口径差异（仅 SELECT）
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const q = (sql) => prisma.$queryRawUnsafe(sql);

  const byStatus = await q(`SELECT status, COUNT(*)::int AS n FROM "Student" WHERE "deletedAt" IS NULL GROUP BY status ORDER BY n DESC`);
  console.log('学生状态分布(deletedAt NULL):', JSON.stringify(byStatus));

  const total = await q(`SELECT COUNT(*)::int AS n FROM "Student" WHERE "deletedAt" IS NULL`);
  console.log('学生总数(deletedAt NULL):', total[0].n);

  const enrAgg = `SELECT e."studentId" AS sid, SUM(e."remainHours") AS rem, COUNT(*)::int AS n
                  FROM "Enrollment" e WHERE e."deletedAt" IS NULL AND e.status = 'ACTIVE' GROUP BY 1`;

  // D3：只看有活跃报名的学生（最严口径）
  const d3 = await q(`WITH agg AS (${enrAgg})
    SELECT COUNT(*)::int AS mismatch, COUNT(*) FILTER (WHERE s."remainHours" > 0.009 AND agg.rem = 0)::int AS stu_pos_enr_zero
    FROM "Student" s JOIN agg ON agg.sid = s.id
    WHERE s."deletedAt" IS NULL AND ABS(s."remainHours" - agg.rem) > 0.009`);
  console.log('D3 有活跃报名且不一致:', JSON.stringify(d3[0]));

  // D4：全部未删学生（无报名的算 0）
  const d4 = await q(`WITH agg AS (${enrAgg})
    SELECT COUNT(*)::int AS mismatch, COUNT(*) FILTER (WHERE s."remainHours" > 0.009 AND COALESCE(agg.rem,0) = 0)::int AS stu_pos_enr_zero
    FROM "Student" s LEFT JOIN agg ON agg.sid = s.id
    WHERE s."deletedAt" IS NULL AND ABS(s."remainHours" - COALESCE(agg.rem,0)) > 0.009`);
  console.log('D4 全部未删学生且不一致:', JSON.stringify(d4[0]));

  // D5：排除 INACTIVE 后的口径
  const d5 = await q(`WITH agg AS (${enrAgg})
    SELECT COUNT(*)::int AS mismatch, COUNT(*) FILTER (WHERE s."remainHours" > 0.009 AND COALESCE(agg.rem,0) = 0)::int AS stu_pos_enr_zero
    FROM "Student" s LEFT JOIN agg ON agg.sid = s.id
    WHERE s."deletedAt" IS NULL AND s.status <> 'INACTIVE' AND ABS(s."remainHours" - COALESCE(agg.rem,0)) > 0.009`);
  console.log('D5 排除INACTIVE且不一致:', JSON.stringify(d5[0]));

  // 有活跃报名但没有报名的学生数（用于解释差额）
  const noEnr = await q(`SELECT COUNT(*)::int AS n FROM "Student" s
    WHERE s."deletedAt" IS NULL AND NOT EXISTS (
      SELECT 1 FROM "Enrollment" e WHERE e."studentId" = s.id AND e."deletedAt" IS NULL AND e.status='ACTIVE')`);
  console.log('无活跃报名的未删学生:', noEnr[0].n);

  // 近 48h 是否有账务写入（排除"两天内数据变动"这一解释）
  const recent = await q(`SELECT
      (SELECT COUNT(*)::int FROM "HourTransaction" WHERE "createdAt" > now() - interval '48 hours') AS hour_tx_48h,
      (SELECT COUNT(*)::int FROM "Attendance" WHERE "updatedAt" > now() - interval '48 hours') AS att_48h,
      (SELECT COUNT(*)::int FROM "Enrollment" WHERE "updatedAt" > now() - interval '48 hours') AS enr_48h,
      (SELECT COUNT(*)::int FROM "Student" WHERE "updatedAt" > now() - interval '48 hours') AS stu_48h`);
  console.log('近48h写入:', JSON.stringify(recent[0]));

  // 会员等级分布（核对 O4 的 119/30/42）
  const lvl = await q(`SELECT "membershipLevel" AS lvl, COUNT(*)::int AS n FROM "Student"
     WHERE "deletedAt" IS NULL GROUP BY 1 ORDER BY n DESC`);
  console.log('等级分布(deletedAt NULL):', JSON.stringify(lvl));
}

main().then(() => prisma.$disconnect()).catch(async (e) => { console.error('ERR', e.message); await prisma.$disconnect(); process.exit(1); });
