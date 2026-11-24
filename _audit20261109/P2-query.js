/* P2 只读审计：家长端 作业/练习/背单词/资料 基线 SQL
 * 仅 SELECT；不写库、不迁移、不碰 3000 端口。
 * 运行：$env:NODE_PATH="D:\01muzhexuetang\muzhexuetang\coding\edu-manage\node_modules"; node P2-query.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const q = (sql) => prisma.$queryRawUnsafe(sql);

(async () => {
  console.log('\n=== H1. HomeworkAssignment 状态分布 ===');
  console.table(await q(`
    SELECT status, COUNT(*)::int n FROM "HomeworkAssignment" GROUP BY 1 ORDER BY 1
  `));

  console.log('\n=== H2. HomeworkSubmission 状态分布 / 批改字段 ===');
  console.table(await q(`
    SELECT status, COUNT(*)::int n,
           COUNT(*) FILTER (WHERE score IS NOT NULL) with_score,
           COUNT(*) FILTER (WHERE "teacherComment" IS NOT NULL AND "teacherComment" <> '') with_comment
    FROM "HomeworkSubmission" GROUP BY 1 ORDER BY 1
  `));

  console.log('\n=== P1. PracticeAttempt / PracticeResult / MasteryRecord / WeaknessRecord 行数对照 ===');
  console.table(await q(`
    SELECT 'PracticeAttempt' t, COUNT(*)::int n, COUNT(DISTINCT "studentId")::int students FROM "PracticeAttempt"
    UNION ALL
    SELECT 'PracticeResult', COUNT(*)::int, COUNT(DISTINCT "studentId")::int FROM "PracticeResult"
    UNION ALL
    SELECT 'MasteryRecord', COUNT(*)::int, COUNT(DISTINCT "studentId")::int FROM "MasteryRecord"
    UNION ALL
    SELECT 'WeaknessRecord', COUNT(*)::int, COUNT(DISTINCT "studentId")::int FROM "WeaknessRecord"
    ORDER BY 1
  `));

  console.log('\n=== P2. PracticeAttempt 按学生/题组明细（前 20） ===');
  console.table(await q(`
    SELECT "studentId", COUNT(*)::int attempts, SUM(score)::int correct, SUM(total)::int total,
           MAX("finishedAt")::date last_at
    FROM "PracticeAttempt" GROUP BY 1 ORDER BY MAX("finishedAt") DESC NULLS LAST LIMIT 20
  `));

  console.log('\n=== V1. VocabProgress / VocabSession 行数与学生数 ===');
  console.table(await q(`
    SELECT 'VocabProgress' t, COUNT(*)::int n, COUNT(DISTINCT "studentId")::int students FROM "VocabProgress"
    UNION ALL
    SELECT 'VocabSession', COUNT(*)::int, COUNT(DISTINCT "studentId")::int FROM "VocabSession"
    ORDER BY 1
  `));

  console.log('\n=== V2. VocabSession 明细（学生/时间/对错） ===');
  console.table(await q(`
    SELECT "studentId", COUNT(*)::int sessions, SUM(total)::int words, SUM(correct)::int correct,
           MAX("finishedAt")::date last_at
    FROM "VocabSession" GROUP BY 1 ORDER BY MAX("finishedAt") DESC NULLS LAST
  `));

  console.log('\n=== V3. VocabProgress 状态分布 ===');
  console.table(await q(`
    SELECT status, COUNT(*)::int n, COUNT(DISTINCT "studentId")::int students FROM "VocabProgress" GROUP BY 1 ORDER BY 1
  `));

  console.log('\n=== M1. StudyMaterial 状态 × deletedAt 分布 ===');
  console.table(await q(`
    SELECT status,
           COUNT(*) FILTER (WHERE "deletedAt" IS NULL)::int alive,
           COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL)::int deleted,
           COUNT(*)::int total
    FROM "StudyMaterial" GROUP BY 1 ORDER BY 1
  `));

  console.log('\n=== M2. StudyMaterial audience 分布（仅未软删） ===');
  console.table(await q(`
    SELECT audience, COUNT(*)::int n FROM "StudyMaterial"
    WHERE "deletedAt" IS NULL GROUP BY 1 ORDER BY 1
  `));

  console.log('\n=== M3. 家长端可见口径计数（PUBLISHED + audience STUDENT/BOTH），主列表是否漏 deletedAt ===');
  console.table(await q(`
    SELECT
      COUNT(*) FILTER (WHERE status='PUBLISHED' AND audience IN ('STUDENT','BOTH'))::int parent_visible,
      COUNT(*) FILTER (WHERE status='PUBLISHED' AND audience IN ('STUDENT','BOTH') AND "deletedAt" IS NOT NULL)::int visible_but_softdeleted,
      COUNT(*) FILTER (WHERE status='PUBLISHED' AND audience IN ('TEACHER'))::int teacher_only
    FROM "StudyMaterial"
  `));

  console.log('\n=== M4. StudyMaterial downloads 非零记录（预览/下载写动作佐证） ===');
  console.table(await q(`
    SELECT COUNT(*) FILTER (WHERE downloads > 0)::int with_downloads,
           COALESCE(SUM(downloads),0)::int total_downloads,
           COUNT(*)::int total
    FROM "StudyMaterial" WHERE status <> 'DELETED'
  `));

  await prisma.$disconnect();
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
