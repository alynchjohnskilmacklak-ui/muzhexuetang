// R2 第二轮只读抽样
import { createRequire } from 'node:module'
const require = createRequire('D:/01muzhexuetang/muzhexuetang/coding/edu-manage/package.json')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const q = async (label, sql) => {
  try {
    const rows = await prisma.$queryRawUnsafe(sql)
    console.log(`\n## ${label}`); console.table(rows)
  } catch (e) { console.log(`\n## ${label} -> ERROR: ${e.message}`) }
}

await q('legacy 已读且无回执的反馈数（家长端会被渲染成未读）', `
  SELECT COUNT(*) AS legacy_read_no_receipt
  FROM "ClassroomFeedback" f
  WHERE f."parentReadAt" IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM "FeedbackParentReadReceipt" r WHERE r."feedbackId"=f.id)`)

await q('回执覆盖：有回执的反馈数 / 其中 readAt 为空', `
  SELECT COUNT(DISTINCT "feedbackId") AS receipts_feedback,
    COUNT(*) FILTER (WHERE "readAt" IS NULL) AS receipt_unread_rows
  FROM "FeedbackParentReadReceipt"`)

await q('INACTIVE/软删学员关联的反馈（history where 不过滤状态）', `
  SELECT s.status, COUNT(DISTINCT f.id) AS feedbacks
  FROM "ClassroomFeedback" f
  JOIN "Student" s ON s.id = ANY(f."studentIds")
  WHERE s.status <> 'ACTIVE' OR s."deletedAt" IS NOT NULL
  GROUP BY s.status`)

await q('通知残留：归属 INACTIVE/软删学员的未读通知', `
  SELECT COUNT(*) AS orphan_unread
  FROM "Notification" n
  JOIN "Student" s ON s.id = n."studentId"
  WHERE n.read=false AND (s.status='INACTIVE' OR s."deletedAt" IS NOT NULL)`)

await q('VocabSession 时间分布', `
  SELECT "studentId", grade, volume, total, correct, "finishedAt"
  FROM "VocabSession" ORDER BY "finishedAt" DESC LIMIT 10`)

await q('待审批请假单与其当日考勤状态', `
  SELECT lr.id, lr.status, lr."leaveDate", a.status AS attendance_status
  FROM "LeaveRequest" lr
  LEFT JOIN "Attendance" a ON a."studentId"=lr."studentId" AND a."lessonId" IS NOT NULL
  WHERE lr.status='pending' ORDER BY lr."createdAt" DESC LIMIT 20`)

await q('ABSENT 考勤中已批准请假可对照的记录', `
  SELECT a.status, COUNT(*) FROM "Attendance" a WHERE a.status='ABSENT' GROUP BY a.status`)

await q('评价未闭环：PENDING/IN_PROGRESS 评价及其反馈学部', `
  SELECT e.id, e.satisfied, e."reviewStatus", f.status AS feedback_status, f."deletedAt" IS NOT NULL AS feedback_deleted
  FROM "ParentClassroomFeedbackEvaluation" e
  LEFT JOIN "ClassroomFeedback" f ON f.id=e."feedbackId"`)

await prisma.$disconnect()
