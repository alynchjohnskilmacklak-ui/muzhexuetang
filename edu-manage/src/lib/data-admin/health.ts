import type { PrismaClient } from '@prisma/client'
import { getRequestPrisma } from '@/lib/prisma'

interface HealthIssue {
  label: string
  count: number
  severity: 'high' | 'medium' | 'low'
  description: string
  sampleIds?: string[]
}

export async function runDataHealthCheck(db?: PrismaClient): Promise<HealthIssue[]> {
  const prisma = db ?? await getRequestPrisma()
  const issues: HealthIssue[] = []

  // 1. Duplicate attendance for same lesson+student
  const dupAttendance = await prisma.$queryRawUnsafe<{ studentId: string; lessonId: string; cnt: bigint }[]>(
    `SELECT "studentId", "lessonId", COUNT(*)::int as cnt FROM "Attendance" WHERE "lessonId" IS NOT NULL GROUP BY "studentId", "lessonId" HAVING COUNT(*) > 1 LIMIT 50`
  )
  if (dupAttendance.length > 0) {
    issues.push({
      label: '重复考勤',
      count: dupAttendance.length,
      severity: 'high',
      description: '同一课次同一学生存在多条考勤记录',
      sampleIds: dupAttendance.map((r) => `${r.studentId}/${r.lessonId}`),
    })
  }

  // 2. Orphan notifications (studentId refers to non-existing student)
  const orphanNotifs = await prisma.$queryRawUnsafe<{ id: string; cnt: bigint }[]>(
    `SELECT n."id", 1 as cnt FROM "Notification" n LEFT JOIN "Student" s ON n."studentId" = s."id" WHERE n."studentId" IS NOT NULL AND s."id" IS NULL LIMIT 50`
  )
  if (orphanNotifs.length > 0) {
    issues.push({
      label: '孤儿通知',
      count: orphanNotifs.length,
      severity: 'medium',
      description: '通知关联的学员已不存在',
      sampleIds: orphanNotifs.map((r) => r.id),
    })
  }

  // 3. Orphan exam papers (studentId refers to non-existing student)
  const orphanPapers = await prisma.$queryRawUnsafe<{ id: string; cnt: bigint }[]>(
    `SELECT ep."id", 1 as cnt FROM "ExamPaper" ep LEFT JOIN "Student" s ON ep."studentId" = s."id" WHERE s."id" IS NULL LIMIT 50`
  )
  if (orphanPapers.length > 0) {
    issues.push({
      label: '孤儿试卷',
      count: orphanPapers.length,
      severity: 'medium',
      description: '试卷关联的学员已不存在',
      sampleIds: orphanPapers.map((r) => r.id),
    })
  }

  // 4. Hour anomalies (negative remainHours)
  const negativeHours = await prisma.student.findMany({
    where: { remainHours: { lt: 0 } },
    select: { id: true },
    take: 50,
  })
  if (negativeHours.length > 0) {
    issues.push({
      label: '课时异常（负数）',
      count: negativeHours.length,
      severity: 'high',
      description: '学员剩余课时为负数，需核实修正',
      sampleIds: negativeHours.map((s) => s.id),
    })
  }

  // 5. Enrollment hours mismatch
  const enrollmentMismatch = await prisma.$queryRawUnsafe<{ id: string; cnt: bigint }[]>(
    `SELECT e."id", 1 as cnt FROM "Enrollment" e WHERE e."remainHours" != (e."totalHours" - e."usedHours") LIMIT 50`
  )
  if (enrollmentMismatch.length > 0) {
    issues.push({
      label: '课时账目不平',
      count: enrollmentMismatch.length,
      severity: 'high',
      description: 'Enrollment remainHours 与 totalHours - usedHours 不一致',
      sampleIds: enrollmentMismatch.map((r) => r.id),
    })
  }

  // 6. Parents with no binding
  const unboundParents = await prisma.$queryRawUnsafe<{ id: string; cnt: bigint }[]>(
    `SELECT u."id", 1 as cnt FROM "User" u LEFT JOIN "Student" s ON u."id" = s."parentId" WHERE u."role" = 'parent' AND s."id" IS NULL LIMIT 50`
  )
  if (unboundParents.length > 0) {
    issues.push({
      label: '家长绑定异常',
      count: unboundParents.length,
      severity: 'low',
      description: '角色为parent的用户没有绑定任何学员',
      sampleIds: unboundParents.map((r) => r.id),
    })
  }

  // 7. Resigned teachers with future lessons
  const futureLessonsForResigned = await prisma.$queryRawUnsafe<{ teacherId: string; cnt: bigint }[]>(
    `SELECT cl."teacherId", COUNT(*)::int as cnt FROM "ClassLesson" cl JOIN "Teacher" t ON cl."teacherId" = t."id" WHERE t."status" = 'RESIGNED' AND cl."lessonDate" > NOW() AND cl."status" = 'SCHEDULED' GROUP BY cl."teacherId" LIMIT 50`
  )
  if (futureLessonsForResigned.length > 0) {
    issues.push({
      label: '离职教师仍有未来课程',
      count: futureLessonsForResigned.length,
      severity: 'high',
      description: '已离职教师仍有未来的排课',
      sampleIds: futureLessonsForResigned.map((r) => r.teacherId),
    })
  }

  // 8. Archived classes with future lessons
  const archivedClassFutureLessons = await prisma.$queryRawUnsafe<{ groupId: string; cnt: bigint }[]>(
    `SELECT cl."groupId", COUNT(*)::int as cnt FROM "ClassLesson" cl JOIN "ClassGroup" cg ON cl."groupId" = cg."id" WHERE cg."status" = 'ARCHIVED' AND cl."lessonDate" > NOW() AND cl."status" = 'SCHEDULED' GROUP BY cl."groupId" LIMIT 50`
  )
  if (archivedClassFutureLessons.length > 0) {
    issues.push({
      label: '归档班级仍有未来课次',
      count: archivedClassFutureLessons.length,
      severity: 'medium',
      description: '已归档的班级仍有未取消的未来课次',
      sampleIds: archivedClassFutureLessons.map((r) => r.groupId),
    })
  }

  // 9. Deleted papers with visible notifications
  const deletedPaperNotifs = await prisma.$queryRawUnsafe<{ id: string; cnt: bigint }[]>(
    `SELECT n."id", 1 as cnt FROM "Notification" n JOIN "ExamPaper" ep ON n."relatedId" = ep."id" WHERE n."relatedType" = 'ExamPaper' AND ep."status" = 'DELETED' AND n."status" = 'ACTIVE' LIMIT 50`
  )
  if (deletedPaperNotifs.length > 0) {
    issues.push({
      label: '已删试卷仍有可见通知',
      count: deletedPaperNotifs.length,
      severity: 'low',
      description: '试卷已删除但关联通知仍为ACTIVE',
      sampleIds: deletedPaperNotifs.map((r) => r.id),
    })
  }

  // 10. Students with INACTIVE status but active enrollments
  const inactiveStudentEnrollments = await prisma.$queryRawUnsafe<{ enrollmentId: string; cnt: bigint }[]>(
    `SELECT e."id" as "enrollmentId", 1 as cnt FROM "Enrollment" e JOIN "Student" s ON e."studentId" = s."id" WHERE s."status" = 'INACTIVE' AND e."status" = 'ACTIVE' LIMIT 50`
  )
  if (inactiveStudentEnrollments.length > 0) {
    issues.push({
      label: '停用学员仍有有效报名',
      count: inactiveStudentEnrollments.length,
      severity: 'medium',
      description: '状态为INACTIVE的学员仍有ACTIVE状态的报名记录',
      sampleIds: inactiveStudentEnrollments.map((r) => r.enrollmentId),
    })
  }

  return issues
}
