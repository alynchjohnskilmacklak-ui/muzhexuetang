const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const out = {};
async function q(name, sql) { try { out[name] = await p.$queryRawUnsafe(sql); } catch (e) { out[name] = { ERROR: e.message.split('\n').slice(-3).join(' | ') }; } }
(async () => {
  await q('vocabWordTotal', `SELECT COUNT(*)::int AS n FROM "VocabWord"`);
  await q('vocabWordByGrade', `SELECT grade, COUNT(*)::int AS n, COUNT(DISTINCT volume)::int AS vols, COUNT(DISTINCT unit)::int AS units FROM "VocabWord" GROUP BY grade ORDER BY grade`);
  await q('vocabWordDup', `SELECT COUNT(*)::int AS dup_groups FROM (SELECT grade, volume, unit, normalizedHeadword, COUNT(*) c FROM "VocabWord" GROUP BY 1,2,3,4 HAVING COUNT(*) > 1) t`);
  await q('vocabPosNull', `SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE meanings IS NULL OR meanings::text = '[]')::int AS empty_meanings, COUNT(*) FILTER (WHERE phonetic IS NULL OR phonetic = '')::int AS no_phonetic FROM "VocabWord"`);
  await q('notifStudentIdNull', `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE "studentId" IS NULL)::int AS null_student FROM "Notification"`);
  await q('notifRecent7d', `SELECT COUNT(*)::int AS n FROM "Notification" WHERE "createdAt" > now() - interval '7 days'`);
  await q('hourRecent3d', `SELECT type, COUNT(*)::int AS n FROM "HourTransaction" WHERE "createdAt" > now() - interval '3 days' GROUP BY type`);
  await q('masteryRecent', `SELECT COUNT(*)::int AS n FROM "MasteryRecord" WHERE "createdAt" > now() - interval '3 days'`);
  await q('salaryRecent', `SELECT type, COUNT(*)::int AS n FROM "TeacherSalaryTransaction" WHERE "createdAt" > now() - interval '3 days' GROUP BY type`);
  await q('enrollBalance', `SELECT COUNT(*)::int AS enroll_active, SUM("remainHours")::float AS sum_remain FROM "Enrollment" WHERE status NOT IN ('WITHDRAWN','CANCELLED')`);
  await q('studentSnapshot', `SELECT COUNT(*)::int AS n, SUM("remainHours")::float AS sum FROM "Student" WHERE "deletedAt" IS NULL`);
  console.log(JSON.stringify(out, (k, v) => (typeof v === 'bigint' ? Number(v) : v), 2));
  await p.$disconnect();
})().catch(async (e) => { console.error('FATAL:', e.message); try { await p.$disconnect(); } catch (e2) {} process.exit(1); });
