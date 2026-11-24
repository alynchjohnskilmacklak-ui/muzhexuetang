/* T5 只读审计：消息/工资/福利/请假/仪表盘/PHET 传导 + 配置反查
 * 仅 SELECT；不写库、不迁移、不碰 3000 端口。
 * 运行：$env:NODE_PATH="D:\01muzhexuetang\muzhexuetang\coding\edu-manage\node_modules"; node T5-query.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const q = (sql) => prisma.$queryRawUnsafe(sql);

(async () => {
  const today = new Date();
  const y = today.getFullYear(), m = String(today.getMonth() + 1).padStart(2, '0'), d = String(today.getDate()).padStart(2, '0');
  const todayKey = `${y}-${m}-${d}`;
  console.log('本地今天:', todayKey);

  // Q1 TeacherSalaryTransaction 按 type 汇总（未删除）：条数 / 金额合计
  console.log('\n=== Q1 薪资流水按 type 汇总（deletedAt IS NULL） ===');
  const q1 = await q(`
    SELECT type, COUNT(*)::int n, ROUND(SUM(amount)::numeric,2) sum_amount,
           COUNT(*) FILTER (WHERE "settledAt" IS NOT NULL) settled_rows,
           COUNT(*) FILTER (WHERE "settlementBatchId" IS NOT NULL) batch_rows
    FROM "TeacherSalaryTransaction"
    WHERE "deletedAt" IS NULL
    GROUP BY 1 ORDER BY n DESC
  `);
  console.table(q1);

  // Q1b 被软删流水数量（教师端不展示）
  const q1b = await q(`
    SELECT COUNT(*)::int deleted_rows, ROUND(SUM(amount)::numeric,2) sum_amount
    FROM "TeacherSalaryTransaction" WHERE "deletedAt" IS NOT NULL
  `);
  console.table(q1b);

  // Q2 TeacherSalaryConfig 行数与字段值（对比教师端写死默认 22/26、0.5/1）
  console.log('\n=== Q2 TeacherSalaryConfig 配置行 ===');
  const q2 = await q(`
    SELECT c."teacherId", t.name, c."groupRateJunior", c."groupRateSenior",
           c."feedbackRateGroup", c."feedbackRateOneOne", c."oneOnOneRates",
           c."updatedAt"
    FROM "TeacherSalaryConfig" c
    LEFT JOIN "Teacher" t ON t.id=c."teacherId"
    ORDER BY c."updatedAt" DESC
  `);
  console.table(q2);
  const q2b = await q(`
    SELECT COUNT(*)::int total_teachers,
           COUNT(c.id)::int teachers_with_config
    FROM "Teacher" t LEFT JOIN "TeacherSalaryConfig" c ON c."teacherId"=t.id
  `);
  console.table(q2b);

  // Q3 Notification 按接收方角色 × type 分组：总数 / 未读(read=false)
  console.log('\n=== Q3 Notification 接收方角色 × type ===');
  const q3 = await q(`
    SELECT COALESCE(u.role,'NULL') recipient_role, n.type,
           COUNT(*)::int n,
           COUNT(*) FILTER (WHERE n.read=false) unread,
           COUNT(*) FILTER (WHERE n."readAt" IS NULL) readat_null
    FROM "Notification" n LEFT JOIN "User" u ON u.id=n."userId"
    WHERE n."deletedAt" IS NULL
    GROUP BY 1,2 ORDER BY 1, n DESC
  `);
  console.table(q3);

  // Q3b 发给教师(User.role=teacher)的通知明细样例（看 href / relatedType / read 状态）
  const q3b = await q(`
    SELECT n.type, n.title, n.href, n."relatedType", n.read, n."readAt", n."createdAt"
    FROM "Notification" n JOIN "User" u ON u.id=n."userId"
    WHERE u.role='teacher' AND n."deletedAt" IS NULL
    ORDER BY n."createdAt" DESC LIMIT 15
  `);
  console.table(q3b);

  // Q3c 发给教师的通知 href 分布
  const q3c = await q(`
    SELECT n.type, COALESCE(n.href,'NULL') href, COUNT(*)::int n,
           COUNT(*) FILTER (WHERE n.read=false) unread
    FROM "Notification" n JOIN "User" u ON u.id=n."userId"
    WHERE u.role='teacher' AND n."deletedAt" IS NULL
    GROUP BY 1,2 ORDER BY 1, n DESC
  `);
  console.table(q3c);

  // Q4 TeacherMessage（管理端→教师留言）：总数 / 未读(readAt null) / 按教师
  console.log('\n=== Q4 TeacherMessage 管理端→教师提醒 ===');
  const q4 = await q(`
    SELECT COUNT(*)::int total,
           COUNT(*) FILTER (WHERE "readAt" IS NULL) unread,
           COUNT(DISTINCT "teacherId")::int teachers_with_msg
    FROM "TeacherMessage"
  `);
  console.table(q4);
  const q4b = await q(`
    SELECT t.name, COUNT(*)::int total,
           COUNT(*) FILTER (WHERE m."readAt" IS NULL) unread
    FROM "TeacherMessage" m LEFT JOIN "Teacher" t ON t.id=m."teacherId"
    GROUP BY 1 ORDER BY unread DESC LIMIT 10
  `);
  console.table(q4b);

  // Q5 LeaveRequest 状态分布 + 家长端 leave 通知条数
  console.log('\n=== Q5 请假审批 ===');
  const q5 = await q(`
    SELECT status, COUNT(*)::int n,
           COUNT(*) FILTER (WHERE "repliedAt" IS NOT NULL) replied
    FROM "LeaveRequest" WHERE "deletedAt" IS NULL
    GROUP BY 1 ORDER BY 1
  `);
  console.table(q5);
  const q5b = await q(`
    SELECT COALESCE(u.role,'NULL') recipient_role, COALESCE(n.href,'NULL') href,
           COUNT(*)::int n, COUNT(*) FILTER (WHERE n.read=false) unread
    FROM "Notification" n LEFT JOIN "User" u ON u.id=n."userId"
    WHERE n."deletedAt" IS NULL AND n.type='leave'
    GROUP BY 1,2 ORDER BY 1, n DESC
  `);
  console.table(q5b);

  // Q6 仪表盘两侧口径抽样：取最近一个有课日期（今日 2026-11-09 无课次）
  console.log('\n=== Q6 最近有课日期 ===');
  const q6date = await q(`SELECT MAX("lessonDate")::date latest_date FROM "ClassLesson" WHERE "deletedAt" IS NULL`);
  console.table(q6date);
  const latestDate = q6date[0].latest_date.toISOString().slice(0, 10);

  console.log('\n=== Q6 该日期课次与待考勤（admin 看板口径） ===');
  const q6 = await q(`
    SELECT COUNT(*)::int day_lessons,
           COUNT(*) FILTER (WHERE cl."attendanceSubmittedAt" IS NOT NULL) submitted_marker,
           COUNT(*) FILTER (WHERE cl.status='COMPLETED') completed,
           COUNT(*) FILTER (WHERE cl."attendanceSubmittedAt" IS NULL AND cl.status<>'COMPLETED') pending_approx
    FROM "ClassLesson" cl
    WHERE cl."deletedAt" IS NULL AND cl."lessonDate" = DATE '${latestDate}'
  `);
  console.table(q6);

  console.log('\n=== Q6b 该日期课次按教师（teacherId 直接归属，TOP 8） ===');
  const q6b = await q(`
    SELECT cl."teacherId", t.name, COUNT(*)::int day_lessons,
           COUNT(*) FILTER (WHERE cl."attendanceSubmittedAt" IS NULL AND cl.status<>'COMPLETED') pending_approx
    FROM "ClassLesson" cl LEFT JOIN "Teacher" t ON t.id=cl."teacherId"
    WHERE cl."deletedAt" IS NULL AND cl."lessonDate" = DATE '${latestDate}'
    GROUP BY 1,2 ORDER BY day_lessons DESC LIMIT 8
  `);
  console.table(q6b);

  // Q6c 该日期课次中 teacherId 为空、归属班级教师的课次（教师 scope 含 group.teacherId / 教师分配）
  const q6c = await q(`
    SELECT COUNT(*)::int lessons_no_teacher_id,
           COUNT(*) FILTER (WHERE g."teacherId" IS NOT NULL) with_group_teacher
    FROM "ClassLesson" cl JOIN "ClassGroup" g ON g.id=cl."groupId"
    WHERE cl."deletedAt" IS NULL AND cl."lessonDate" = DATE '${latestDate}' AND cl."teacherId" IS NULL
  `);
  console.table(q6c);

  // Q6d 该日期：班级主教师归属（group.teacherId）口径下的 TOP 教师（对照教师 scope 第二分支）
  const q6d = await q(`
    SELECT g."teacherId", t.name, COUNT(*)::int day_lessons
    FROM "ClassLesson" cl JOIN "ClassGroup" g ON g.id=cl."groupId"
    LEFT JOIN "Teacher" t ON t.id=g."teacherId"
    WHERE cl."deletedAt" IS NULL AND cl."lessonDate" = DATE '${latestDate}'
    GROUP BY 1,2 ORDER BY day_lessons DESC LIMIT 8
  `);
  console.table(q6d);

  // Q7 ParentMessage 线程：状态分布 + 教师未读家长回复数（教师端 messages 角标口径）
  console.log('\n=== Q7 家校留言 ParentMessage 工作流 ===');
  const q7 = await q(`
    SELECT status, COUNT(*)::int n,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM "ParentMessageReply" r WHERE r."messageId"=pm.id AND r.role='parent' AND r."isReadByTeacher"=false)) unread_parent_reply
    FROM "ParentMessage" pm
    GROUP BY 1 ORDER BY 1
  `);
  console.table(q7);
  const q7b = await q(`
    SELECT COUNT(*)::int threads,
           COUNT(DISTINCT pm."teacherId")::int teachers_assigned,
           COUNT(*) FILTER (WHERE pm."teacherId" IS NULL) unassigned
    FROM "ParentMessage" pm
  `);
  console.table(q7b);

  // Q8 活跃报名 Enrollment 与班级归属抽样（反查：教师端名单/班级归属是否读最新）
  console.log('\n=== Q8 报名与班级归属 ===');
  const q8 = await q(`
    SELECT COUNT(*)::int active_enrollments,
           COUNT(*) FILTER (WHERE e."deletedAt" IS NOT NULL) soft_deleted,
           COUNT(DISTINCT e."groupId")::int active_groups
    FROM "Enrollment" e WHERE e.status='ACTIVE'
  `);
  console.table(q8);
  const q8b = await q(`
    SELECT COUNT(*)::int groups,
           COUNT(*) FILTER (WHERE g."teacherId" IS NULL) no_primary_teacher,
           COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM "ClassGroupTeacher" a WHERE a."groupId"=g.id)) with_assignment
    FROM "ClassGroup" g WHERE g.status<>'ARCHIVED'
  `);
  console.table(q8b);
})().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error('ERR', e.message && e.message.slice(0, 300));
  await prisma.$disconnect();
});
