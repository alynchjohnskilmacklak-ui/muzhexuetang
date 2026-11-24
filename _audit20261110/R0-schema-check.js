const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const out = {};
async function q(name, sql) {
  try { out[name] = await p.$queryRawUnsafe(sql); }
  catch (e) { out[name] = { ERROR: e.message.split('\n').slice(-3).join(' | ') }; }
}
(async () => {
  await q('migrationsTable', `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_name = '_prisma_migrations'`);
  await q('masteryCols', `SELECT column_name FROM information_schema.columns WHERE table_name = 'MasteryRecord' ORDER BY ordinal_position`);
  await q('masteryIdx', `SELECT indexname FROM pg_indexes WHERE tablename = 'MasteryRecord'`);
  await q('masteryRows', `SELECT COUNT(*)::int AS n FROM "MasteryRecord"`);
  await q('weaknessRows', `SELECT COUNT(*)::int AS n FROM "WeaknessRecord"`);
  await q('vocab', `SELECT (SELECT COUNT(*)::int FROM "VocabProgress") AS progress, (SELECT COUNT(*)::int FROM "VocabSession") AS sessions, (SELECT COUNT(DISTINCT "studentId")::int FROM "VocabProgress") AS students`);
  await q('notifCols', `SELECT column_name FROM information_schema.columns WHERE table_name = 'Notification' ORDER BY ordinal_position`);
  await q('notifTotal', `SELECT COUNT(*)::int AS total FROM "Notification"`);
  await q('fileAssetFk', `SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE "feedbackId" IS NOT NULL)::int AS fb, COUNT(*) FILTER (WHERE "studentId" IS NOT NULL)::int AS st FROM "FileAsset"`);
  await q('vocabSetCols', `SELECT column_name FROM information_schema.columns WHERE table_name LIKE 'Vocab%%' ORDER BY table_name, ordinal_position`);
  await q('vocabTables', `SELECT table_name FROM information_schema.tables WHERE table_name ILIKE 'Vocab%'`);
  await q('hourTx', `SELECT type, COUNT(*)::int AS n, SUM(amount)::float AS sum FROM "HourTransaction" GROUP BY type ORDER BY n DESC`);
  await q('leaveReq', `SELECT status, COUNT(*)::int AS n FROM "LeaveRequest" GROUP BY status`);
  console.log(JSON.stringify(out, (k, v) => (typeof v === 'bigint' ? Number(v) : v), 2));
  await p.$disconnect();
})().catch(async (e) => { console.error('FATAL:', e.message); try { await p.$disconnect(); } catch (e2) {} process.exit(1); });
