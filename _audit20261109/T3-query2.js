/* T3 二轮只读核对 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const q = (sql) => prisma.$queryRawUnsafe(sql);

(async () => {
  console.log('\n=== Q5.3b 学习厅 5 条目 × 奖励流水逐条核对 ===');
  console.table(await q(`
    SELECT e.id, e."studentId", s.name, e."homeworkStatus", e."attendanceStatus",
           e."createdAt"::timestamp created,
           (SELECT COUNT(*)::int FROM "TeacherSalaryTransaction" t
             WHERE t."feedbackId"=e.id AND t.type='STUDY_HALL_BONUS' AND t."deletedAt" IS NULL) bonus_tx,
           r."classId", c."name" class_name, r."studyDate"::date study_date
    FROM "StudyHallHomeworkEntry" e
    LEFT JOIN "StudyHallClassRecord" r ON r.id=e."classRecordId"
    LEFT JOIN "StudyHallClass" c ON c.id=r."classId"
    LEFT JOIN "Student" s ON s.id=e."studentId"
    ORDER BY r."studyDate", e."createdAt"
  `));

  console.log('\n=== Q5.3c 学习厅 BONUS 流水明细（教师/条目/金额/日期） ===');
  console.table(await q(`
    SELECT t.id, t."teacherId", t."feedbackId" entry_id, t.amount,
           t."lessonDate"::date lesson_date, t.description, t."createdAt"::timestamp created
    FROM "TeacherSalaryTransaction" t
    WHERE t.type IN ('STUDY_HALL_BONUS','STUDY_HALL_ATTENDANCE') AND t."deletedAt" IS NULL
    ORDER BY t.type, t."createdAt"
  `));

  console.log('\n=== Q2.1b 存活资料 受众 × 来源 分布（家长可见性口径） ===');
  console.table(await q(`
    SELECT audience, source, "uploadedByRole", COUNT(*)::int n,
           COUNT(*) FILTER (WHERE "isLessonPreview") lesson_preview
    FROM "StudyMaterial"
    WHERE "deletedAt" IS NULL AND status <> 'DELETED'
    GROUP BY 1,2,3 ORDER BY 1,2,3
  `));

  console.log('\n=== Q2.1c 状态=DELETED 但 deletedAt 为空 的资料（删除口径不一致） ===');
  console.table(await q(`
    SELECT status, COUNT(*) FILTER (WHERE "deletedAt" IS NULL) status_only,
           COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) both_set
    FROM "StudyMaterial" GROUP BY 1
  `));

  console.log('\n=== Q2.3b FileAsset 关联字段填充率（ownerType 分组） ===');
  console.table(await q(`
    SELECT "ownerType", COUNT(*)::int n,
           COUNT(*) FILTER (WHERE "feedbackId" IS NOT NULL) feedback_id,
           COUNT(*) FILTER (WHERE "postId" IS NOT NULL) post_id,
           COUNT(*) FILTER (WHERE "lessonId" IS NOT NULL) lesson_id,
           COUNT(*) FILTER (WHERE "ownerId" IS NOT NULL) owner_id,
           COUNT(*) FILTER (WHERE "studentId" IS NOT NULL) student_id
    FROM "FileAsset" GROUP BY 1 ORDER BY 1
  `));

  console.log('\n=== Q3.1b 已发布试卷 已读标记明细 ===');
  console.table(await q(`
    SELECT p.id, p.title, p."studentId", s.name, p.subject, p.status,
           p."isReadByParent" read, p."readAt"::timestamp read_at, p."notifySent" notified,
           p."createdAt"::date created
    FROM "ExamPaper" p LEFT JOIN "Student" s ON s.id=p."studentId"
    WHERE p."deletedAt" IS NULL ORDER BY p."createdAt" DESC LIMIT 15
  `));

  console.log('\n=== Q6.3b 餐食-考勤同课次重叠明细抽查（AUTO 同步 vs 追加） ===');
  console.table(await q(`
    SELECT m.source, COUNT(*)::int meal_rows,
           COUNT(*) FILTER (WHERE a."hoursDeducted" > 0) deducted_overlap,
           COUNT(*) FILTER (WHERE m.notes LIKE '后续课次追加就餐%') appended
    FROM "StudentMealAttendance" m
    LEFT JOIN "Attendance" a ON a."studentId"=m."studentId" AND a."lessonId"=m."lessonId" AND a."deletedAt" IS NULL
    GROUP BY 1 ORDER BY 1
  `));
})().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error('ERR', e.message.slice(0, 500));
  await prisma.$disconnect();
});
