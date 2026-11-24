/* T2 补充只读查询：讲义材料分布、反馈图片断链、回执与通知抽样。仅 SELECT。 */
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
  await show('R1 课次讲义 StudyMaterial(isLessonPreview) 分布', `
    SELECT status, audience, COUNT(*)::int n,
           COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) deleted
    FROM "StudyMaterial" WHERE "isLessonPreview" = true
    GROUP BY 1,2 ORDER BY 1,2`)

  await show('R2 反馈图片断链：imageUrls 中找不到 FileAsset 的键（已发布未删除）', `
    WITH refs AS (
      SELECT f.id, unnest(f."imageUrls") AS key
      FROM "ClassroomFeedback" f
      WHERE f.status='PUBLISHED' AND f."deletedAt" IS NULL AND cardinality(f."imageUrls") > 0
    )
    SELECT COUNT(*)::int total_refs,
           COUNT(*) FILTER (WHERE a.id IS NULL) broken_refs
    FROM refs LEFT JOIN "FileAsset" a
      ON a."deletedAt" IS NULL AND (a."storageKey" = refs.key OR a.url = refs.key)`)

  await show('R3 已发布反馈带图数量', `
    SELECT COUNT(*)::int published,
           COUNT(*) FILTER (WHERE cardinality("imageUrls") > 0) with_images,
           SUM(cardinality("imageUrls"))::int image_refs
    FROM "ClassroomFeedback" WHERE status='PUBLISHED' AND "deletedAt" IS NULL`)

  await show('R4 撤销/归档反馈计数', `
    SELECT status, "deletedAt" IS NULL alive, COUNT(*)::int n
    FROM "ClassroomFeedback" GROUP BY 1,2 ORDER BY 1,2`)

  await show('R5 FEEDBACK_REVIEW 通知落点抽样', `
    SELECT n.id, n."relatedType", n."relatedId", n.href, n."readAt" IS NOT NULL read
    FROM "Notification" n WHERE n.type='FEEDBACK_REVIEW' ORDER BY n."createdAt" DESC LIMIT 5`)

  await show('R6 回执覆盖：已发布反馈中有回执/已读的数量', `
    SELECT COUNT(*)::int published,
           COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "FeedbackParentReadReceipt" r WHERE r."feedbackId"=f.id)) with_receipt,
           COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "FeedbackParentReadReceipt" r WHERE r."feedbackId"=f.id AND r."readAt" IS NOT NULL)) read,
           COUNT(*) FILTER (WHERE f."parentReadAt" IS NOT NULL) legacy_parent_read_at
    FROM "ClassroomFeedback" f WHERE f.status='PUBLISHED' AND f."deletedAt" IS NULL`)

  await prisma.$disconnect()
  console.log('\nDONE')
})().catch(async (e) => { console.error('ERR ' + (e && e.message)); await prisma.$disconnect(); process.exit(1) })
