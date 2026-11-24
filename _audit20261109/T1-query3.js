/* T1 只读深挖 3：累计制报名 vs ACCRUE 流水；突击班 DRAFT/PENDING；空名单对照基线 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const q = (sql) => prisma.$queryRawUnsafe(sql);

(async () => {
  console.log('=== E1 报名按计费口径分布（NORMAL/INTENSIVE × totalHours 0/>0） ===');
  const e1 = await q(`
    SELECT g."intensiveMode",
      COUNT(*) FILTER (WHERE e."totalHours"<=0) accrual,
      COUNT(*) FILTER (WHERE e."totalHours">0) prepaid,
      COUNT(*) total
    FROM "Enrollment" e JOIN "ClassGroup" g ON g.id=e."groupId"
    WHERE e.status='ACTIVE' AND e."deletedAt" IS NULL
    GROUP BY 1
  `);
  console.table(e1);

  console.log('\n=== E2 普通班已提交考勤中，累计制报名但无 ACCRUE 流水的考勤行 ===');
  const e2 = await q(`
    SELECT COUNT(*)::int accrual_att,
      COUNT(*) FILTER (WHERE NOT EXISTS (
        SELECT 1 FROM "HourTransaction" h WHERE h."lessonId"=a."lessonId" AND h."studentId"=a."studentId"
          AND h.type='ATTENDANCE_ACCRUE' AND h."deletedAt" IS NULL)) missing_accrue
    FROM "Attendance" a
    JOIN "Enrollment" e ON e.id=a."enrollmentId"
    JOIN "ClassLesson" cl ON cl.id=a."lessonId"
    JOIN "ClassGroup" g ON g.id=cl."groupId"
    WHERE a."deletedAt" IS NULL AND cl."deletedAt" IS NULL
      AND cl."attendanceSubmittedAt" IS NOT NULL AND g."intensiveMode" <> 'INTENSIVE'
      AND e."totalHours" <= 0 AND a."hoursDeducted" > 0
  `);
  console.table(e2);

  console.log('\n=== E3 突击班审核状态全量（含 DRAFT/PENDING） ===');
  const e3 = await q(`
    SELECT "intensiveReviewStatus", COUNT(*)::int n FROM "ClassLesson" cl
    JOIN "ClassGroup" g ON g.id=cl."groupId"
    WHERE g."intensiveMode"='INTENSIVE' AND cl."deletedAt" IS NULL
    GROUP BY 1 ORDER BY 1
  `);
  console.table(e3);

  console.log('\n=== E4 SCHEDULED 空名单课次对照基线（160 / 27.0%） ===');
  const e4 = await q(`
    SELECT COUNT(*)::int scheduled_total,
      COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "ClassLessonStudent" s WHERE s."lessonId"=cl.id)) empty_roster,
      ROUND(100.0 * COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "ClassLessonStudent" s WHERE s."lessonId"=cl.id))
        / COUNT(*), 1) empty_pct
    FROM "ClassLesson" cl
    WHERE cl."deletedAt" IS NULL AND cl.status='SCHEDULED'
  `);
  console.table(e4);

  console.log('\n=== E5 ACCRUE 流水历史分布（全量） ===');
  const e5 = await q(`
    SELECT type, COUNT(*)::int n, MIN("createdAt")::date earliest, MAX("createdAt")::date latest
    FROM "HourTransaction" WHERE "deletedAt" IS NULL GROUP BY 1 ORDER BY n DESC
  `);
  console.table(e5);
})().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error('ERR', e.message.slice(0, 300));
  await prisma.$disconnect();
});
