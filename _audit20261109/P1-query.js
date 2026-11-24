/* P1 只读审计：家长端反馈/互动传导与越权核对。仅 SELECT；不写库、不迁移、不碰 3000 端口。 */
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
  await show('Q1 ClassroomFeedback 状态 × 删除 × 单次课 分布', `
    SELECT COALESCE(status,'NULL') status,
           COALESCE("isSingleSession",false) single,
           COUNT(*) FILTER (WHERE "deletedAt" IS NULL) alive,
           COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) deleted,
           COUNT(*)::int n
    FROM "ClassroomFeedback" GROUP BY 1,2 ORDER BY 1,2`)

  await show('Q2 已发布反馈的家长映射完整性（学员缺家长归属）', `
    SELECT COUNT(DISTINCT f.id)::int published_feedbacks,
           COUNT(DISTINCT s.id)::int students_in_feedbacks,
           COUNT(DISTINCT s.id) FILTER (WHERE COALESCE(s."parentId", s."parentUserId") IS NULL)::int students_without_parent,
           COUNT(DISTINCT f.id) FILTER (WHERE NOT EXISTS (
             SELECT 1 FROM unnest(f."studentIds") x
             JOIN "Student" st ON st.id=x
             WHERE COALESCE(st."parentId", st."parentUserId") IS NOT NULL
           ))::int feedbacks_all_students_parentless
    FROM "ClassroomFeedback" f
    LEFT JOIN unnest(f."studentIds") x ON true
    LEFT JOIN "Student" s ON s.id=x
    WHERE f.status='PUBLISHED' AND f."deletedAt" IS NULL`)

  await show('Q3 回执覆盖率（已发布反馈 × FeedbackParentReadReceipt）', `
    SELECT COUNT(DISTINCT f.id)::int published,
           COUNT(DISTINCT r."feedbackId")::int feedbacks_with_receipt,
           COUNT(DISTINCT r."feedbackId") FILTER (WHERE r."readAt" IS NOT NULL)::int feedbacks_read,
           COUNT(*) FILTER (WHERE r."readAt" IS NULL)::int receipts_unread,
           COUNT(*)::int receipts_rows,
           COUNT(*) FILTER (WHERE r."readAt" IS NOT NULL)::int receipts_read
    FROM "ClassroomFeedback" f
    LEFT JOIN "FeedbackParentReadReceipt" r ON r."feedbackId"=f.id
    WHERE f.status='PUBLISHED' AND f."deletedAt" IS NULL`)

  await show('Q3b 回执与反馈归属错位抽样（回执指向非已发布/已删反馈）', `
    SELECT r."feedbackId", r."parentUserId",
           f.status feedback_status, f."deletedAt" IS NOT NULL deleted,
           COUNT(*)::int n
    FROM "FeedbackParentReadReceipt" r
    LEFT JOIN "ClassroomFeedback" f ON f.id=r."feedbackId"
    WHERE f.id IS NULL OR f."deletedAt" IS NOT NULL OR f.status <> 'PUBLISHED'
    GROUP BY 1,2,3,4 ORDER BY n DESC LIMIT 10`)

  await show('Q4 三套已读口径核对：legacy parentReadAt vs 回执', `
    SELECT
      COUNT(*) FILTER (WHERE f."parentReadAt" IS NOT NULL)::int legacy_set,
      COUNT(*) FILTER (WHERE f."parentReadAt" IS NULL)::int legacy_null,
      COUNT(DISTINCT r."feedbackId") FILTER (WHERE r."readAt" IS NOT NULL)::int receipt_read,
      COUNT(DISTINCT f.id) FILTER (WHERE f."parentReadAt" IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM "FeedbackParentReadReceipt" rr WHERE rr."feedbackId"=f.id AND rr."readAt" IS NOT NULL
      ))::int legacy_read_but_receipt_not
    FROM "ClassroomFeedback" f
    LEFT JOIN "FeedbackParentReadReceipt" r ON r."feedbackId"=f.id
    WHERE f.status='PUBLISHED' AND f."deletedAt" IS NULL`)

  await show('Q5 评价表分布：reviewStatus × satisfied × 反馈状态', `
    SELECT COALESCE(e."reviewStatus",'NULL') review_status, e.satisfied,
           COALESCE(f.status,'NO_FEEDBACK') feedback_status,
           COUNT(*)::int n,
           COUNT(*) FILTER (WHERE f."deletedAt" IS NOT NULL) feedback_deleted
    FROM "ParentClassroomFeedbackEvaluation" e
    LEFT JOIN "ClassroomFeedback" f ON f.id=e."feedbackId"
    GROUP BY 1,2,3 ORDER BY 1,2,3`)

  await show('Q5b 评价去重约束与教师侧可见性粗查（唯一键 feedbackId+parentUserId）', `
    SELECT "feedbackId", "parentUserId", COUNT(*)::int n
    FROM "ParentClassroomFeedbackEvaluation"
    GROUP BY 1,2 HAVING COUNT(*)>1 ORDER BY n DESC LIMIT 5`)

  await show('Q6 两个不同家长的孩子与反馈可达性对照（页面 where: studentIds hasSome 自己孩子 id）', `
    SELECT COALESCE(s."parentId", s."parentUserId") parent_uid,
           COUNT(DISTINCT s.id)::int kids,
           COUNT(DISTINCT f.id)::int visible_feedbacks
    FROM "Student" s
    LEFT JOIN "ClassroomFeedback" f ON f.status='PUBLISHED' AND f."deletedAt" IS NULL
      AND f."studentIds" @> ARRAY[s.id]
    WHERE COALESCE(s."parentId", s."parentUserId") IS NOT NULL AND s.status <> 'INACTIVE' AND s."deletedAt" IS NULL
    GROUP BY 1 ORDER BY kids DESC, visible_feedbacks DESC LIMIT 10`)

  await show('Q6b 家长-孩子-反馈 对照（重写，避免占位）', `
    SELECT COALESCE(s."parentId", s."parentUserId") parent_uid,
           COUNT(DISTINCT s.id)::int kids,
           COUNT(DISTINCT f.id)::int visible_feedbacks,
           COUNT(DISTINCT f.id) FILTER (WHERE f."isSingleSession" AND array_length(f."studentIds",1)=0)::int single_manual
    FROM "Student" s
    LEFT JOIN "ClassroomFeedback" f ON f.status='PUBLISHED' AND f."deletedAt" IS NULL
      AND f."studentIds" @> ARRAY[s.id]
    WHERE COALESCE(s."parentId", s."parentUserId") IS NOT NULL AND s.status <> 'INACTIVE' AND s."deletedAt" IS NULL
    GROUP BY 1 ORDER BY kids DESC, visible_feedbacks DESC LIMIT 10`)

  await show('Q6c 单次课（studentIds 空）反馈的回执归属（家长直达通道）', `
    SELECT f.id, f."isSingleSession" single,
           COUNT(DISTINCT r."parentUserId")::int recipients,
           COUNT(DISTINCT n."userId")::int notifications
    FROM "ClassroomFeedback" f
    LEFT JOIN "FeedbackParentReadReceipt" r ON r."feedbackId"=f.id
    LEFT JOIN "Notification" n ON n."relatedId"=f.id AND n."relatedType"='CLASSROOM_FEEDBACK'
    WHERE f.status='PUBLISHED' AND f."deletedAt" IS NULL
      AND f."isSingleSession" = true AND array_length(f."studentIds",1)=0
    GROUP BY 1,2 ORDER BY recipients DESC LIMIT 10`)

  await show('Q7 课堂互动 ClassroomPick 分布（parentVisible / result / 近30天）', `
    SELECT COALESCE(result,'NULL') result, "parentVisible",
           COUNT(*)::int n,
           COUNT(*) FILTER (WHERE "createdAt" >= NOW() - INTERVAL '30 days')::int last30d
    FROM "ClassroomPick" GROUP BY 1,2 ORDER BY 1,2`)

  await show('Q7b 近30天 picks 中 parentVisible=false 条数（是否存在隐藏开关未用）', `
    SELECT COUNT(*)::int total,
           COUNT(*) FILTER (WHERE NOT "parentVisible")::int hidden,
           COUNT(DISTINCT "studentId")::int students
    FROM "ClassroomPick" WHERE "createdAt" >= NOW() - INTERVAL '30 days'`)

  await show('Q8 反馈图片一致性：imageUrls 条数 vs FileAsset 挂接', `
    SELECT COUNT(*) FILTER (WHERE array_length(f."imageUrls",1) > 0)::int feedbacks_with_images,
           COALESCE(SUM(array_length(f."imageUrls",1)),0)::int image_url_slots,
           COUNT(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM unnest(f."imageUrls") u
             WHERE NOT EXISTS (
               SELECT 1 FROM "FileAsset" fa WHERE fa."deletedAt" IS NULL
                 AND (fa."storageKey"=u OR fa.url=u OR fa."previewUrl"=u OR fa."thumbnailUrl"=u)
             )
           ))::int feedbacks_with_missing_asset
    FROM "ClassroomFeedback" f
    WHERE f.status='PUBLISHED' AND f."deletedAt" IS NULL`)

  await show('Q9 反馈通知 href/relatedId 完整性', `
    SELECT COUNT(*)::int total,
           COUNT(*) FILTER (WHERE href IS NULL OR href='')::int href_empty,
           COUNT(*) FILTER (WHERE "relatedType"='CLASSROOM_FEEDBACK' AND "relatedId" IS NULL)::int related_null,
           COUNT(*) FILTER (WHERE n."relatedId" IS NOT NULL AND f.id IS NULL)::int related_feedback_missing
    FROM "Notification" n
    LEFT JOIN "ClassroomFeedback" f ON f.id=n."relatedId"
    WHERE n.type='CLASSROOM_FEEDBACK'`)

  await show('Q10 评价通知 FEEDBACK_REVIEW 条数 vs 评价条数', `
    SELECT (SELECT COUNT(*)::int FROM "ParentClassroomFeedbackEvaluation") evaluations,
           (SELECT COUNT(*)::int FROM "Notification" WHERE type='FEEDBACK_REVIEW') review_notifications`)

  await show('Q11 作业登记/练习回传 表行数（家长侧写动作回流核对）', `
    SELECT 'HomeworkCheckin' tbl, COUNT(*)::int n FROM "ClassroomFeedbackHomeworkCheckin"
    UNION ALL SELECT 'PracticeReply', COUNT(*)::int FROM "ClassroomFeedbackPracticeReply"
    UNION ALL SELECT 'ParentMessage', COUNT(*)::int FROM "ParentMessage"`)

  await prisma.$disconnect()
  console.log('\nDONE')
})().catch(async (e) => { console.error('ERR ' + (e && e.message)); await prisma.$disconnect(); process.exit(1) })
