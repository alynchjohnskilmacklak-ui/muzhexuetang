const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      count(*) AS total,
      count("feedbackId") AS feedback_id,
      count("postId") AS post_id,
      count("lessonId") AS lesson_id,
      count("ownerId") AS owner_id,
      count("studentId") AS student_id,
      count("uploadedById") AS uploaded_by_id
    FROM "FileAsset"
  `);
  const num = (v) => Number(v);
  const norm = (r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'bigint' ? num(v) : v]));
  console.log('=== FileAsset 整体外键填充率 ===');
  console.log(JSON.stringify(rows.map(norm), null, 2));
  const byOwner = await prisma.$queryRawUnsafe(`
    SELECT "ownerType", count(*) AS n, count("studentId") AS student_id
    FROM "FileAsset" GROUP BY "ownerType" ORDER BY n DESC
  `);
  console.log('=== 按 ownerType 的 studentId 填充 ===');
  console.log(JSON.stringify(byOwner.map(norm), null, 2));
  await prisma.$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
