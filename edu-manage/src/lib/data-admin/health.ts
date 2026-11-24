import { Prisma, type PrismaClient } from '@prisma/client'
import { getRequestPrisma } from '@/lib/prisma'
import type { Division } from '@/lib/division'

interface HealthIssue {
  label: string
  count: number
  severity: 'high' | 'medium' | 'low'
  description: string
  sampleIds?: string[]
}

export async function runDataHealthCheck(db?: PrismaClient, division?: Division): Promise<HealthIssue[]> {
  const prisma = db ?? await getRequestPrisma()
  const issues: HealthIssue[] = []
  const scope = (alias: string) => division ? Prisma.sql`AND ${Prisma.raw(`"${alias}"."division"`)} = ${division}` : Prisma.empty
  async function sample<T>(query: Prisma.Sql) {
    return prisma.$queryRaw<(T & { totalCount: bigint })[]>(Prisma.sql`SELECT q.*, COUNT(*) OVER()::bigint AS "totalCount" FROM (${query}) q LIMIT 50`)
  }
  const total = (rows: { totalCount?: bigint }[]) => Number(rows[0]?.totalCount ?? rows.length)

  // 1. Duplicate attendance for same lesson+student
  const dupAttendance = await sample<{ studentId: string; lessonId: string; cnt: bigint }>(Prisma.sql`SELECT a."studentId", a."lessonId", COUNT(*)::int as cnt FROM "Attendance" a JOIN "Student" s ON a."studentId" = s."id" WHERE a."lessonId" IS NOT NULL AND a."deletedAt" IS NULL ${scope('s')} GROUP BY a."studentId", a."lessonId" HAVING COUNT(*) > 1`
  )
  if (dupAttendance.length > 0) {
    issues.push({
      label: '重复考勤',
      count: total(dupAttendance),
      severity: 'high',
      description: '同一课次同一学生存在多条考勤记录',
      sampleIds: dupAttendance.map((r) => `${r.studentId}/${r.lessonId}`),
    })
  }

  // 2. Orphan notifications (studentId refers to non-existing student)
  const orphanNotifs = await sample<{ id: string; cnt: bigint }>(Prisma.sql`SELECT n."id", 1 as cnt FROM "Notification" n LEFT JOIN "Student" s ON n."studentId" = s."id" JOIN "User" u ON n."userId" = u."id" WHERE n."studentId" IS NOT NULL AND s."id" IS NULL AND n."deletedAt" IS NULL ${scope('u')}`
  )
  if (orphanNotifs.length > 0) {
    issues.push({
      label: '孤儿通知',
      count: total(orphanNotifs),
      severity: 'medium',
      description: '通知关联的学员已不存在',
      sampleIds: orphanNotifs.map((r) => r.id),
    })
  }

  // 3. Orphan exam papers (studentId refers to non-existing student)
  const orphanPapers = await sample<{ id: string; cnt: bigint }>(Prisma.sql`SELECT ep."id", 1 as cnt FROM "ExamPaper" ep LEFT JOIN "Student" s ON ep."studentId" = s."id" JOIN "Teacher" t ON ep."teacherId" = t."id" WHERE s."id" IS NULL AND ep."deletedAt" IS NULL ${scope('t')}`
  )
  if (orphanPapers.length > 0) {
    issues.push({
      label: '孤儿试卷',
      count: total(orphanPapers),
      severity: 'medium',
      description: '试卷关联的学员已不存在',
      sampleIds: orphanPapers.map((r) => r.id),
    })
  }

  // 4. Hour anomalies (negative remainHours)
  const negativeHours = await prisma.student.findMany({
    where: { remainHours: { lt: 0 }, deletedAt: null, ...(division ? { division } : {}) },
    select: { id: true },
    take: 50,
  })
  const negativeHoursTotal = await prisma.student.count({ where: { remainHours: { lt: 0 }, deletedAt: null, ...(division ? { division } : {}) } })
  if (negativeHoursTotal > 0) {
    issues.push({
      label: '课时异常（负数）',
      count: negativeHoursTotal,
      severity: 'high',
      description: '学员剩余课时为负数，需核实修正',
      sampleIds: negativeHours.map((s) => s.id),
    })
  }

  // 5. Active prepaid enrollment hours mismatch. Accrual-mode enrollments have
  // totalHours === 0 by design and accrue usedHours as students attend; withdrawn
  // enrollments may also have their remaining balance cleared intentionally.
  // The prepaid balance equation only applies to active prepaid enrollments.
  // Hour calculations retain 8 decimal places (minutes / 60). Compare at
  // the same precision so old one-decimal drift is not hidden.
  const enrollmentMismatchCondition = Prisma.sql`e."deletedAt" IS NULL ${scope('s')} AND e."status" = 'ACTIVE' AND e."totalHours" > 0 AND ROUND(e."remainHours"::numeric, 8) != ROUND((e."totalHours" - e."usedHours")::numeric, 8)`
  const [enrollmentMismatchCount, enrollmentMismatch] = await Promise.all([
    prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`SELECT COUNT(*)::bigint AS count FROM "Enrollment" e JOIN "Student" s ON e."studentId" = s."id" WHERE ${enrollmentMismatchCondition}`),
    prisma.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT e."id" FROM "Enrollment" e JOIN "Student" s ON e."studentId" = s."id" WHERE ${enrollmentMismatchCondition} LIMIT 50`),
  ])
  const enrollmentMismatchTotal = Number(enrollmentMismatchCount[0]?.count ?? 0)
  if (enrollmentMismatchTotal > 0) {
    issues.push({
      label: '课时账目不平',
      count: enrollmentMismatchTotal,
      severity: 'high',
      description: '预付课时报名按 8 位小数精度比较后，remainHours 与 totalHours - usedHours 不一致',
      sampleIds: enrollmentMismatch.map((r) => r.id),
    })
  }

  // Surface legacy one-decimal charges and leave-policy drift without applying
  // a bulk correction. Partial deductions may be legitimate when a balance
  // was exhausted, so an administrator must review each affected attendance.
  const attendanceHoursMismatch = await sample<{ id: string; cnt: bigint }>(Prisma.sql`
    WITH attendance_expected AS (
      SELECT a."id", a."hoursDeducted", a."status",
             COALESCE(t."kind"::text, 'REGULAR') AS "termKind",
             CASE
               WHEN g."intensiveMode" = 'INTENSIVE' OR c."type" = 'ONE_ON_ONE'
                 THEN COALESCE(NULLIF(a."actualMinutes", 0), cl."plannedMinutes", g."lessonMinutes", 40)
               ELSE COALESCE(cl."plannedMinutes", g."lessonMinutes", 40)
             END AS "expectedMinutes"
      FROM "Attendance" a
      JOIN "Student" s ON s."id" = a."studentId"
      JOIN "ClassLesson" cl ON cl."id" = a."lessonId"
      JOIN "ClassGroup" g ON g."id" = cl."groupId"
      JOIN "Course" c ON c."id" = g."courseId"
      LEFT JOIN "AcademicTerm" t ON t."id" = g."termId"
      WHERE a."deletedAt" IS NULL AND a."lessonId" IS NOT NULL ${scope('s')}
    ), expected AS (
      SELECT "id", "hoursDeducted",
             CASE
               WHEN "status" = 'PRESENT' THEN ROUND("expectedMinutes"::numeric / 60, 8)
               WHEN "status" IN ('ABSENT', 'LEAVE') AND "termKind" <> 'WEEKEND'
                 THEN ROUND("expectedMinutes"::numeric / 60, 8)
               ELSE 0
             END AS "expectedHours"
      FROM attendance_expected
    )
    SELECT "id", 1 AS cnt
    FROM expected
    WHERE ROUND(COALESCE("hoursDeducted", 0)::numeric, 8) <> ROUND("expectedHours"::numeric, 8)
  `)
  if (attendanceHoursMismatch.length > 0) {
    issues.push({
      label: '考勤课时与批次规则不一致',
      count: total(attendanceHoursMismatch),
      severity: 'high',
      description: '考勤已记课时与当前批次计费规则按 8 位精度计算的目标不一致。余额不足产生的部分扣减可能是合理情况，请逐条核对课时流水后再修正。',
      sampleIds: attendanceHoursMismatch.map((row) => row.id),
    })
  }

  const approvedLeaveWithPresentAttendance = await sample<{ id: string; cnt: bigint }>(Prisma.sql`
    SELECT lr."id", COUNT(DISTINCT a."id")::int AS cnt
    FROM "LeaveRequest" lr
    JOIN "Student" s ON s."id" = lr."studentId"
    JOIN "Attendance" a ON a."studentId" = lr."studentId" AND a."status" = 'PRESENT' AND a."deletedAt" IS NULL
    JOIN "ClassLesson" cl ON cl."id" = a."lessonId"
    WHERE lr."status" = 'approved' AND lr."deletedAt" IS NULL
      AND (
        (lr."lessonId" IS NOT NULL AND lr."lessonId" = cl."id")
        OR (
          lr."lessonId" IS NULL
          AND (lr."leaveDate" + INTERVAL '8 hours')::date = (cl."lessonDate" + INTERVAL '8 hours')::date
        )
      )
      ${scope('s')}
    GROUP BY lr."id"
  `)
  if (approvedLeaveWithPresentAttendance.length > 0) {
    issues.push({
      label: '已批准请假仍记为到课',
      count: total(approvedLeaveWithPresentAttendance),
      severity: 'high',
      description: '已批准的请假申请仍关联到课考勤，需检查批次扣课政策、课时流水和是否应修正考勤状态。',
      sampleIds: approvedLeaveWithPresentAttendance.map((row) => row.id),
    })
  }

  // Student balances are a compatibility snapshot of active enrollments.
  // Keep this separate from the enrollment equation: the two can diverge even
  // when every individual enrollment is internally consistent.
  const snapshotMismatch = await sample<{ id: string; cnt: bigint }>(Prisma.sql`
    SELECT s."id", 1 AS cnt
    FROM "Student" s
    LEFT JOIN "Enrollment" e
      ON e."studentId" = s."id" AND e."status" = 'ACTIVE' AND e."deletedAt" IS NULL
    WHERE s."deletedAt" IS NULL ${scope('s')}
    GROUP BY s."id", s."remainHours", s."totalHours"
    HAVING ROUND(s."remainHours"::numeric, 8) != ROUND(COALESCE(SUM(e."remainHours"), 0)::numeric, 8)
       OR ROUND(s."totalHours"::numeric, 8) != ROUND(COALESCE(SUM(e."totalHours"), 0)::numeric, 8)
  `)
  if (snapshotMismatch.length > 0) {
    issues.push({
      label: '学员课时快照与活跃报名不一致',
      count: total(snapshotMismatch),
      severity: 'high',
      description: '学员兼容快照与有效报名课时汇总不一致，需按报名账本核对后修正快照。',
      sampleIds: snapshotMismatch.map((row) => row.id),
    })
  }

  // 6. Parents with no binding
  const unboundParents = await sample<{ id: string; cnt: bigint }>(Prisma.sql`SELECT u."id", 1 as cnt FROM "User" u LEFT JOIN "Student" s ON (u."id" = s."parentId" OR u."id" = s."parentUserId") AND s."deletedAt" IS NULL WHERE u."role" = 'parent' AND s."id" IS NULL ${scope('u')}`
  )
  if (unboundParents.length > 0) {
    issues.push({
      label: '家长绑定异常',
      count: total(unboundParents),
      severity: 'low',
      description: '角色为parent的用户没有绑定任何学员',
      sampleIds: unboundParents.map((r) => r.id),
    })
  }

  // 7. Resigned teachers with future lessons
  const futureLessonsForResigned = await sample<{ teacherId: string; cnt: bigint }>(Prisma.sql`SELECT cl."teacherId", COUNT(*)::int as cnt FROM "ClassLesson" cl JOIN "Teacher" t ON cl."teacherId" = t."id" WHERE t."status" = 'RESIGNED' AND cl."deletedAt" IS NULL ${scope('t')} AND cl."lessonDate" > NOW() AND cl."status" = 'SCHEDULED' GROUP BY cl."teacherId"`
  )
  if (futureLessonsForResigned.length > 0) {
    issues.push({
      label: '离职教师仍有未来课程',
      count: total(futureLessonsForResigned),
      severity: 'high',
      description: '已离职教师仍有未来的排课',
      sampleIds: futureLessonsForResigned.map((r) => r.teacherId),
    })
  }

  // 8. Archived classes with future lessons
  const archivedClassFutureLessons = await sample<{ groupId: string; cnt: bigint }>(Prisma.sql`SELECT cl."groupId", COUNT(*)::int as cnt FROM "ClassLesson" cl JOIN "ClassGroup" cg ON cl."groupId" = cg."id" WHERE cg."status" = 'ARCHIVED' AND cl."deletedAt" IS NULL ${scope('cg')} AND cl."lessonDate" > NOW() AND cl."status" = 'SCHEDULED' GROUP BY cl."groupId"`
  )
  if (archivedClassFutureLessons.length > 0) {
    issues.push({
      label: '归档班级仍有未来课次',
      count: total(archivedClassFutureLessons),
      severity: 'medium',
      description: '已归档的班级仍有未取消的未来课次',
      sampleIds: archivedClassFutureLessons.map((r) => r.groupId),
    })
  }

  // 9. Deleted papers with visible notifications
  const deletedPaperNotifs = await sample<{ id: string; cnt: bigint }>(Prisma.sql`SELECT n."id", 1 as cnt FROM "Notification" n JOIN "ExamPaper" ep ON n."relatedId" = ep."id" JOIN "Teacher" t ON ep."teacherId" = t."id" WHERE n."deletedAt" IS NULL ${scope('t')} AND n."relatedType" = 'ExamPaper' AND ep."status" = 'DELETED' AND n."status" = 'ACTIVE'`
  )
  if (deletedPaperNotifs.length > 0) {
    issues.push({
      label: '已删试卷仍有可见通知',
      count: total(deletedPaperNotifs),
      severity: 'low',
      description: '试卷已删除但关联通知仍为ACTIVE',
      sampleIds: deletedPaperNotifs.map((r) => r.id),
    })
  }

  // 10. Students with INACTIVE status but active enrollments
  const inactiveStudentEnrollments = await sample<{ enrollmentId: string; cnt: bigint }>(Prisma.sql`SELECT e."id" as "enrollmentId", 1 as cnt FROM "Enrollment" e JOIN "Student" s ON e."studentId" = s."id" WHERE e."deletedAt" IS NULL ${scope('s')} AND s."status" = 'INACTIVE' AND e."status" = 'ACTIVE'`
  )
  if (inactiveStudentEnrollments.length > 0) {
    issues.push({
      label: '停用学员仍有有效报名',
      count: total(inactiveStudentEnrollments),
      severity: 'medium',
      description: '状态为INACTIVE的学员仍有ACTIVE状态的报名记录',
      sampleIds: inactiveStudentEnrollments.map((r) => r.enrollmentId),
    })
  }

  // 11. Possible cross-term duplicate student records. This is a review queue,
  // not an automatic merge: identical names/demographics can still be siblings.
  const identityCandidates = await sample<{ candidateKey: string; studentIds: string[]; cnt: number }>(Prisma.sql`
    SELECT CONCAT_WS('/', COALESCE(s."parentId", s."parentUserId"), LOWER(TRIM(s."name")), COALESCE(s."birthYear"::text, ''), COALESCE(s."gender", '')) AS "candidateKey",
           ARRAY_AGG(s."id" ORDER BY s."createdAt") AS "studentIds",
           COUNT(*)::int AS cnt
    FROM "Student" s
    WHERE s."deletedAt" IS NULL ${scope('s')} AND COALESCE(s."parentId", s."parentUserId") IS NOT NULL AND TRIM(s."name") <> ''
    GROUP BY COALESCE(s."parentId", s."parentUserId"), LOWER(TRIM(s."name")), s."birthYear", s."gender"
    HAVING COUNT(DISTINCT s."identityId") > 1
  `)
  if (identityCandidates.length > 0) {
    issues.push({
      label: '疑似跨批次重复学员（待人工核对）',
      count: total(identityCandidates),
      severity: 'low',
      description: '同一家长下存在姓名、出生年、性别相同但身份 ID 不同的档案。系统不会自动合并；确认是同一孩子后，可在管理端身份合并工具中处理。',
      sampleIds: identityCandidates.flatMap((candidate) => candidate.studentIds),
    })
  }

  // 12. A published course-change event should have one in-app notification per
  // parent recipient. Push delivery is reported separately by the admin API.
  const courseNotificationMismatches = await sample<{ eventId: string; expected: number; actual: number }>(Prisma.sql`
    SELECT e."id" AS "eventId", e."notificationCount" AS expected, COUNT(n."id")::int AS actual
    FROM "CourseChangeEvent" e
    JOIN "ClassGroup" cg ON e."groupId" = cg."id"
    LEFT JOIN "Notification" n ON n."relatedType" = 'COURSE_CHANGE_EVENT' AND n."relatedId" = e."id"
    WHERE TRUE ${scope('cg')}
    GROUP BY e."id", e."notificationCount"
    HAVING COUNT(n."id") <> e."notificationCount"
  `)
  if (courseNotificationMismatches.length > 0) {
    issues.push({
      label: '课程变更通知数量不一致',
      count: total(courseNotificationMismatches),
      severity: 'medium',
      description: '课程变更事件登记的家长通知数与实际站内通知数不一致，需检查家长绑定或通知写入。',
      sampleIds: courseNotificationMismatches.map((row) => row.eventId),
    })
  }

  // Claims are created in the same transaction as feedback, so a stale claim
  // without its feedback indicates legacy/manual data corruption.
  const incompleteFeedbackRequests = await sample<{ clientRequestId: string }>(Prisma.sql`
    SELECT r."clientRequestId"
    FROM "ClassroomFeedbackRequest" r JOIN "User" u ON r."actorUserId" = u."id"
    WHERE r."feedbackId" IS NULL ${scope('u')} AND r."createdAt" < NOW() - INTERVAL '5 minutes'
  `)
  if (incompleteFeedbackRequests.length > 0) {
    issues.push({
      label: '未完成的反馈幂等记录',
      count: total(incompleteFeedbackRequests),
      severity: 'medium',
      description: '存在超过 5 分钟但没有反馈结果的请求占位，需核查事务异常或手工数据。',
      sampleIds: incompleteFeedbackRequests.map((row) => row.clientRequestId),
    })
  }

  return issues
}
