/* T4 只读审计：教师端学生档案/掌握度/弱项/目标/趋势/课表/预约 VIP 传导基线
 * 仅 SELECT；不写库、不迁移、不碰 3000 端口 dev。
 * 运行：$env:NODE_PATH="D:\01muzhexuetang\muzhexuetang\coding\edu-manage\node_modules"; node T4-query.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const q = (sql) => prisma.$queryRawUnsafe(sql);

(async () => {
  // Q1 MasteryRecord 总行数 / 等级分布 / 是否带 teacherId、termId
  console.log('\n=== Q1 MasteryRecord（教师端掌握度写入表） ===');
  const q1 = await q(`
    SELECT COUNT(*)::int total,
           COUNT(*) FILTER (WHERE "teacherId" IS NOT NULL) with_teacher,
           COUNT(DISTINCT "studentId") students,
           COUNT(DISTINCT "teacherId") teachers
    FROM "MasteryRecord"
  `);
  console.table(q1);
  const q1b = await q(`
    SELECT level, COUNT(*)::int n FROM "MasteryRecord" GROUP BY 1 ORDER BY 1
  `);
  console.table(q1b);

  // Q2 WeaknessRecord 总量 + 来源拆分（paperId 非空=试卷沉淀；paperId 空=教师手工录入）
  console.log('\n=== Q2 WeaknessRecord 来源拆分 ===');
  const q2 = await q(`
    SELECT CASE WHEN "paperId" IS NULL THEN 'manual' ELSE 'from_paper' END source,
           COUNT(*)::int rows, COUNT(DISTINCT "studentId") students
    FROM "WeaknessRecord" GROUP BY 1 ORDER BY 1
  `);
  console.table(q2);
  const q2b = await q(`
    SELECT COUNT(*) FILTER (WHERE w."paperId" IS NULL) manual_rows,
           COUNT(*) FILTER (WHERE w."paperId" IS NOT NULL) paper_rows,
           COUNT(*) FILTER (WHERE w."paperId" IS NOT NULL AND p.status='DELETED') paper_deleted,
           COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "Student" s WHERE s.id=w."studentId" AND s.status<>'INACTIVE' AND s."deletedAt" IS NULL)) inactive_student_rows
    FROM "WeaknessRecord" w LEFT JOIN "ExamPaper" p ON p.id=w."paperId"
  `);
  console.table(q2b);

  // Q3 LearningGoal 总量 / 达成 / 软删
  console.log('\n=== Q3 LearningGoal 状态分布 ===');
  const q3 = await q(`
    SELECT "isAchieved",
           COUNT(*) FILTER (WHERE "deletedAt" IS NULL) live,
           COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) trashed,
           COUNT(DISTINCT "studentId") students
    FROM "LearningGoal" GROUP BY 1 ORDER BY 1
  `);
  console.table(q3);

  // Q4 StageSummary 草稿/发布拆分（家长端只读 PUBLISHED）
  console.log('\n=== Q4 StageSummary 状态分布 ===');
  const q4 = await q(`
    SELECT status, COUNT(*)::int rows,
           COUNT(*) FILTER (WHERE "notifySent") notify_sent,
           COUNT(DISTINCT "studentId") students
    FROM "StageSummary" GROUP BY 1 ORDER BY 1
  `);
  console.table(q4);

  // Q5 CourseChangeEvent 事件类型 × 触发角色 × 通知推送状态
  console.log('\n=== Q5 CourseChangeEvent 事件类型与触发角色 ===');
  const q5 = await q(`
    SELECT e."eventType", COALESCE(u.role,'?') role,
           COUNT(*)::int events,
           SUM(e."recipientCount")::int recipients,
           SUM(e."notificationCount")::int notifications
    FROM "CourseChangeEvent" e LEFT JOIN "User" u ON u.id=e."actorUserId"
    GROUP BY 1,2 ORDER BY 1,2
  `);
  console.table(q5);
  const q5b = await q(`
    SELECT COALESCE(n."pushStatus",'none') push_status, COUNT(*)::int n
    FROM "CourseChangeEvent" e
    LEFT JOIN "Notification" n ON n."relatedType"='COURSE_CHANGE_EVENT' AND n."relatedId"=e.id
    GROUP BY 1 ORDER BY 1
  `);
  console.table(q5b);

  // Q6 教师发起的课次：isManual=true 的课次 × 班型 × 状态（含教师调课/取消痕迹）
  console.log('\n=== Q6 教师手动创建课次（isManual）× 班型 × 状态 ===');
  const q6 = await q(`
    SELECT g."intensiveMode", cl.status, COUNT(*)::int lessons,
           COUNT(*) FILTER (WHERE cl."teacherId" IS NOT NULL) with_teacher
    FROM "ClassLesson" cl JOIN "ClassGroup" g ON g.id=cl."groupId"
    WHERE cl."deletedAt" IS NULL AND cl."isManual"=true
    GROUP BY 1,2 ORDER BY 1,2
  `);
  console.table(q6);
  const q6b = await q(`
    SELECT e."eventType", COUNT(*)::int events,
           COUNT(*) FILTER (WHERE u.role='teacher') teacher_actor,
           COUNT(*) FILTER (WHERE u.role='admin') admin_actor
    FROM "CourseChangeEvent" e LEFT JOIN "User" u ON u.id=e."actorUserId"
    WHERE e."eventType" IN ('LESSON_RESCHEDULED','LESSON_CANCELLED','LESSON_CREATED','LESSON_BACKFILLED')
    GROUP BY 1 ORDER BY 1
  `);
  console.table(q6b);

  // Q7 空名单课次（基线 592 节中 160 节 27.0%）——教师端课表路由仅排除 CANCELLED/POSTPONED
  console.log('\n=== Q7 空名单课次（无 ClassLessonStudent 快照）===');
  const q7 = await q(`
    SELECT COUNT(*)::int total,
           COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "ClassLessonStudent" s WHERE s."lessonId"=cl.id)) empty_roster
    FROM "ClassLesson" cl WHERE cl."deletedAt" IS NULL
  `);
  console.table(q7);
  const q7b = await q(`
    SELECT cl.status, g."intensiveMode", COUNT(*)::int empty_lessons
    FROM "ClassLesson" cl JOIN "ClassGroup" g ON g.id=cl."groupId"
    WHERE cl."deletedAt" IS NULL
      AND NOT EXISTS (SELECT 1 FROM "ClassLessonStudent" s WHERE s."lessonId"=cl.id)
    GROUP BY 1,2 ORDER BY 1,2
  `);
  console.table(q7b);
  // 课表路由可见范围（status NOT IN CANCELLED, POSTPONED）内的空名单课次
  const q7c = await q(`
    SELECT g."intensiveMode", COUNT(*)::int empty_visible
    FROM "ClassLesson" cl JOIN "ClassGroup" g ON g.id=cl."groupId"
    WHERE cl."deletedAt" IS NULL AND cl.status NOT IN ('CANCELLED','POSTPONED')
      AND NOT EXISTS (SELECT 1 FROM "ClassLessonStudent" s WHERE s."lessonId"=cl.id)
    GROUP BY 1 ORDER BY 1
  `);
  console.table(q7c);

  // Q8 Student.status 口径分布（教师端/家长端均排除 INACTIVE；其余 COMPLETED/TRIAL/ACTIVE 是否泄漏给家长）
  console.log('\n=== Q8 Student.status 分布 ===');
  const q8 = await q(`
    SELECT status, COUNT(*)::int students,
           COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) trashed
    FROM "Student" GROUP BY 1 ORDER BY 1
  `);
  console.table(q8);

  // Q9 trends 数据源口径：考勤/工资流水是否含 INACTIVE 学员或软删记录
  console.log('\n=== Q9 trends 聚合口径泄漏核查 ===');
  const q9 = await q(`
    SELECT
      COUNT(*) FILTER (WHERE a."deletedAt" IS NULL) live_att,
      COUNT(*) FILTER (WHERE a."deletedAt" IS NULL AND s.status='INACTIVE') inactive_student_att,
      COUNT(*) FILTER (WHERE a."deletedAt" IS NULL AND s."deletedAt" IS NOT NULL) trashed_student_att
    FROM "Attendance" a LEFT JOIN "Student" s ON s.id=a."studentId"
  `);
  console.table(q9);
  const q9b = await q(`
    SELECT COUNT(*) FILTER (WHERE "deletedAt" IS NULL) live_salary_tx,
           COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) trashed_salary_tx
    FROM "TeacherSalaryTransaction"
  `);
  console.table(q9b);

  // Q10 教师端三个学生详情页/上下文接口被引用情况（运行时以源码 grep 为准，此处仅统计表内归属）
  console.log('\n=== Q10 教师端掌握度/弱项/目标 覆盖学员数 vs 全部在读学员 ===');
  const q10 = await q(`
    SELECT
      (SELECT COUNT(*) FROM "Student" WHERE status<>'INACTIVE' AND "deletedAt" IS NULL) active_students,
      (SELECT COUNT(DISTINCT "studentId") FROM "MasteryRecord") mastery_students,
      (SELECT COUNT(DISTINCT "studentId") FROM "WeaknessRecord") weakness_students,
      (SELECT COUNT(DISTINCT "studentId") FROM "LearningGoal" WHERE "deletedAt" IS NULL) goal_students,
      (SELECT COUNT(DISTINCT "studentId") FROM "StageSummary" WHERE status='PUBLISHED') published_summary_students
  `);
  console.table(q10);
})().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error('ERR', e.message.slice(0, 400));
  await prisma.$disconnect();
});
