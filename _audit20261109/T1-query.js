/* T1 只读审计：教师端点名/考勤/突击班 → 账务与两端消费核对
 * 仅 SELECT；不写库、不迁移、不碰 3000 端口。
 * 运行：$env:NODE_PATH="D:\01muzhexuetang\muzhexuetang\coding\edu-manage\node_modules"; node T1-query.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const q = (sql) => prisma.$queryRawUnsafe(sql);

(async () => {
  // Q1 最近 10 节「普通班已提交考勤」课次：Attendance 行数 / LESSON_PAY / HourTransaction 成对情况
  console.log('\n=== Q1 普通班已提交课次抽样（近 30 节取 10） ===');
  const q1 = await q(`
    SELECT cl.id, cl."lessonDate", cl."attendanceSubmittedAt" IS NOT NULL AS submitted,
           cl."hoursDeductedAt" IS NOT NULL AS deducted,
           g."intensiveMode",
           (SELECT COUNT(*) FROM "Attendance" a WHERE a."lessonId"=cl.id AND a."deletedAt" IS NULL) att_rows,
           (SELECT COUNT(*) FROM "Attendance" a WHERE a."lessonId"=cl.id AND a."deletedAt" IS NULL AND a.status='PRESENT') present,
           (SELECT COUNT(*) FROM "TeacherSalaryTransaction" t WHERE t."lessonPayKey"=cl.id AND t.type='LESSON_PAY' AND t."deletedAt" IS NULL) pay_rows,
           (SELECT COUNT(*) FROM "HourTransaction" h WHERE h."lessonId"=cl.id AND h."deletedAt" IS NULL) hour_rows
    FROM "ClassLesson" cl
    JOIN "ClassGroup" g ON g.id=cl."groupId"
    WHERE cl."deletedAt" IS NULL AND cl."attendanceSubmittedAt" IS NOT NULL
      AND g."intensiveMode" <> 'INTENSIVE'
    ORDER BY cl."attendanceSubmittedAt" DESC
    LIMIT 10
  `);
  console.table(q1);

  // Q2 普通班已提交但缺 LESSON_PAY 的课次（应只出现在：无出勤学员/无批次/并发跳过等异常口径）
  console.log('\n=== Q2 普通班已提交但无 LESSON_PAY 的课次汇总 ===');
  const q2 = await q(`
    SELECT COUNT(*)::int lessons,
           COUNT(*) FILTER (WHERE cl.status='COMPLETED') completed,
           COUNT(*) FILTER (WHERE NOT EXISTS (
             SELECT 1 FROM "Attendance" a WHERE a."lessonId"=cl.id AND a."deletedAt" IS NULL AND a.status='PRESENT')) no_present,
           COUNT(*) FILTER (WHERE g."termId" IS NULL) no_term
    FROM "ClassLesson" cl
    JOIN "ClassGroup" g ON g.id=cl."groupId"
    WHERE cl."deletedAt" IS NULL AND cl."attendanceSubmittedAt" IS NOT NULL
      AND g."intensiveMode" <> 'INTENSIVE'
      AND NOT EXISTS (SELECT 1 FROM "TeacherSalaryTransaction" t
                      WHERE t."lessonPayKey"=cl.id AND t.type='LESSON_PAY' AND t."deletedAt" IS NULL)
  `);
  console.table(q2);

  // Q3 突击班：APPROVED 课次是否有工资；PENDING/REJECTED/DRAFT 课次是否无工资
  console.log('\n=== Q3 突击班各审核状态 × 工资流水 ===');
  const q3 = await q(`
    SELECT cl."intensiveReviewStatus" status, COUNT(*)::int lessons,
           COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "TeacherSalaryTransaction" t
             WHERE t."lessonPayKey"=cl.id AND t.type='LESSON_PAY' AND t."deletedAt" IS NULL)) with_pay,
           COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "HourTransaction" h
             WHERE h."lessonId"=cl.id AND h."deletedAt" IS NULL)) with_hours
    FROM "ClassLesson" cl
    JOIN "ClassGroup" g ON g.id=cl."groupId"
    WHERE cl."deletedAt" IS NULL AND g."intensiveMode"='INTENSIVE'
    GROUP BY 1 ORDER BY 1
  `);
  console.table(q3);

  // Q4 空名单课次（无 ClassLessonStudent 快照）：状态分布、是否已有考勤行、是否已提交
  console.log('\n=== Q4 空名单课次（无快照学员） ===');
  const q4 = await q(`
    SELECT cl.status, COUNT(*)::int lessons,
           COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "Attendance" a WHERE a."lessonId"=cl.id AND a."deletedAt" IS NULL)) with_att,
           COUNT(*) FILTER (WHERE cl."attendanceSubmittedAt" IS NOT NULL) submitted,
           COUNT(*) FILTER (WHERE cl."hoursDeductedAt" IS NOT NULL) deducted
    FROM "ClassLesson" cl
    WHERE cl."deletedAt" IS NULL
      AND NOT EXISTS (SELECT 1 FROM "ClassLessonStudent" s WHERE s."lessonId"=cl.id)
    GROUP BY 1 ORDER BY 1
  `);
  console.table(q4);

  // Q4b 全部课次空名单占比（对照基线 592 节 / 160 节 27.0%）
  const q4b = await q(`
    SELECT COUNT(*)::int total,
           COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM "ClassLessonStudent" s WHERE s."lessonId"=cl.id)) empty_roster
    FROM "ClassLesson" cl WHERE cl."deletedAt" IS NULL
  `);
  console.table(q4b);

  // Q5 ClassroomPick 与账务关联：抽人记录是否直接挂工资/课时流水（应为 0）
  console.log('\n=== Q5 ClassroomPick 与账务关联核对 ===');
  const q5 = await q(`
    SELECT COUNT(*)::int picks,
           COUNT(*) FILTER (WHERE result IS NOT NULL) rated,
           COUNT(*) FILTER (WHERE "parentVisible") parent_visible,
           COUNT(DISTINCT "lessonId") lessons_with_pick,
           COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "TeacherSalaryTransaction" t
             WHERE t."lessonId"=cp."lessonId" AND t."deletedAt" IS NULL)) picks_in_pay_lesson
    FROM "ClassroomPick" cp
  `);
  console.table(q5);
  const q5b = await q(`
    SELECT COUNT(*)::int picks_in_hour_lesson FROM "ClassroomPick" cp
    WHERE EXISTS (SELECT 1 FROM "HourTransaction" h WHERE h."lessonId"=cp."lessonId" AND h."deletedAt" IS NULL)
  `);
  console.table(q5b);

  // Q6 rollCallStatus 落库分布（点名三态）
  console.log('\n=== Q6 Attendance.rollCallStatus 分布 ===');
  const q6 = await q(`
    SELECT COALESCE("rollCallStatus",'NULL') roll_call, COUNT(*)::int n,
           COUNT(*) FILTER (WHERE status='PRESENT') mapped_present,
           COUNT(*) FILTER (WHERE status='ABSENT') mapped_absent,
           COUNT(*) FILTER (WHERE status='LEAVE') mapped_leave
    FROM "Attendance" WHERE "deletedAt" IS NULL
    GROUP BY 1 ORDER BY 1
  `);
  console.table(q6);

  // Q7 课时成对核对：已扣课时考勤行 vs 该课 HourTransaction 行数（普通班）
  console.log('\n=== Q7 课时账成对核对（普通班已提交） ===');
  const q7 = await q(`
    SELECT
      COUNT(*) FILTER (WHERE a."hoursDeducted" > 0) deducted_att_rows,
      COUNT(*) FILTER (WHERE a."hoursDeducted" > 0 AND NOT EXISTS (
        SELECT 1 FROM "HourTransaction" h WHERE h."lessonId"=a."lessonId"
          AND h."studentId"=a."studentId" AND h."deletedAt" IS NULL)) missing_hour_tx,
      COUNT(*) FILTER (WHERE a."hoursDeducted" = 0 AND EXISTS (
        SELECT 1 FROM "HourTransaction" h WHERE h."lessonId"=a."lessonId"
          AND h."studentId"=a."studentId" AND h."deletedAt" IS NULL)) extra_hour_tx
    FROM "Attendance" a
    JOIN "ClassLesson" cl ON cl.id=a."lessonId"
    JOIN "ClassGroup" g ON g.id=cl."groupId"
    WHERE a."deletedAt" IS NULL AND cl."deletedAt" IS NULL
      AND cl."attendanceSubmittedAt" IS NOT NULL AND g."intensiveMode" <> 'INTENSIVE'
  `);
  console.table(q7);

  // Q8 近 14 天 LESSON_PAY 流水与课次对账：工资课次是否都已提交考勤
  console.log('\n=== Q8 LESSON_PAY 流水 × 课次提交状态（近 14 天） ===');
  const q8 = await q(`
    SELECT t.type, COUNT(*)::int tx,
           COUNT(*) FILTER (WHERE cl."attendanceSubmittedAt" IS NULL) missing_submit,
           COUNT(*) FILTER (WHERE cl.status<>'COMPLETED') not_completed
    FROM "TeacherSalaryTransaction" t
    LEFT JOIN "ClassLesson" cl ON cl.id=t."lessonId"
    WHERE t."deletedAt" IS NULL AND t."createdAt" > now() - interval '14 days'
      AND t.type IN ('LESSON_PAY','LESSON_PAY_ADJUSTMENT')
    GROUP BY 1
  `);
  console.table(q8);

  // Q9 突击班审批通过后课时流水类型分布（验证 accrue/deduct 双分支）
  console.log('\n=== Q9 突击班 HourTransaction 类型分布（APPROVED 课次） ===');
  const q9 = await q(`
    SELECT h.type, COUNT(*)::int n, ROUND(SUM(h.amount)::numeric,2) sum_amount
    FROM "HourTransaction" h
    JOIN "ClassLesson" cl ON cl.id=h."lessonId"
    JOIN "ClassGroup" g ON g.id=cl."groupId"
    WHERE h."deletedAt" IS NULL AND g."intensiveMode"='INTENSIVE'
    GROUP BY 1 ORDER BY 1
  `);
  console.table(q9);
})().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error('ERR', e.message.slice(0, 300));
  await prisma.$disconnect();
});
