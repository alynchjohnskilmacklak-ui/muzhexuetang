/* T1 只读深挖：缺工资课次 / 突击班课时流水去向 / HourTransaction 类型总览 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const q = (sql) => prisma.$queryRawUnsafe(sql);

(async () => {
  console.log('=== D1 普通班已提交但无工资的 2 节课明细 ===');
  const d1 = await q(`
    SELECT cl.id, cl."lessonDate", cl.status, cl."attendanceSubmittedAt", cl."hoursDeductedAt",
           g."termId", g."intensiveMode", g."lessonMinutes", c.type course_type,
           (SELECT COUNT(*) FROM "Attendance" a WHERE a."lessonId"=cl.id AND a."deletedAt" IS NULL) att,
           (SELECT COUNT(*) FROM "HourTransaction" h WHERE h."lessonId"=cl.id AND h."deletedAt" IS NULL) hrs
    FROM "ClassLesson" cl
    JOIN "ClassGroup" g ON g.id=cl."groupId"
    JOIN "Course" c ON c.id=g."courseId"
    WHERE cl."deletedAt" IS NULL AND cl."attendanceSubmittedAt" IS NOT NULL
      AND g."intensiveMode" <> 'INTENSIVE'
      AND NOT EXISTS (SELECT 1 FROM "TeacherSalaryTransaction" t
                      WHERE t."lessonPayKey"=cl.id AND t.type='LESSON_PAY' AND t."deletedAt" IS NULL)
  `);
  console.table(d1);

  console.log('\n=== D2 HourTransaction 类型总览（全量，未删） ===');
  const d2 = await q(`
    SELECT type, COUNT(*)::int n, ROUND(SUM(amount)::numeric,2) sum_amt,
           COUNT(*) FILTER (WHERE "lessonId" IS NULL) no_lesson
    FROM "HourTransaction" WHERE "deletedAt" IS NULL GROUP BY 1 ORDER BY n DESC
  `);
  console.table(d2);

  console.log('\n=== D3 抽 3 节 APPROVED 突击班：考勤 hoursDeducted / 报名余额 / 课时流水 ===');
  const d3 = await q(`
    SELECT cl.id, cl."actualMinutes",
           (SELECT COUNT(*) FROM "Attendance" a WHERE a."lessonId"=cl.id AND a."deletedAt" IS NULL) att,
           (SELECT COUNT(*) FROM "Attendance" a WHERE a."lessonId"=cl.id AND a."deletedAt" IS NULL AND a."hoursDeducted">0) deducted_att,
           (SELECT ROUND(SUM(a."hoursDeducted")::numeric,2) FROM "Attendance" a WHERE a."lessonId"=cl.id AND a."deletedAt" IS NULL) ded_sum,
           (SELECT COUNT(*) FROM "HourTransaction" h WHERE h."lessonId"=cl.id) hrs_by_lesson,
           (SELECT COUNT(*) FROM "TeacherSalaryTransaction" t WHERE t."lessonPayKey"=cl.id AND t."deletedAt" IS NULL) pay
    FROM "ClassLesson" cl
    JOIN "ClassGroup" g ON g.id=cl."groupId"
    WHERE g."intensiveMode"='INTENSIVE' AND cl."intensiveReviewStatus"='APPROVED' AND cl."deletedAt" IS NULL
    ORDER BY cl."lessonDate" DESC LIMIT 3
  `);
  console.table(d3);

  console.log('\n=== D4 上述 3 节课学生报名与课时流水（按 enrollmentId 关联） ===');
  const ids = d3.map(r => `'${r.id}'`).join(',');
  const d4 = await q(`
    SELECT a."lessonId", a."studentId", a.status, a."hoursDeducted",
           e."totalHours", e."remainHours", e."usedHours",
           (SELECT COUNT(*) FROM "HourTransaction" h WHERE h."enrollmentId"=e.id AND h."deletedAt" IS NULL) tx_on_enroll
    FROM "Attendance" a
    LEFT JOIN "Enrollment" e ON e.id=a."enrollmentId"
    WHERE a."lessonId" IN (${ids}) AND a."deletedAt" IS NULL
    ORDER BY a."lessonId", a."studentId" LIMIT 30
  `);
  console.table(d4);

  console.log('\n=== D5 突击班 APPROVED 课次审批时间分布（判断是否早于 accrue 代码上线） ===');
  const d5 = await q(`
    SELECT MIN(cl."lessonDate")::date earliest, MAX(cl."lessonDate")::date latest,
           COUNT(*)::int n,
           COUNT(*) FILTER (WHERE cl."actualMinutes" IS NULL) no_minutes
    FROM "ClassLesson" cl JOIN "ClassGroup" g ON g.id=cl."groupId"
    WHERE g."intensiveMode"='INTENSIVE' AND cl."intensiveReviewStatus"='APPROVED' AND cl."deletedAt" IS NULL
  `);
  console.table(d5);

  console.log('\n=== D6 突击班报名 totalHours 口径：0（累计制）vs >0（预付费） ===');
  const d6 = await q(`
    SELECT COUNT(*) FILTER (WHERE e."totalHours"<=0) accrual_enroll,
           COUNT(*) FILTER (WHERE e."totalHours">0) prepaid_enroll
    FROM "Enrollment" e
    JOIN "ClassGroup" g ON g.id=e."groupId"
    WHERE g."intensiveMode"='INTENSIVE' AND e.status='ACTIVE' AND e."deletedAt" IS NULL
  `);
  console.table(d6);
})().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error('ERR', e.message.slice(0, 300));
  await prisma.$disconnect();
});
