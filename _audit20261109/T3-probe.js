const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const r = await p.$queryRawUnsafe(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_name IN ('FileAsset','StudyHallClassRecord','StudyHallHomeworkEntry','Attendance')
    ORDER BY table_name, ordinal_position
  `);
  for (const row of r) console.log(row.table_name, '|', row.column_name);
  await p.$disconnect();
})().catch(e => { console.error(e.message); process.exit(1); });
