const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const q = (sql) => prisma.$queryRawUnsafe(sql);
(async () => {
  const lr = await q(`SELECT id, "studentId", "lessonId", "leaveDate", status,
      "repliedAt", "createdAt"
    FROM "LeaveRequest" WHERE "deletedAt" IS NULL AND status='approved' ORDER BY "repliedAt" DESC NULLS LAST`);
  console.log('批准单:', JSON.stringify(lr));

  for (const r of lr) {
    const rows = await q(`SELECT a.status, COUNT(*)::int n, SUM(a."hoursDeducted")::float sumh, MIN(a."createdAt")::text minc, MAX(a."updatedAt")::text maxu
      FROM "Attendance" a JOIN "ClassLesson" l ON l.id=a."lessonId"
      WHERE a."studentId"='${r.studentId}' AND a."deletedAt" IS NULL
        AND l."lessonDate" >= date_trunc('day','${r.leaveDate}'::timestamp)
        AND l."lessonDate" <  date_trunc('day','${r.leaveDate}'::timestamp) + interval '1 day'
      GROUP BY a.status`);
    console.log(`单 ${r.id} leaveDate=${r.leaveDate} repliedAt=${r.repliedAt} → 当日考勤:`, JSON.stringify(rows));
  }
})().then(() => prisma.$disconnect()).catch(async (e) => { console.error('ERR', e.message.slice(0, 250)); await prisma.$disconnect(); });
