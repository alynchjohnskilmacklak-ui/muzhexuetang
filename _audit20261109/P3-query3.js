const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const q = (s) => prisma.$queryRawUnsafe(s);
(async () => {
  console.table(await q(`
    SELECT COUNT(*)::int lessons,
           COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "ClassLessonStudent" cls WHERE cls."lessonId"=l.id)) with_roster,
           COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "ClassLessonStudent" cls WHERE cls."lessonId"=l.id)) no_roster,
           COUNT(DISTINCT cls."studentId") roster_students
    FROM "ClassLesson" l
    JOIN "ClassGroup" g ON g.id=l."groupId"
    LEFT JOIN "ClassLessonStudent" cls ON cls."lessonId"=l.id
    WHERE g."intensiveMode"='INTENSIVE' AND l."deletedAt" IS NULL
  `));
  console.table(await q(`
    SELECT e."studentId", s.name, COUNT(DISTINCT e."groupId") groups
    FROM "Enrollment" e JOIN "Student" s ON s.id=e."studentId"
    JOIN "ClassGroup" g ON g.id=e."groupId"
    WHERE g."intensiveMode"='INTENSIVE' AND e.status='ACTIVE' AND e."deletedAt" IS NULL
    GROUP BY 1,2 ORDER BY 3 DESC
  `));
  console.table(await q(`
    SELECT COUNT(*)::int closures FROM "StudyHallClosure"
  `));
  console.table(await q(`
    SELECT COUNT(*)::int parent_choices, COUNT(DISTINCT c."studentId") students,
           COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "StudentMealAttendance" m WHERE m."studentId"=c."studentId" AND DATE(m."mealDate")=DATE(c."choiceDate"))) no_attendance_row
    FROM "ParentMealChoice" c
  `));
})().catch(e=>{console.error(e);process.exit(1)}).finally(()=>prisma.$disconnect());
