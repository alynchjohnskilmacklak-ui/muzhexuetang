/* T2 只读审计：课堂反馈传导核对。仅 SELECT；不写库、不迁移、不碰 3000 端口。 */
const fs = require('fs')
const { PrismaClient } = require('@prisma/client')

const env = Object.fromEntries(
  fs.readFileSync('D:/01muzhexuetang/muzhexuetang/coding/edu-manage/.env', 'utf8').split(/\r?\n/)
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] })
)
const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } })
const q = (sql) => prisma.$queryRawUnsafe(sql)
const bi = (k, v) => (typeof v === 'bigint' ? Number(v) : v)
const show = async (label, sql) => {
  const rows = await q(sql)
  console.log('\n=== ' + label + ' ===')
  console.log(JSON.stringify(rows, bi, 2))
}

(async () => {
  await show('Q1 ClassroomFeedback 状态分布', `
    SELECT COALESCE(status,'NULL') status, "isSingleSession" single,
           "deletedAt" IS NULL alive, COALESCE(source,'NULL') source, COUNT(*)::int n
    FROM "ClassroomFeedback" GROUP BY 1,2,3,4 ORDER BY 1,2,3,4`)

  await show('Q2 已发布未删除反馈抽样 10 条', `
    SELECT f.id, f."teacherId", f."isSingleSession" single,
           array_length(f."studentIds",1) students,
           array_length(f."imageUrls",1) images,
           f."notifySent" notified,
           f."parentReadAt" IS NOT NULL parent_read_at,
           (SELECT COUNT(*) FROM "FeedbackParentReadReceipt" r WHERE r."feedbackId"=f.id) receipts,
           (SELECT COUNT(*) FROM "FeedbackParentReadReceipt" r WHERE r."feedbackId"=f.id AND r."readAt" IS NOT NULL) receipts_read,
           f."createdAt"
    FROM "ClassroomFeedback" f
    WHERE f.status='PUBLISHED' AND f."deletedAt" IS NULL
    ORDER BY f."createdAt" DESC LIMIT 10`)

  await show('Q3 FileAsset(ownerType=feedback) 挂接情况', `
    SELECT COUNT(*)::int total,
      COUNT(*) FILTER (WHERE "feedbackId" IS NOT NULL) linked_by_fk,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM "ClassroomFeedback" f WHERE f."deletedAt" IS NULL
          AND (f."imageUrls" && ARRAY[fa."storageKey", fa.url]))) linked_by_url,
      COUNT(*) FILTER (WHERE NOT EXISTS (
        SELECT 1 FROM "ClassroomFeedback" f WHERE f."deletedAt" IS NULL
          AND (f."imageUrls" && ARRAY[fa."storageKey", fa.url]))) orphan_by_url,
      COUNT(*) FILTER (WHERE "visibility"='TEACHER_VISIBLE') teacher_visible,
      COUNT(*) FILTER (WHERE "uploadedByRole"='teacher') by_teacher
    FROM "FileAsset" fa WHERE fa."ownerType"='feedback' AND fa."deletedAt" IS NULL`)

  await show('Q3b 孤儿反馈图片抽样 10 条', `
    SELECT fa.id, fa."originalName", fa."uploadedByRole" role, fa."uploadedById",
           fa."createdAt", fa."feedbackId"
    FROM "FileAsset" fa
    WHERE fa."ownerType"='feedback' AND fa."deletedAt" IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM "ClassroomFeedback" f WHERE f."deletedAt" IS NULL
          AND (f."imageUrls" && ARRAY[fa."storageKey", fa.url]))
    ORDER BY fa."createdAt" DESC LIMIT 10`)

  await show('Q4 FeedbackRewardRecord isActive × 反馈状态', `
    SELECT COALESCE(r."isActive",false) active,
           COALESCE(f.status,'NO_FEEDBACK') feedback_status,
           COUNT(*)::int n,
           COUNT(*) FILTER (WHERE f."deletedAt" IS NOT NULL) feedback_deleted,
           SUM(COALESCE(r.amount,0))::float8 amount_sum
    FROM "FeedbackRewardRecord" r
    LEFT JOIN "ClassroomFeedback" f ON f.id=r."feedbackId"
    GROUP BY 1,2 ORDER BY 1 DESC,2`)

  await show('Q5 ParentClassroomFeedbackEvaluation 分布', `
    SELECT COALESCE(e."reviewStatus",'NULL') review_status, e.satisfied,
           COALESCE(f.status,'NO_FEEDBACK') feedback_status,
           COUNT(*)::int n,
           COUNT(*) FILTER (WHERE f."deletedAt" IS NOT NULL) feedback_deleted
    FROM "ParentClassroomFeedbackEvaluation" e
    LEFT JOIN "ClassroomFeedback" f ON f.id=e."feedbackId"
    GROUP BY 1,2,3 ORDER BY 1,2,3`)

  await show('Q6 回执与已读投影核对', `
    SELECT f.status, COUNT(*)::int feedbacks,
           COUNT(*) FILTER (WHERE f."parentReadAt" IS NOT NULL) parent_read_at_set,
           COALESCE(SUM(rc.n),0)::int receipts,
           COALESCE(SUM(rc.n_read),0)::int receipts_read
    FROM "ClassroomFeedback" f
    LEFT JOIN (SELECT "feedbackId", COUNT(*) n,
               COUNT(*) FILTER (WHERE "readAt" IS NOT NULL) n_read
               FROM "FeedbackParentReadReceipt" GROUP BY 1) rc ON rc."feedbackId"=f.id
    WHERE f."deletedAt" IS NULL GROUP BY 1 ORDER BY 1`)

  await show('Q4b 奖励台账异常：反馈已删/非发布但记录仍 active', `
    SELECT r."feedbackId", r."teacherId", r."studentId", r.amount, r."isActive",
           f.status feedback_status, f."deletedAt" feedback_deleted
    FROM "FeedbackRewardRecord" r
    LEFT JOIN "ClassroomFeedback" f ON f.id=r."feedbackId"
    WHERE r."isActive" = true AND (f.id IS NULL OR f."deletedAt" IS NOT NULL OR f.status <> 'PUBLISHED')`)

  await show('Q7 草稿口径核对', `
    SELECT 'ClassroomFeedback DRAFT' kind, COUNT(*)::int n FROM "ClassroomFeedback" WHERE status='DRAFT' AND "deletedAt" IS NULL
    UNION ALL SELECT 'DRAFT single-session', COUNT(*)::int FROM "ClassroomFeedback" WHERE status='DRAFT' AND "deletedAt" IS NULL AND "isSingleSession"
    UNION ALL SELECT 'TeacherFeedbackDraft rows', COUNT(*)::int FROM "TeacherFeedbackDraft"`)

  await show('Q8 StageSummary 状态分布', `
    SELECT COALESCE(status,'NULL') status, COUNT(*)::int n,
           COUNT(*) FILTER (WHERE "publishedAt" IS NOT NULL) has_published_at,
           COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) deleted
    FROM "StageSummary" GROUP BY 1 ORDER BY 1`)

  await show('Q9 单次课反馈状态明细', `
    SELECT COALESCE(status,'NULL') status, COUNT(*)::int n,
           COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) deleted,
           COUNT(*) FILTER (WHERE "studentIds" = ARRAY[]::text[]) empty_students
    FROM "ClassroomFeedback" WHERE "isSingleSession" GROUP BY 1 ORDER BY 1`)

  await show('Q10 反馈相关 Notification 类型计数', `
    SELECT COALESCE(type,'NULL') type, COUNT(*)::int n,
           COUNT(*) FILTER (WHERE "readAt" IS NOT NULL) read_n
    FROM "Notification"
    WHERE type IN ('CLASSROOM_FEEDBACK','FEEDBACK_REVIEW','STAGE_SUMMARY')
    GROUP BY 1 ORDER BY 1`)

  await show('Q11 已发布反馈家长可达性粗查', `
    SELECT COUNT(*)::int published,
           COUNT(*) FILTER (WHERE array_length("studentIds",1) IS NULL OR array_length("studentIds",1)=0) empty_students,
           COUNT(*) FILTER (WHERE "notifySent"=false) notify_not_sent
    FROM "ClassroomFeedback" WHERE status='PUBLISHED' AND "deletedAt" IS NULL`)

  await prisma.$disconnect()
  console.log('\nDONE')
})().catch(async (e) => { console.error('ERR ' + (e && e.message)); await prisma.$disconnect(); process.exit(1) })
