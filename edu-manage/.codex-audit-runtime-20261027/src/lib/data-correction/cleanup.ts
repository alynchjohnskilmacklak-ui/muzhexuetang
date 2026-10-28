import 'server-only'

import { randomUUID } from 'crypto'
import type { Prisma, PrismaClient } from '@prisma/client'

export const CLEANUP_CATEGORY_META = {
  teacherSalaryTransaction: { label: '教师薪资流水', model: 'teacherSalaryTransaction' },
  attendance: { label: '考勤记录', model: 'attendance' },
  classroomFeedback: { label: '课堂反馈', model: 'classroomFeedback' },
  performancePost: { label: '表现动态', model: 'performancePost' },
  stageSummary: { label: '阶段总结', model: 'stageSummary' },
  notification: { label: '通知消息', model: 'notification' },
  fileAsset: { label: '文件资源', model: 'fileAsset' },
  gradeRecord: { label: '成绩记录', model: 'gradeRecord' },
  examPaper: { label: '试卷', model: 'examPaper' },
  achievementBadge: { label: '成长徽章', model: 'achievementBadge' },
  hourTransaction: { label: '课时记录', model: 'hourTransaction' },
  learningGoal: { label: '学习目标', model: 'learningGoal' },
  leaveRequest: { label: '请假记录', model: 'leaveRequest' },
  fee: { label: '收费记录', model: 'fee' },
} as const

export type CleanupCategoryKey = keyof typeof CLEANUP_CATEGORY_META
export type CleanupScope = { division: 'JUNIOR' | 'SENIOR'; termId?: string; dateFrom?: string; dateTo?: string; classId?: string; studentId?: string }

export function isCleanupCategory(value: string): value is CleanupCategoryKey {
  return value in CLEANUP_CATEGORY_META
}

const dateRange = (scope: CleanupScope) => scope.dateFrom || scope.dateTo ? {
  ...(scope.dateFrom ? { gte: new Date(`${scope.dateFrom}T00:00:00`) } : {}),
  ...(scope.dateTo ? { lt: new Date(new Date(`${scope.dateTo}T00:00:00`).getTime() + 86_400_000) } : {}),
} : undefined

export function cleanupWhere(category: CleanupCategoryKey, scope: CleanupScope): Record<string, unknown> {
  const dates = dateRange(scope)
  const lessonScope = { deletedAt: null, ...(scope.termId ? { group: { termId: scope.termId, deletedAt: null } } : {}), ...(scope.classId ? { groupId: scope.classId } : {}) }
  const studentScope = { division: scope.division, deletedAt: null, ...(scope.studentId ? { id: scope.studentId } : {}), ...(scope.termId ? { termMemberships: { some: { termId: scope.termId } } } : {}), ...(scope.classId ? { enrollments: { some: { groupId: scope.classId, deletedAt: null } } } : {}) }
  switch (category) {
    case 'teacherSalaryTransaction': return { deletedAt: null, teacher: { division: scope.division }, ...(scope.termId ? { termId: scope.termId } : {}), ...(dates ? { lessonDate: dates } : {}), ...(scope.classId ? { lessonId: { in: [] } } : {}) }
    case 'attendance': return { deletedAt: null, student: studentScope, ...(scope.studentId ? { studentId: scope.studentId } : {}), ...(scope.classId || scope.termId ? { lesson: lessonScope } : {}), ...(dates ? { createdAt: dates } : {}) }
    case 'classroomFeedback': return { deletedAt: null, teacher: { division: scope.division }, ...(scope.termId ? { termId: scope.termId } : {}), ...(scope.classId ? { OR: [{ feedbackGroupId: scope.classId }, { classLesson: { groupId: scope.classId } }] } : {}), ...(scope.studentId ? { studentIds: { has: scope.studentId } } : {}), ...(dates ? { createdAt: dates } : {}) }
    case 'performancePost': return { deletedAt: null, teacher: { division: scope.division }, ...(scope.termId ? { termId: scope.termId } : {}), ...(scope.classId ? { classLesson: { groupId: scope.classId } } : {}), ...(scope.studentId ? { studentId: scope.studentId } : {}), ...(dates ? { createdAt: dates } : {}) }
    case 'stageSummary': return { deletedAt: null, student: studentScope, ...(scope.studentId ? { studentId: scope.studentId } : {}), ...(dates ? { createdAt: dates } : {}) }
    case 'notification': return { deletedAt: null, user: { division: scope.division }, ...(scope.studentId ? { studentId: scope.studentId } : {}), ...(dates ? { createdAt: dates } : {}) }
    case 'fileAsset': return { deletedAt: null, tenant: scope.division.toLowerCase(), ...(scope.studentId ? { studentId: scope.studentId } : {}), ...(scope.classId ? { lessonId: { in: [] } } : {}), ...(dates ? { createdAt: dates } : {}) }
    case 'gradeRecord': return { deletedAt: null, student: studentScope, ...(scope.termId ? { termId: scope.termId } : {}), ...(scope.studentId ? { studentId: scope.studentId } : {}), ...(dates ? { createdAt: dates } : {}) }
    case 'examPaper': return { deletedAt: null, teacher: { division: scope.division }, ...(scope.termId ? { termId: scope.termId } : {}), ...(scope.classId ? { classLesson: { groupId: scope.classId } } : {}), ...(scope.studentId ? { studentId: scope.studentId } : {}), ...(dates ? { createdAt: dates } : {}) }
    case 'achievementBadge': return { deletedAt: null, student: studentScope, ...(scope.studentId ? { studentId: scope.studentId } : {}), ...(dates ? { earnedAt: dates } : {}) }
    case 'hourTransaction': return { deletedAt: null, student: studentScope, ...(scope.studentId ? { studentId: scope.studentId } : {}), ...(scope.classId ? { enrollment: { groupId: scope.classId } } : {}), ...(dates ? { createdAt: dates } : {}) }
    case 'learningGoal': return { deletedAt: null, student: studentScope, ...(scope.studentId ? { studentId: scope.studentId } : {}), ...(dates ? { createdAt: dates } : {}) }
    case 'leaveRequest': return { deletedAt: null, student: studentScope, ...(scope.studentId ? { studentId: scope.studentId } : {}), ...(dates ? { leaveDate: dates } : {}) }
    case 'fee': return { deletedAt: null, student: studentScope, ...(scope.termId ? { termId: scope.termId } : {}), ...(scope.studentId ? { studentId: scope.studentId } : {}), ...(dates ? { createdAt: dates } : {}) }
  }
}

