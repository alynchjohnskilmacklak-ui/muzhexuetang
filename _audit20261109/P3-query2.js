const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const q = (sql) => prisma.$queryRawUnsafe(sql);
(async () => {
  console.table(await q(`
    SELECT lr.id leave_id, lr."studentId", s.name student_name,
           DATE(lr."leaveDate") leave_date, lr.status, lr."replyNote",
           a.id attendance_id, a.status att_status, a."actualMinutes", a."hoursDeducted",
           l.id lesson_id, l."lessonDate", l."intensiveReviewStatus"
    FROM "LeaveRequest" lr
    JOIN "Student" s ON s.id = lr."studentId"
    JOIN "Attendance" a ON a."studentId" = lr."studentId" AND a."lessonId" IS NOT NULL
    JOIN "ClassLesson" l ON l.id = a."lessonId"
    WHERE lr.status = 'approved' AND lr."deletedAt" IS NULL AND lr."lessonId" IS NULL
      AND DATE(l."lessonDate") = DATE(lr."leaveDate")
      AND a."deletedAt" IS NULL AND a.status = 'PRESENT'
    ORDER BY lr."leaveDate", s.name
  `));
  console.table(await q(`
    SELECT id, "studentId", DATE("leaveDate") leave_date, status, "replyNote",
           "repliedAt", "lessonId"
    FROM "LeaveRequest" WHERE "deletedAt" IS NULL ORDER BY "createdAt"
  `));
})().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
