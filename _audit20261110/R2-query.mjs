// R2 分片只读抽样：仅 SELECT，不迁移、不写库。
import { createRequire } from 'node:module'
const require = createRequire('D:/01muzhexuetang/muzhexuetang/coding/edu-manage/package.json')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const q = async (label, sql, params = []) => {
  try {
    const rows = await prisma.$queryRawUnsafe(sql, ...params)
    console.log(`\n## ${label}`)
    console.table(rows)
  } catch (e) {
    console.log(`\n## ${label} -> ERROR: ${e.message}`)
  }
}

await q('FileAsset 总量与业务外键空值分布', `
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE "studentId" IS NULL) AS student_null,
    COUNT(*) FILTER (WHERE "lessonId" IS NULL) AS lesson_null,
    COUNT(*) FILTER (WHERE "feedbackId" IS NULL) AS feedback_null,
    COUNT(*) FILTER (WHERE "postId" IS NULL) AS post_null,
    COUNT(*) FILTER (WHERE "studentId" IS NULL AND "lessonId" IS NULL AND "feedbackId" IS NULL AND "postId" IS NULL) AS all_four_null,
    COUNT(*) FILTER (WHERE "createdAt" >= '2026-11-09 00:00:00') AS recent_since_1109,
    COUNT(*) FILTER (WHERE "createdAt" >= '2026-11-09 00:00:00' AND "studentId" IS NULL AND "lessonId" IS NULL AND "feedbackId" IS NULL AND "postId" IS NULL) AS recent_all_null
  FROM "FileAsset"`)

await q('FileAsset ownerType 分布', `
  SELECT "ownerType", COUNT(*) AS n,
    COUNT(*) FILTER (WHERE "feedbackId" IS NULL AND "studentId" IS NULL AND "lessonId" IS NULL AND "postId" IS NULL) AS no_ref
  FROM "FileAsset" GROUP BY "ownerType" ORDER BY n DESC`)

await q('Student 状态/软删/双归属', `
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE status='INACTIVE') AS inactive,
    COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) AS soft_deleted,
    COUNT(*) FILTER (WHERE "parentId" IS NOT NULL AND "parentUserId" IS NOT NULL AND "parentId" <> "parentUserId") AS parent_mismatch,
    COUNT(*) FILTER (WHERE "parentId" IS NOT NULL OR "parentUserId" IS NOT NULL) AS linked
  FROM "Student"`)

await q('ClassLesson 软删/状态分布', `
  SELECT status, COUNT(*) AS n, COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) AS soft_deleted
  FROM "ClassLesson" GROUP BY status ORDER BY n DESC`)

await q('Attendance 软删与状态', `
  SELECT status, COUNT(*) AS n, COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) AS soft_deleted
  FROM "Attendance" GROUP BY status ORDER BY n DESC`)

await q('Vocab 表规模与重复进度', `
  SELECT
    (SELECT COUNT(*) FROM "VocabSession") AS sessions,
    (SELECT COUNT(*) FROM "VocabProgress") AS progress_rows,
    (SELECT COUNT(*) FROM (SELECT "studentId","wordId" FROM "VocabProgress" GROUP BY 1,2 HAVING COUNT(*)>1) t) AS dup_progress`)

await q('Feedback 回执 vs legacy parentReadAt', `
  SELECT
    COUNT(*) AS feedback_total,
    COUNT(*) FILTER (WHERE "parentReadAt" IS NOT NULL) AS legacy_read_set,
    (SELECT COUNT(*) FROM "FeedbackParentReadReceipt") AS receipt_rows,
    (SELECT COUNT(*) FROM "FeedbackParentReadReceipt" WHERE "readAt" IS NULL) AS receipt_unread
  FROM "ClassroomFeedback"`)

await q('legacy 已读但无回执的反馈（口径分叉样本）', `
  SELECT f.id, f.status, f."parentReadAt",
    EXISTS(SELECT 1 FROM "FeedbackParentReadReceipt" r WHERE r."feedbackId"=f.id) AS has_receipt
  FROM "ClassroomFeedback" f
  WHERE f."parentReadAt" IS NOT NULL
  ORDER BY f."parentReadAt" DESC LIMIT 10`)

await q('家长评价评价表分布', `
  SELECT "reviewStatus", COUNT(*) AS n, COUNT(*) FILTER (WHERE satisfied) AS satisfied
  FROM "ParentClassroomFeedbackEvaluation" GROUP BY "reviewStatus"`)

await q('通知未读口径规模', `
  SELECT
    COUNT(*) FILTER (WHERE read=false) AS unread_notification,
    COUNT(*) FILTER (WHERE read=false AND status='ACTIVE' AND "deletedAt" IS NULL) AS unread_active_visible
  FROM "Notification"`)

await q('Enrollment 报名级 remainHours=0 与 Student 快照口径', `
  SELECT
    (SELECT COUNT(*) FROM "Enrollment" WHERE status='ACTIVE' AND "deletedAt" IS NULL AND "remainHours"<=0) AS active_enroll_zero,
    (SELECT COUNT(*) FROM "Enrollment" WHERE status='ACTIVE' AND "deletedAt" IS NULL) AS active_enroll,
    (SELECT COUNT(*) FROM "Student" WHERE status='ACTIVE' AND "deletedAt" IS NULL) AS active_student`)

await prisma.$disconnect()
