/* P2 只读审计 补充 SQL */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const q = (sql) => prisma.$queryRawUnsafe(sql);

(async () => {
  console.log('\=== W1. WeaknessRecord 行来源 ===');
  console.table(await q(`
    SELECT id, "studentId", topic, "paperId" IS NOT NULL has_paper, "paperId"
    FROM "WeaknessRecord" LIMIT 10
  `));

  console.log('\=== P3. PracticeResult 学生 vs PracticeAttempt 学生差集 ===');
  console.table(await q(`
    SELECT 'result_only' kind, r."studentId", COUNT(*)::int n
    FROM "PracticeResult" r
    WHERE NOT EXISTS (SELECT 1 FROM "PracticeAttempt" a WHERE a."studentId"=r."studentId")
    GROUP BY 2
    UNION ALL
    SELECT 'attempt_only', a."studentId", COUNT(*)::int
    FROM "PracticeAttempt" a
    WHERE NOT EXISTS (SELECT 1 FROM "PracticeResult" r WHERE r."studentId"=a."studentId")
    GROUP BY 2
    ORDER BY 1,2
  `));

  console.log('\=== M5. DELETED 状态但 deletedAt 为空的资料（数据一致性） ===');
  console.table(await q(`
    SELECT id, title, audience, status, "deletedAt" IS NULL null_deleted_at, "createdAt"::date created
    FROM "StudyMaterial" WHERE status='DELETED' AND "deletedAt" IS NULL LIMIT 20
  `));

  await prisma.$disconnect();
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
