/* E 分片 · 第四轮细化抽样（只读 SELECT） */
const path = require('path')
const fs = require('fs')
const repoRoot = 'D:\\01muzhexuetang\\muzhexuetang\\coding\\edu-manage'
process.chdir(repoRoot)
require(path.join(repoRoot, 'node_modules', 'dotenv')).config({ path: path.join(repoRoot, '.env') })
const { PrismaClient } = require(path.join(repoRoot, 'node_modules', '@prisma/client'))
const prisma = new PrismaClient()
const out = { queries: {} }
async function q(label, sql) { const rows = await prisma.$queryRawUnsafe(sql); out.queries[label] = { sql, rows }; return rows }
async function main() {
  // 185 缺 hoursDeductedAt 课次：按突击模式/审核状态/是否种子课拆分
  const a = await q('Q1_missing_deduct_at_split',
    `SELECT g."intensiveMode"::text, l."intensiveReviewStatus"::text,
            count(*)::int AS n,
            count(*) FILTER (WHERE l.id LIKE 'local-demo-%')::int AS seed_lessons
     FROM "ClassLesson" l LEFT JOIN "ClassGroup" g ON g.id=l."groupId"
     WHERE l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL AND l."hoursDeductedAt" IS NULL
     GROUP BY 1,2 ORDER BY n DESC`)
  // 常规班非种子、已提交、缺 hoursDeductedAt 的课次（真正疑似漏扣）
  const b = await q('Q2_regular_nonseed_missing_deduct',
    `SELECT l.id, l."lessonDate", l.status::text, g."intensiveMode"::text,
            count(a.id)::int AS att_rows,
            count(*) FILTER (WHERE COALESCE(a."hoursDeducted",0)>0)::int AS deducted_rows
     FROM "ClassLesson" l
     LEFT JOIN "ClassGroup" g ON g.id=l."groupId"
     LEFT JOIN "Attendance" a ON a."lessonId"=l.id AND a."deletedAt" IS NULL
     WHERE l."deletedAt" IS NULL AND l."attendanceSubmittedAt" IS NOT NULL AND l."hoursDeductedAt" IS NULL
       AND COALESCE(g."intensiveMode"::text,'') <> 'INTENSIVE' AND l.id NOT LIKE 'local-demo-%'
     GROUP BY l.id, l."lessonDate", l.status, g."intensiveMode"::text
     ORDER BY l."lessonDate" DESC LIMIT 20`)
  // FEEDBACK_BONUS 无 lessonId 是否都有 feedbackId
  const c = await q('Q3_feedback_bonus_refs',
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE "feedbackId" IS NULL)::int AS feedback_null
     FROM "TeacherSalaryTransaction"
     WHERE "deletedAt" IS NULL AND type='FEEDBACK_BONUS' AND "lessonId" IS NULL`)
  // LESSON_PAY 是否全部带 lessonId + termId
  const d = await q('Q4_lesson_pay_refs',
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE "lessonId" IS NULL)::int AS lesson_null,
            count(*) FILTER (WHERE "termId" IS NULL)::int AS term_null
     FROM "TeacherSalaryTransaction"
     WHERE "deletedAt" IS NULL AND type='LESSON_PAY'`)
  const p = path.join('D:\\01muzhexuetang\\muzhexuetang\\coding\\_audit20261108', 'e_sample4_results.json')
  fs.writeFileSync(p, JSON.stringify(out, null, 2), 'utf8')
  console.log('Q1:', JSON.stringify(a))
  console.log('Q2 rows:', b.length)
  console.log('Q3:', JSON.stringify(c))
  console.log('Q4:', JSON.stringify(d))
  console.log('written:', p)
}
main().catch((e) => { console.error('ERR', e); process.exitCode = 1 }).finally(async () => { await prisma.$disconnect() })
