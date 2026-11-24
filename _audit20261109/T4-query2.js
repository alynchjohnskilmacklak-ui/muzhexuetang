const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const q = (s) => prisma.$queryRawUnsafe(s);
(async () => {
  const a = await q(`
    SELECT cl.status, g."intensiveMode", COUNT(*)::int total,
           COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "ClassLessonStudent" s WHERE s."lessonId"=cl.id)) empty
    FROM "ClassLesson" cl JOIN "ClassGroup" g ON g.id=cl."groupId"
    WHERE cl."deletedAt" IS NULL
    GROUP BY 1,2 ORDER BY 1,2
  `);
  console.table(a);

  const b = await q(`
    SELECT w.id, w.topic, w."mistakeCount", w."paperId", s.id sid, s.name, s.status, s."deletedAt"
    FROM "WeaknessRecord" w LEFT JOIN "Student" s ON s.id=w."studentId"
  `);
  console.table(b);

  const c = await q(`
    SELECT e."eventType", e."recipientCount", e."notificationCount", n."pushStatus", n.read
    FROM "CourseChangeEvent" e
    LEFT JOIN "Notification" n ON n."relatedType"='COURSE_CHANGE_EVENT' AND n."relatedId"=e.id
  `);
  console.table(c);

  const d = await q(`
    SELECT COUNT(*)::int scheduled_total,
           COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "ClassLessonStudent" s WHERE s."lessonId"=cl.id)) scheduled_empty
    FROM "ClassLesson" cl JOIN "ClassGroup" g ON g.id=cl."groupId"
    WHERE cl."deletedAt" IS NULL AND cl.status='SCHEDULED'
  `);
  console.table(d);
})().then(() => prisma.$disconnect()).catch(async (e) => { console.error('ERR', e.message.slice(0,300)); await prisma.$disconnect(); });
