/* T3 只读审计：作业/资料/试卷/表现/学习厅/餐食 传导核对
 * 仅 SELECT；不写库、不迁移、不碰 3000 端口。
 * 运行：$env:NODE_PATH="D:\01muzhexuetang\muzhexuetang\coding\edu-manage\node_modules"; node T3-query.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const q = (sql) => prisma.$queryRawUnsafe(sql);

(async () => {
  // ===== 1. Homework =====
  console.log('\n=== Q1.1 HomeworkAssignment 状态分布 ===');
  console.table(await q(`
    SELECT status, COUNT(*)::int n FROM "HomeworkAssignment" GROUP BY 1 ORDER BY 1
  `));

  console.log('\n=== Q1.2 HomeworkSubmission 状态分布 ===');
  console.table(await q(`
    SELECT status, COUNT(*)::int n,
           COUNT(*) FILTER (WHERE score IS NOT NULL) with_score,
           COUNT(*) FILTER (WHERE "teacherComment" IS NOT NULL AND "teacherComment" <> '') with_comment,
           COUNT(*) FILTER (WHERE "reviewedAt" IS NOT NULL) reviewed_at
    FROM "HomeworkSubmission" GROUP BY 1 ORDER BY 1
  `));

  console.log('\n=== Q1.3 抽查 10 条已批阅作业：家长端读点字段是否齐全 ===');
  console.table(await q(`
    SELECT s.id, a.status assignment_status,
           a."studentIds" @> ARRAY[s."studentId"]::text[] in_student_ids,
           s."parentUserId" IS NOT NULL has_parent,
           s.score, (s."teacherComment" IS NOT NULL AND s."teacherComment" <> '') has_comment,
           s."reviewedById" IS NOT NULL has_reviewer,
           s."submittedAt"::date submitted, s."reviewedAt"::date reviewed
    FROM "HomeworkSubmission" s
    JOIN "HomeworkAssignment" a ON a.id=s."assignmentId"
    WHERE s.status='REVIEWED'
    ORDER BY s."reviewedAt" DESC NULLS LAST
    LIMIT 10
  `));

  console.log('\n=== Q1.4 已批阅但家长端不可见风险（作业非 PUBLISHED / 学员不在名单 / 缺家长） ===');
  console.table(await q(`
    SELECT COUNT(*)::int reviewed_total,
           COUNT(*) FILTER (WHERE a.status <> 'PUBLISHED') not_published,
           COUNT(*) FILTER (WHERE NOT (a."studentIds" @> ARRAY[s."studentId"]::text[])) not_in_ids,
           COUNT(*) FILTER (WHERE s."parentUserId" IS NULL) no_parent
    FROM "HomeworkSubmission" s
    JOIN "HomeworkAssignment" a ON a.id=s."assignmentId"
    WHERE s.status='REVIEWED'
  `));

  // ===== 2. StudyMaterial / FileAsset =====
  console.log('\n=== Q2.1 StudyMaterial 状态 × 受众 × 来源 分布 ===');
  console.table(await q(`
    SELECT status, audience, source, COUNT(*)::int n,
           COUNT(*) FILTER (WHERE "isLessonPreview") lesson_preview,
           COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) soft_deleted
    FROM "StudyMaterial" GROUP BY 1,2,3 ORDER BY 1,2,3
  `));

  console.log('\n=== Q2.2 StudyMaterial 孤儿/缺文件检查 ===');
  console.table(await q(`
    SELECT COUNT(*)::int total,
           COUNT(*) FILTER (WHERE "fileUrl" IS NULL OR "fileUrl"='') no_file_url,
           COUNT(*) FILTER (WHERE "deletedAt" IS NULL) alive,
           COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) deleted,
           COUNT(*) FILTER (WHERE status='DELETED') status_deleted
    FROM "StudyMaterial"
  `));

  console.log('\n=== Q2.3 FileAsset ownerType × visibility 分布（挂资料/挂反馈/孤儿） ===');
  console.table(await q(`
    SELECT "ownerType", visibility, COUNT(*)::int n,
           COUNT(*) FILTER (WHERE "feedbackId" IS NOT NULL) feedback_linked,
           COUNT(*) FILTER (WHERE "postId" IS NOT NULL) post_linked,
           COUNT(*) FILTER (WHERE "lessonId" IS NOT NULL) lesson_linked,
           COUNT(*) FILTER (WHERE "feedbackId" IS NULL AND "postId" IS NULL AND "lessonId" IS NULL AND "ownerId" IS NULL) orphan
    FROM "FileAsset" GROUP BY 1,2 ORDER BY 1,2
  `));

  console.log('\n=== Q2.4 FileAsset 孤儿抽样（无任何业务外键） ===');
  console.table(await q(`
    SELECT id, "ownerType", "originalName", "uploadedByRole", "createdAt"::date created
    FROM "FileAsset"
    WHERE "feedbackId" IS NULL AND "postId" IS NULL AND "lessonId" IS NULL AND "ownerId" IS NULL
    ORDER BY "createdAt" DESC LIMIT 10
  `));

  // ===== 3. ExamPaper =====
  console.log('\n=== Q3.1 ExamPaper 状态分布 × 已读 ===');
  console.table(await q(`
    SELECT status, COUNT(*)::int n,
           COUNT(*) FILTER (WHERE "isReadByParent") read_by_parent,
           COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) soft_deleted
    FROM "ExamPaper" GROUP BY 1 ORDER BY 1
  `));

  console.log('\n=== Q3.2 ExamPaper 与练习结果关联覆盖（schema 无 paperId 外键，核对基数） ===');
  console.table(await q(`
    SELECT
      (SELECT COUNT(*)::int FROM "ExamPaper" WHERE "deletedAt" IS NULL) papers_alive,
      (SELECT COUNT(*)::int FROM "PracticeResult") results,
      (SELECT COUNT(*)::int FROM "PracticeAttempt") attempts,
      (SELECT COUNT(*)::int FROM "PaperQuestion") paper_questions
  `));

  console.log('\n=== Q3.3 PracticeResult/Attempt 是否存在 paperId 列（信息核对） ===');
  console.table(await q(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_name IN ('PracticeResult','PracticeAttempt','ExamPaper')
      AND column_name ILIKE '%paper%'
    ORDER BY 1,2
  `));

  // ===== 4. PerformancePost =====
  console.log('\n=== Q4.1 PerformancePost 状态 × 可见性 × 通知 分布 ===');
  console.table(await q(`
    SELECT visibility, type, COUNT(*)::int n,
           COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) soft_deleted,
           COUNT(*) FILTER (WHERE "notifySent") notify_sent
    FROM "PerformancePost" GROUP BY 1,2 ORDER BY 1,2
  `));

  console.log('\n=== Q4.2 PerformancePost 缺家长关联（通知无法落人） ===');
  console.table(await q(`
    SELECT COUNT(*)::int posts,
           COUNT(*) FILTER (WHERE NOT EXISTS (
             SELECT 1 FROM "Student" s WHERE s.id=p."studentId"
               AND (s."parentId" IS NOT NULL OR s."parentUserId" IS NOT NULL))) no_parent
    FROM "PerformancePost" p WHERE p."deletedAt" IS NULL
  `));

  // ===== 5. StudyHall 工资流水 =====
  console.log('\n=== Q5.1 StudyHall 工资流水类型分布 ===');
  console.table(await q(`
    SELECT type, COUNT(*)::int n, ROUND(SUM(amount)::numeric,2) sum_amount,
           MIN("lessonDate")::date first_date, MAX("lessonDate")::date last_date
    FROM "TeacherSalaryTransaction"
    WHERE "deletedAt" IS NULL AND type IN ('STUDY_HALL_BONUS','STUDY_HALL_ATTENDANCE')
    GROUP BY 1 ORDER BY 1
  `));

  console.log('\n=== Q5.2 学习厅记录基数：班级/课次记录/作业条目 ===');
  console.table(await q(`
    SELECT
      (SELECT COUNT(*)::int FROM "StudyHallClass") classes,
      (SELECT COUNT(*)::int FROM "StudyHallClassRecord") class_records,
      (SELECT COUNT(*)::int FROM "StudyHallHomeworkEntry") entries,
      (SELECT COUNT(*)::int FROM "StudyHallHomeworkEntry" WHERE "homeworkStatus" <> 'NOT_RECORDED') homework_recorded,
      (SELECT COUNT(*)::int FROM "StudyHallHomeworkEntry" WHERE "attendanceStatus" IN ('PRESENT','PERSONAL_LEAVE','ABSENT')) attendance_done
  `));

  console.log('\n=== Q5.3 STUDY_HALL_BONUS 流水 ↔ 作业条目 匹配（feedbackId=entryId） ===');
  console.table(await q(`
    SELECT
      (SELECT COUNT(*)::int FROM "TeacherSalaryTransaction" WHERE type='STUDY_HALL_BONUS' AND "deletedAt" IS NULL) bonus_tx,
      (SELECT COUNT(*)::int FROM "TeacherSalaryTransaction" t WHERE t.type='STUDY_HALL_BONUS' AND t."deletedAt" IS NULL
        AND NOT EXISTS (SELECT 1 FROM "StudyHallHomeworkEntry" e WHERE e.id=t."feedbackId")) bonus_orphan,
      (SELECT COUNT(*)::int FROM "StudyHallHomeworkEntry" e WHERE e."homeworkStatus" <> 'NOT_RECORDED'
        AND NOT EXISTS (SELECT 1 FROM "TeacherSalaryTransaction" t WHERE t."feedbackId"=e.id AND t.type='STUDY_HALL_BONUS' AND t."deletedAt" IS NULL)) entry_without_bonus
  `));

  console.log('\n=== Q5.4 STUDY_HALL_ATTENDANCE 流水 ↔ 班级课次记录 匹配（lessonPayKey=STUDY_HALL_ATTENDANCE:classId:date） ===');
  console.table(await q(`
    SELECT
      (SELECT COUNT(*)::int FROM "TeacherSalaryTransaction" WHERE type='STUDY_HALL_ATTENDANCE' AND "deletedAt" IS NULL) att_tx,
      (SELECT COUNT(*)::int FROM "TeacherSalaryTransaction" t WHERE t.type='STUDY_HALL_ATTENDANCE' AND t."deletedAt" IS NULL
        AND NOT EXISTS (SELECT 1 FROM "StudyHallClassRecord" r
          WHERE r."classId"=split_part(t."lessonPayKey",':',2)
            AND to_char(r."studyDate",'YYYY-MM-DD')=split_part(t."lessonPayKey",':',3))) att_key_mismatch,
      (SELECT COUNT(*)::int FROM "StudyHallClassRecord") records
  `));

  console.log('\n=== Q5.5 学习厅流水幂等键重复核对 ===');
  console.table(await q(`
    SELECT type, COUNT(*)::int tx, COUNT(DISTINCT COALESCE("lessonPayKey","feedbackId")) distinct_keys,
           COUNT(*) - COUNT(DISTINCT COALESCE("lessonPayKey","feedbackId")) dup_keys
    FROM "TeacherSalaryTransaction"
    WHERE "deletedAt" IS NULL AND type IN ('STUDY_HALL_BONUS','STUDY_HALL_ATTENDANCE')
    GROUP BY 1
  `));

  // ===== 6. Meal =====
  console.log('\n=== Q6.1 StudentMealAttendance 来源分布 ===');
  console.table(await q(`
    SELECT source, eating, COUNT(*)::int n,
           MIN("mealDate")::date first_date, MAX("mealDate")::date last_date,
           COUNT(*) FILTER (WHERE notes LIKE '后续课次追加就餐%') teacher_appended
    FROM "StudentMealAttendance" GROUP BY 1,2 ORDER BY 1,2
  `));

  console.log('\n=== Q6.2 教师追加就餐记录抽样（notes 含追加标记） ===');
  console.table(await q(`
    SELECT m."studentId", s.name, m."mealDate"::date, m.eating, m.source, m."teacherName",
           LEFT(m.notes,30) notes, m."updatedAt"::timestamp updated
    FROM "StudentMealAttendance" m
    LEFT JOIN "Student" s ON s.id=m."studentId"
    WHERE m.notes LIKE '后续课次追加就餐%'
    ORDER BY m."updatedAt" DESC LIMIT 10
  `));

  console.log('\n=== Q6.3 餐食记录是否混入课时扣减（Attendance.hoursDeducted>0 且同学员同课次） ===');
  console.table(await q(`
    SELECT COUNT(*)::int meal_rows,
           COUNT(*) FILTER (WHERE EXISTS (
             SELECT 1 FROM "Attendance" a
             WHERE a."studentId"=m."studentId" AND a."deletedAt" IS NULL
               AND a."hoursDeducted" > 0
               AND a."lessonId"=m."lessonId")) meal_linked_to_deducted_att
    FROM "StudentMealAttendance" m
  `));

  console.log('\n=== Q6.4 MealReport / ParentMealChoice 基数 ===');
  console.table(await q(`
    SELECT
      (SELECT COUNT(*)::int FROM "MealReport") meal_reports,
      (SELECT COUNT(*)::int FROM "ParentMealChoice") parent_choices,
      (SELECT COUNT(*)::int FROM "StudentMealAttendance") meal_attendance
  `));

  console.log('\n=== Q6.5 非 AUTO（MANUAL/其他）餐食记录最近时间与条数 ===');
  console.table(await q(`
    SELECT source, COUNT(*)::int n, MAX("mealDate")::date last_date, MAX("updatedAt")::timestamp last_update
    FROM "StudentMealAttendance" WHERE source <> 'AUTO' GROUP BY 1 ORDER BY 1
  `));
})().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error('ERR', e.message.slice(0, 500));
  await prisma.$disconnect();
});
