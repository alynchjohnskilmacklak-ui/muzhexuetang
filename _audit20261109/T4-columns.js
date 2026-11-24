const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_name IN ('MasteryRecord','WeaknessRecord','LearningGoal','StageSummary','CourseChangeEvent')
    ORDER BY table_name, ordinal_position
  `);
  for (const r of rows) console.log(r.table_name, '|', r.column_name);
})().then(() => prisma.$disconnect()).catch(async (e) => { console.error('ERR', e.message.slice(0,300)); await prisma.$disconnect(); });
