/* P3 只读审计：家长端课表/请假/餐食/晚托/VIP/服务 传导基线
 * 仅 SELECT；不写库、不迁移、不碰 3000 端口 dev。
 * 运行：$env:NODE_PATH="D:\01muzhexuetang\muzhexuetang\coding\edu-manage\node_modules"; node P3-query.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const q = (sql) => prisma.$queryRawUnsafe(sql);

(async () => {
  // Q1 LeaveRequest 状态分布 + 字段齐全度
  console.log('\n=== Q1 LeaveRequest 状态分布（live） ===');
  console.table(await q(`
    SELECT status, COUNT(*)::int rows,
           COUNT(*) FILTER (WHERE "lessonId" IS NOT NULL) with_lesson,
           COUNT(*) FILTER (WHERE "replyNote" IS NOT NULL) with_reply,
           COUNT(*) FILTER (WHERE "repliedAt" IS NOT NULL) replied,
           COUNT(DISTINCT "studentId") students
    FROM "LeaveRequest" WHERE "deletedAt" IS NULL
    GROUP BY 1 ORDER BY 1
  `));
  console.table(await q(`
    SELECT status, COUNT(*)::int trashed FROM "LeaveRequest"
    WHERE "deletedAt" IS NOT NULL GROUP BY 1 ORDER BY 1
  `));

  // Q2 已批准请假 vs 考勤仍 PRESENT 的矛盾行
  console.log('\n=== Q2 批准请假但考勤仍 PRESENT（矛盾） ===');
  console.table(await q(`
    SELECT 'with_lesson' scope, COUNT(*)::int contradictions
    FROM "LeaveRequest" lr
    JOIN "Attendance" a ON a."studentId" = lr."studentId" AND a."lessonId" = lr."lessonId"
    WHERE lr.status = 'approved' AND lr."deletedAt" IS NULL
      AND a."deletedAt" IS NULL AND a.status = 'PRESENT'
  `));
  console.table(await q(`
    SELECT 'date_only' scope, COUNT(*)::int contradictions
    FROM "LeaveRequest" lr
    JOIN "Attendance" a ON a."studentId" = lr."studentId" AND a."lessonId" IS NOT NULL
    JOIN "ClassLesson" l ON l.id = a."lessonId"
    WHERE lr.status = 'approved' AND lr."deletedAt" IS NULL
      AND lr."lessonId" IS NULL
      AND DATE(l."lessonDate") = DATE(lr."leaveDate")
      AND a."deletedAt" IS NULL AND a.status = 'PRESENT'
  `));
  console.table(await q(`
    SELECT lr.id, lr."studentId", lr."lessonId", DATE(lr."leaveDate") leave_date,
           a.id attendance_id, a.status attendance_status, a."hoursDeducted"
    FROM "LeaveRequest" lr
    JOIN "Attendance" a ON a."studentId" = lr."studentId" AND a."lessonId" = lr."lessonId"
    WHERE lr.status = 'approved' AND lr."deletedAt" IS NULL
      AND a."deletedAt" IS NULL AND a.status = 'PRESENT'
    LIMIT 20
  `));

  // Q3 餐食两表规模与来源拆分
  console.log('\n=== Q3 餐食两表规模 ===');
  console.table(await q(`
    SELECT 'ParentMealChoice' tbl, COUNT(*)::int rows,
           COUNT(*) FILTER (WHERE eating) eating,
           COUNT(*) FILTER (WHERE NOT eating) not_eating,
           COUNT(DISTINCT "studentId") students
    FROM "ParentMealChoice"
  `));
  console.table(await q(`
    SELECT source, COUNT(*)::int rows,
           COUNT(*) FILTER (WHERE eating) eating,
           COUNT(DISTINCT "studentId") students
    FROM "StudentMealAttendance" GROUP BY 1 ORDER BY 1
  `));
  console.table(await q(`
    SELECT COUNT(*)::int overlap_rows
    FROM "ParentMealChoice" c
    JOIN "StudentMealAttendance" m ON m."studentId" = c."studentId"
      AND DATE(m."mealDate") = DATE(c."choiceDate")
  `));

  // Q4 近 30 天 ClassLesson 状态分布 + 停课/延期
  console.log('\n=== Q4 近 30 天 ClassLesson 状态 ===');
  console.table(await q(`
    SELECT status, COUNT(*)::int rows,
           COUNT(*) FILTER (WHERE "deletedAt" IS NOT NULL) trashed
    FROM "ClassLesson"
    WHERE "lessonDate" >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY 1 ORDER BY 1
  `));
  console.table(await q(`
    SELECT g.status group_status, COUNT(*)::int rows
    FROM "ClassLesson" l JOIN "ClassGroup" g ON g.id = l."groupId"
    WHERE l."lessonDate" >= CURRENT_DATE - INTERVAL '30 days'
      AND l.status IN ('CANCELLED','POSTPONED')
    GROUP BY 1 ORDER BY 1
  `));
  console.table(await q(`
    SELECT g.status group_status, COUNT(*)::int rows,
           COUNT(*) FILTER (WHERE l."deletedAt" IS NULL) live
    FROM "ClassLesson" l JOIN "ClassGroup" g ON g.id = l."groupId"
    WHERE l."lessonDate" >= CURRENT_DATE - INTERVAL '30 days'
      AND l.status NOT IN ('CANCELLED','POSTPONED')
    GROUP BY 1 ORDER BY 1
  `));

  // Q5 VIP/INTENSIVE 预约（ClassLesson DRAFT/PENDING）与名册覆盖
  console.log('\n=== Q5 INTENSIVE 课次审核状态分布 ===');
  console.table(await q(`
    SELECT l."intensiveReviewStatus", l.status lesson_status, COUNT(*)::int rows,
           COUNT(DISTINCT l."groupId") groups
    FROM "ClassLesson" l JOIN "ClassGroup" g ON g.id = l."groupId"
    WHERE g."intensiveMode" = 'INTENSIVE' AND l."deletedAt" IS NULL
    GROUP BY 1,2 ORDER BY 1,2
  `));
  console.table(await q(`
    SELECT COUNT(*)::int draft_pending_lessons,
           COUNT(*) FILTER (WHERE NOT EXISTS (
             SELECT 1 FROM "ClassLessonStudent" cls WHERE cls."lessonId" = l.id)) no_roster
    FROM "ClassLesson" l JOIN "ClassGroup" g ON g.id = l."groupId"
    WHERE g."intensiveMode" = 'INTENSIVE' AND l."deletedAt" IS NULL
      AND l.status NOT IN ('CANCELLED','POSTPONED')
      AND l."intensiveReviewStatus" IN ('DRAFT','PENDING')
  `));
  console.table(await q(`
    SELECT COUNT(*)::int lessons, COUNT(DISTINCT l."groupId") groups,
           COUNT(DISTINCT e."studentId") enrolled_students
    FROM "ClassLesson" l
    JOIN "ClassGroup" g ON g.id = l."groupId"
    LEFT JOIN "Enrollment" e ON e."groupId" = g.id AND e.status = 'ACTIVE' AND e."deletedAt" IS NULL
    WHERE g."intensiveMode" = 'INTENSIVE' AND l."deletedAt" IS NULL
  `));

  // Q6 晚托：会员状态 / 班级状态 / 运营期 残留可见性
  console.log('\n=== Q6 晚托会员与班级状态 ===');
  console.table(await q(`
    SELECT status, COUNT(*)::int memberships FROM "StudyHallClassStudent" GROUP BY 1 ORDER BY 1
  `));
  console.table(await q(`
    SELECT c.status class_status, COUNT(*)::int memberships
    FROM "StudyHallClassStudent" m JOIN "StudyHallClass" c ON c.id = m."classId"
    GROUP BY 1 ORDER BY 1
  `));
  console.table(await q(`
    SELECT COUNT(*)::int entries,
           COUNT(*) FILTER (WHERE m.status = 'LEFT') under_left_member,
           COUNT(*) FILTER (WHERE c.status <> 'ACTIVE') under_inactive_class,
           COUNT(*) FILTER (WHERE t.status <> 'ACTIVE') under_inactive_term
    FROM "StudyHallHomeworkEntry" e
    JOIN "StudyHallClassRecord" r ON r.id = e."classRecordId"
    JOIN "StudyHallClass" c ON c.id = r."classId"
    LEFT JOIN "StudyHallClassStudent" m ON m."classId" = c.id AND m."studentId" = e."studentId"
    LEFT JOIN "AcademicTerm" t ON t.id = c."termId"
  `));
  console.table(await q(`
    SELECT c.status class_status, t.status term_status, m.status member_status, COUNT(*)::int entries
    FROM "StudyHallHomeworkEntry" e
    JOIN "StudyHallClassRecord" r ON r.id = e."classRecordId"
    JOIN "StudyHallClass" c ON c.id = r."classId"
    LEFT JOIN "AcademicTerm" t ON t.id = c."termId"
    LEFT JOIN "StudyHallClassStudent" m ON m."classId" = c.id AND m."studentId" = e."studentId"
    GROUP BY 1,2,3 ORDER BY 1,2,3
  `));

  // Q7 晚托奖励流水（教师工资侧，家长端无读点）
  console.log('\n=== Q7 STUDY_HALL 工资流水 ===');
  console.table(await q(`
    SELECT type, COUNT(*)::int rows, SUM(amount)::numeric total_amount
    FROM "TeacherSalaryTransaction"
    WHERE type LIKE 'STUDY_HALL%'
    GROUP BY 1 ORDER BY 1
  `));

  // Q8 家长端课表口径下 COMPLETED/WAITING 班级仍有未结课次
  console.log('\n=== Q8 非 ACTIVE 班级的未取消课次 ===');
  console.table(await q(`
    SELECT g.status group_status, COUNT(*)::int lessons,
           COUNT(DISTINCT g.id) groups,
           COUNT(*) FILTER (WHERE l."lessonDate" >= CURRENT_DATE) future_lessons
    FROM "ClassLesson" l JOIN "ClassGroup" g ON g.id = l."groupId"
    WHERE l."deletedAt" IS NULL AND g."deletedAt" IS NULL
      AND l.status NOT IN ('CANCELLED','POSTPONED')
      AND g.status <> 'ACTIVE'
    GROUP BY 1 ORDER BY 1
  `));
})()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