type DynamicModel = { count(args: unknown): Promise<number>; updateMany(args: unknown): Promise<{ count: number }> }
const modelFor = (prisma: PrismaClient, key: CleanupCategoryKey) => (prisma as unknown as Record<string, DynamicModel>)[CLEANUP_CATEGORY_META[key].model]

export async function previewCleanup(prisma: PrismaClient, categories: CleanupCategoryKey[], scope: CleanupScope) {
  const classLessonIds = scope.classId ? (await prisma.classLesson.findMany({ where: { groupId: scope.classId, deletedAt: null }, select: { id: true } })).map((item) => item.id) : []
  const counts: Record<string, number> = {}
  for (const category of categories) {
    const where = cleanupWhere(category, scope)
    if (scope.classId && (category === 'teacherSalaryTransaction' || category === 'fileAsset')) {
      ;(where.lessonId as Record<string, unknown>).in = classLessonIds
    }
    counts[category] = await modelFor(prisma, category).count({ where })
  }
  return { counts, total: Object.values(counts).reduce((sum, count) => sum + count, 0) }
}

export async function executeCleanup(prisma: PrismaClient, categories: CleanupCategoryKey[], scope: CleanupScope, userId: string) {
  const preview = await previewCleanup(prisma, categories, scope)
  const deletionBatchId = randomUUID()
  const deletedAt = new Date()
  const classLessonIds = scope.classId ? (await prisma.classLesson.findMany({ where: { groupId: scope.classId, deletedAt: null }, select: { id: true } })).map((item) => item.id) : []
  const results: Record<string, number> = {}
  await prisma.$transaction(async (tx) => {
    for (const category of categories) {
      const where = cleanupWhere(category, scope)
      if (scope.classId && (category === 'teacherSalaryTransaction' || category === 'fileAsset')) {
        ;(where.lessonId as Record<string, unknown>).in = classLessonIds
      }
      const result = await modelFor(tx as unknown as PrismaClient, category).updateMany({ where, data: { deletedAt, deletionBatchId } })
      results[category] = result.count
    }
    const names = categories.map((key) => CLEANUP_CATEGORY_META[key].label)
    await tx.deletedRecord.create({ data: {
      entityType: 'CleanupBatch', entityId: deletionBatchId, entityName: `${scope.termId ? '指定运营批次' : '全部批次'}定向清理`,
      payload: { categories, scope } as Prisma.InputJsonValue, deletedById: userId, reason: 'targeted_test_data_cleanup', deletionBatchId,
      termId: scope.termId || null, impact: { ...preview, summary: `${names.join('、')}，共约 ${preview.total} 条` },
      expiresAt: new Date(deletedAt.getTime() + 30 * 86_400_000),
    } })
  })
  return { deletionBatchId, results, total: preview.total }
}

export async function restoreCleanupBatch(tx: Prisma.TransactionClient, deletionBatchId: string, categories: CleanupCategoryKey[]) {
  for (const category of categories) await modelFor(tx as unknown as PrismaClient, category).updateMany({ where: { deletionBatchId }, data: { deletedAt: null, deletionBatchId: null } })
}
