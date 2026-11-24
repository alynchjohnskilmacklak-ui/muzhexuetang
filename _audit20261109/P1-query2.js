/* P1 只读审计 第二轮：细化回执口径、孤儿反馈、通知指向、picks 表复核。仅 SELECT。 */
const fs = require('fs')
const { PrismaClient } = require('D:/01muzhexuetang/muzhexuetang/coding/edu-manage/node_modules/@prisma/client')

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
  await show('Q3c 回执真实行数（COUNT(r.id)，剔除 LEFT JOIN 空行）', `
    SELECT COUNT(r."feedbackId")::int receipt_rows,
           COUNT(r."feedbackId") FILTER (WHERE r."readAt" IS NOT NULL)::int receipt_rows_read,
           COUNT(r."feedbackId") FILTER (WHERE r."readAt" IS NULL)::int receipt_rows_unread,
           COUNT(DISTINCT r."feedbackId")::int feedbacks_with_receipt,
           COUNT(DISTINCT r."parentUserId")::int parents_with_receipt,
           COUNT(DISTINCT f.id)::int published
    FROM "ClassroomFeedback" f
    LEFT JOIN "FeedbackParentReadReceipt" r ON r."feedbackId"=f.id
    WHERE f.status='PUBLISHED' AND f."deletedAt" IS NULL`)

  await show('Q3d 回执多家长/重复情况', `
    SELECT per_feedback, COUNT(*)::int feedbacks FROM (
      SELECT "feedbackId", COUNT(*)::int per_feedback
      FROM "FeedbackParentReadReceipt" GROUP BY 1
    ) t GROUP BY 1 ORDER BY 1`)

  await show('Q2b 缺家长归属的反馈抽样 10 条', `
    SELECT f.id, f."teacherId", array_length(f."studentIds",1) students, f."createdAt"
    FROM "ClassroomFeedback" f
    WHERE f.status='PUBLISHED' AND f."deletedAt" IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM unnest(f."studentIds") x
        JOIN "Student" st ON st.id=x
        WHERE COALESCE(st."parentId", st."parentUserId") IS NOT NULL
      )
    ORDER BY f."createdAt" DESC LIMIT 10`)

  await show('Q2c 缺家长归属的 2 名学员', `
    SELECT s.id, s.name, s."parentId", s."parentUserId", s.status, s."deletedAt"
    FROM "Student" s
    WHERE COALESCE(s."parentId", s."parentUserId") IS NULL AND s.status <> 'INACTIVE' AND s."deletedAt" IS NULL`)

  await show('Q9b 通知指向缺失反馈的状态分布', `
    SELECT COALESCE(f.status,'NO_ROW') feedback_status,
           COUNT(*) FILTER (WHERE f."deletedAt" IS NOT NULL)::int deleted,
           COUNT(*)::int n
    FROM "Notification" n
    LEFT JOIN "ClassroomFeedback" f ON f.id=n."relatedId"
    WHERE n.type='CLASSROOM_FEEDBACK' AND f.id IS NULL
    GROUP BY 1`)

  await show('Q7c ClassroomPick 表复核（总行数 / 教师 / 课次）', `
    SELECT COUNT(*)::int total_picks,
           COUNT(DISTINCT "studentId")::int students,
           COUNT(DISTINCT "lessonId")::int lessons,
           COUNT(DISTINCT "teacherId")::int teachers,
           COUNT(*) FILTER (WHERE "parentVisible")::int visible
    FROM "ClassroomPick"`)

  await show('Q7d 近30天课堂互动相关记录：Attendance rollCall 粗查', `
    SELECT COUNT(*)::int attendance_rows,
           COUNT(*) FILTER (WHERE "rollCallStatus" IS NOT NULL)::int roll_call_rows,
           COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '30 days')::int last30d
    FROM "Attendance"`)

  await show('Q5c 评价明细 1 条', `
    SELECT e.id, e."feedbackId", e."parentUserId", e.satisfied,
           LEFT(COALESCE(e.reason,''),60) reason, e."reviewStatus",
           e."reviewedAt", f.status feedback_status
    FROM "ParentClassroomFeedbackEvaluation" e
    LEFT JOIN "ClassroomFeedback" f ON f.id=e."feedbackId"`)

  await show('Q12 反馈正文 imageUrls 与 FileAsset 字段一致性（抽样前5）', `
    SELECT f.id, f."imageUrls",
      array_agg(DISTINCT fa."ownerType") FILTER (WHERE fa.id IS NOT NULL)::text[] owners
    FROM "ClassroomFeedback" f
    LEFT JOIN "FileAsset" fa ON fa."deletedAt" IS NULL
      AND (fa."storageKey" = ANY(f."imageUrls") OR fa.url = ANY(f."imageUrls"))
    WHERE f.status='PUBLISHED' AND f."deletedAt" IS NULL AND array_length(f."imageUrls",1)>0
    GROUP BY 1,2 ORDER BY f."createdAt" DESC LIMIT 5`)

  await show('Q13 家长留言 ParentMessage 与反馈归属', `
    SELECT COUNT(*)::int messages,
           COUNT(DISTINCT m."feedbackId")::int feedbacks_with_msg,
           COUNT(*) FILTER (WHERE f.id IS NULL)::int orphan_msg,
           COUNT(*) FILTER (WHERE f.status <> 'PUBLISHED' OR f."deletedAt" IS NOT NULL)::int msg_on_non_published
    FROM "ParentMessage" m
    LEFT JOIN "ClassroomFeedback" f ON f.id=m."feedbackId"`)

  await prisma.$disconnect()
  console.log('\nDONE')
})().catch(async (e) => { console.error('ERR ' + (e && e.message)); await prisma.$disconnect(); process.exit(1) })
