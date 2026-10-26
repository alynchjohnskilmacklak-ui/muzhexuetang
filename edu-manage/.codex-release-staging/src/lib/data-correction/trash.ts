import 'server-only'

import { randomUUID } from 'crypto'
import type { Prisma, PrismaClient } from '@prisma/client'
import { isCleanupCategory, restoreCleanupBatch, type CleanupCategoryKey } from '@/lib/data-correction/cleanup'

export const TRASH_RETENTION_DAYS = Math.max(1, Number(process.env.TRASH_RETENTION_DAYS || 30))

export type TrashEntityType = 'ClassGroup' | 'Student' | 'ClassLesson' | 'ExamPaper' | 'StudyMaterial' | 'FileAsset'

export interface DeleteImpact {
  lessons?: number
  enrollments?: number
  attendances?: number
  feedbacks?: number
  papers?: number
  schedules?: number
  files?: number
  parentAccount?: number
  summary: string
}

const expiresAtFrom = (deletedAt: Date) => new Date(deletedAt.getTime() + TRASH_RETENTION_DAYS * 86_400_000)

export async function previewDeletion(prisma: PrismaClient, entityType: TrashEntityType, entityId: string) {
  if (entityType === 'ClassGroup') {
    const group = await prisma.classGroup.findFirst({
      where: { id: entityId, deletedAt: null },
      include: {
        course: { select: { name: true } },
        teacherAssignments: { select: { teacherId: true } },
        _count: { select: { classLessons: true, enrollments: true } },
      },
    })
    if (!group) return null
    const lessonIds = (await prisma.classLesson.findMany({ where: { groupId: entityId, deletedAt: null }, select: { id: true } })).map((item) => item.id)
    const [attendances, feedbacks, papers] = await Promise.all([
      lessonIds.length ? prisma.attendance.count({ where: { lessonId: { in: lessonIds }, deletedAt: null } }) : 0,
      lessonIds.length ? prisma.classroomFeedback.count({ where: { classLessonId: { in: lessonIds }, deletedAt: null } }) : 0,
      lessonIds.length ? prisma.examPaper.count({ where: { classLessonId: { in: lessonIds }, deletedAt: null } }) : 0,
    ])
    const impact: DeleteImpact = {
      lessons: group._count.classLessons,
      enrollments: group._count.enrollments,
      attendances,
      feedbacks,
      papers,
      summary: `${group._count.classLessons} 条排课记录、${group._count.enrollments} 名学员归属、${feedbacks} 条课堂反馈`,
    }
    return { entityType, entityId, name: group.name, termId: group.termId, impact }
  }

  if (entityType === 'Student') {
    const student = await prisma.student.findFirst({ where: { id: entityId, deletedAt: null } })
    if (!student) return null
    const [enrollments, attendances, papers, feedbacks] = await Promise.all([
      prisma.enrollment.count({ where: { studentId: entityId, deletedAt: null } }),
      prisma.attendance.count({ where: { studentId: entityId, deletedAt: null } }),
      prisma.examPaper.count({ where: { studentId: entityId, deletedAt: null } }),
      prisma.classroomFeedback.count({ where: { studentIds: { has: entityId }, deletedAt: null } }),
    ])
    const impact: DeleteImpact = {
      enrollments, attendances, papers, feedbacks,
      parentAccount: student.parentUserId ? 1 : 0,
      summary: `${enrollments} 个班级归属、${attendances} 条考勤、${papers} 份试卷${student.parentUserId ? '，关联家长账号将暂停' : ''}`,
    }
    return { entityType, entityId, name: student.name, termId: null, impact }
  }

  if (entityType === 'ClassLesson') {
    const lesson = await prisma.classLesson.findFirst({ where: { id: entityId, deletedAt: null }, include: { group: { select: { name: true, termId: true } } } })
    if (!lesson) return null
    const [attendances, feedbacks, papers] = await Promise.all([
      prisma.attendance.count({ where: { lessonId: entityId, deletedAt: null } }),
      prisma.classroomFeedback.count({ where: { classLessonId: entityId, deletedAt: null } }),
      prisma.examPaper.count({ where: { classLessonId: entityId, deletedAt: null } }),
    ])
    const impact: DeleteImpact = { attendances, feedbacks, papers, summary: `${attendances} 条考勤、${feedbacks} 条课堂反馈、${papers} 份试卷` }
    return { entityType, entityId, name: `${lesson.group.name} ${lesson.startTime}-${lesson.endTime}`, termId: lesson.group.termId, impact }
  }

  const model = entityType === 'ExamPaper' ? prisma.examPaper : entityType === 'StudyMaterial' ? prisma.studyMaterial : prisma.fileAsset
  const item = await (model as typeof prisma.examPaper).findFirst({ where: { id: entityId, deletedAt: null } })
  if (!item) return null
  const record = item as unknown as Record<string, unknown>
  const impact: DeleteImpact = { files: 1, summary: '1 个文件资源' }
  return { entityType, entityId, name: String(record.title || record.originalName || record.filename || entityId), termId: record.termId as string | null | undefined, impact }
}

export async function softDeleteEntity(
  prisma: PrismaClient,
  entityType: TrashEntityType,
  entityId: string,
  user: { id: string; name?: string | null },
  reason = '管理员手动删除',
) {
  const preview = await previewDeletion(prisma, entityType, entityId)
  if (!preview) throw new Error('记录不存在或已进入回收站')
  const deletedAt = new Date()
  const deletionBatchId = randomUUID()

  return prisma.$transaction(async (tx) => {
    let payload: Record<string, unknown> = { deletedAt: deletedAt.toISOString() }
    if (entityType === 'ClassGroup') {
      const group = await tx.classGroup.findUniqueOrThrow({
        where: { id: entityId },
        include: { course: true, teacherAssignments: { select: { teacherId: true } }, classLessons: true, enrollments: true },
      })
      const lessonIds = group.classLessons.map((item) => item.id)
      const [papers, feedbacks, materials] = await Promise.all([
        tx.examPaper.findMany({ where: { classLessonId: { in: lessonIds }, deletedAt: null }, select: { id: true, status: true } }),
        tx.classroomFeedback.findMany({ where: { classLessonId: { in: lessonIds }, deletedAt: null }, select: { id: true, status: true } }),
        tx.studyMaterial.findMany({ where: { classLessonId: { in: lessonIds }, deletedAt: null }, select: { id: true, status: true } }),
      ])
      payload = {
        ...payload,
        groupStatus: group.status,
        lessonStatuses: Object.fromEntries(group.classLessons.map((item) => [item.id, item.status])),
        enrollmentStatuses: Object.fromEntries(group.enrollments.map((item) => [item.id, item.status])),
        paperStatuses: Object.fromEntries(papers.map((item) => [item.id, item.status])),
        feedbackStatuses: Object.fromEntries(feedbacks.map((item) => [item.id, item.status])),
        materialStatuses: Object.fromEntries(materials.map((item) => [item.id, item.status])),
      }
      await tx.classGroup.update({ where: { id: entityId }, data: { deletedAt, deletedById: user.id, deletionBatchId, status: 'ARCHIVED' } })
      await tx.classLesson.updateMany({ where: { groupId: entityId, deletedAt: null }, data: { deletedAt, deletedById: user.id, deletionBatchId, status: 'CANCELLED', cancelReason: '班级已删除并进入回收站' } })
      await tx.enrollment.updateMany({ where: { groupId: entityId, deletedAt: null }, data: { deletedAt, deletedById: user.id, deletionBatchId, status: 'WITHDRAWN' } })
      await tx.examPaper.updateMany({ where: { classLessonId: { in: lessonIds }, deletedAt: null }, data: { deletedAt, deletedById: user.id, deletionBatchId, status: 'DELETED' } })
      await tx.classroomFeedback.updateMany({ where: { classLessonId: { in: lessonIds }, deletedAt: null }, data: { deletedAt, deletionBatchId, status: 'ARCHIVED' } })
      await tx.performancePost.updateMany({ where: { classLessonId: { in: lessonIds }, deletedAt: null }, data: { deletedAt, deletedById: user.id, deletionBatchId } })
      await tx.studyMaterial.updateMany({ where: { classLessonId: { in: lessonIds }, deletedAt: null }, data: { deletedAt, deletedById: user.id, deletionBatchId, status: 'DELETED' } })
    } else if (entityType === 'Student') {
      const student = await tx.student.findUniqueOrThrow({ where: { id: entityId }, select: { status: true, parentUserId: true } })
      const parent = student.parentUserId ? await tx.user.findUnique({ where: { id: student.parentUserId }, select: { status: true } }) : null
      payload = { ...payload, studentStatus: student.status, parentUserId: student.parentUserId, parentStatus: parent?.status }
      await tx.student.update({ where: { id: entityId }, data: { deletedAt, deletedById: user.id, deletionBatchId, status: 'INACTIVE', leftAt: deletedAt, mainTeacherId: null } })
      await tx.enrollment.updateMany({ where: { studentId: entityId, status: 'ACTIVE', deletedAt: null }, data: { deletedAt, deletedById: user.id, deletionBatchId, status: 'WITHDRAWN' } })
      if (student.parentUserId) await tx.user.update({ where: { id: student.parentUserId }, data: { status: 'disabled' } })
    } else if (entityType === 'ClassLesson') {
      const lesson = await tx.classLesson.findUniqueOrThrow({ where: { id: entityId }, select: { status: true, cancelReason: true } })
      const [papers, feedbacks, materials] = await Promise.all([
        tx.examPaper.findMany({ where: { classLessonId: entityId, deletedAt: null }, select: { id: true, status: true } }),
        tx.classroomFeedback.findMany({ where: { classLessonId: entityId, deletedAt: null }, select: { id: true, status: true } }),
        tx.studyMaterial.findMany({ where: { classLessonId: entityId, deletedAt: null }, select: { id: true, status: true } }),
      ])
      payload = { ...payload, status: lesson.status, cancelReason: lesson.cancelReason, paperStatuses: Object.fromEntries(papers.map((item) => [item.id, item.status])), feedbackStatuses: Object.fromEntries(feedbacks.map((item) => [item.id, item.status])), materialStatuses: Object.fromEntries(materials.map((item) => [item.id, item.status])) }
      await tx.classLesson.update({ where: { id: entityId }, data: { deletedAt, deletedById: user.id, deletionBatchId, status: 'CANCELLED', cancelReason: '课次已删除并进入回收站' } })
      await tx.examPaper.updateMany({ where: { classLessonId: entityId, deletedAt: null }, data: { deletedAt, deletedById: user.id, deletionBatchId, status: 'DELETED' } })
      await tx.classroomFeedback.updateMany({ where: { classLessonId: entityId, deletedAt: null }, data: { deletedAt, deletionBatchId, status: 'ARCHIVED' } })
      await tx.performancePost.updateMany({ where: { classLessonId: entityId, deletedAt: null }, data: { deletedAt, deletedById: user.id, deletionBatchId } })
      await tx.studyMaterial.updateMany({ where: { classLessonId: entityId, deletedAt: null }, data: { deletedAt, deletedById: user.id, deletionBatchId, status: 'DELETED' } })
    } else if (entityType === 'ExamPaper') {
      const item = await tx.examPaper.findUniqueOrThrow({ where: { id: entityId }, select: { status: true } })
      payload = { ...payload, status: item.status }
      await tx.examPaper.update({ where: { id: entityId }, data: { deletedAt, deletedById: user.id, deletionBatchId, status: 'DELETED' } })
    } else if (entityType === 'StudyMaterial') {
      const item = await tx.studyMaterial.findUniqueOrThrow({ where: { id: entityId }, select: { status: true } })
      payload = { ...payload, status: item.status }
      await tx.studyMaterial.update({ where: { id: entityId }, data: { deletedAt, deletedById: user.id, deletionBatchId, status: 'DELETED' } })
    } else {
      await tx.fileAsset.update({ where: { id: entityId }, data: { deletedAt, deletedById: user.id, deletionBatchId } })
    }

    await tx.deletedRecord.create({
      data: {
        entityType,
        entityId,
        entityName: preview.name,
        payload: payload as Prisma.InputJsonValue,
        deletedById: user.id,
        reason,
        deletionBatchId,
        termId: preview.termId || null,
        impact: preview.impact as unknown as Prisma.InputJsonValue,
        expiresAt: expiresAtFrom(deletedAt),
      },
    })
    await tx.activityLog.create({ data: { userId: user.id, action: 'SOFT_DELETE', entityType, entityId, detail: `${preview.name} 已进入回收站`, metadata: { deletionBatchId, impact: preview.impact } as unknown as Prisma.InputJsonValue } })
    return { deletionBatchId, deletedAt, expiresAt: expiresAtFrom(deletedAt), impact: preview.impact }
  })
}

export async function restoreTrashRecord(prisma: PrismaClient, recordId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.deletedRecord.findUniqueOrThrow({ where: { id: recordId } })
    const batchId = record.deletionBatchId
    if (!batchId) throw new Error('该记录不支持批次恢复')
    const payload = record.payload as Record<string, unknown>
    if (record.entityType === 'CleanupBatch') {
      const categories = Array.isArray(payload.categories) ? payload.categories.filter((value): value is CleanupCategoryKey => typeof value === 'string' && isCleanupCategory(value)) : []
      await restoreCleanupBatch(tx, batchId, categories)
    } else if (record.entityType === 'ClassGroup') {
      const lessonStatuses = (payload.lessonStatuses || {}) as Record<string, string>
      const enrollmentStatuses = (payload.enrollmentStatuses || {}) as Record<string, string>
      const paperStatuses = (payload.paperStatuses || {}) as Record<string, string>
      const feedbackStatuses = (payload.feedbackStatuses || {}) as Record<string, string>
      const materialStatuses = (payload.materialStatuses || {}) as Record<string, string>
      await tx.classGroup.update({ where: { id: record.entityId }, data: { deletedAt: null, deletedById: null, deletionBatchId: null, status: String(payload.groupStatus || 'ACTIVE') as never } })
      for (const [id, status] of Object.entries(lessonStatuses)) await tx.classLesson.update({ where: { id }, data: { deletedAt: null, deletedById: null, deletionBatchId: null, status: status as never, cancelReason: null } })
      for (const [id, status] of Object.entries(enrollmentStatuses)) await tx.enrollment.update({ where: { id }, data: { deletedAt: null, deletedById: null, deletionBatchId: null, status: status as never } })
      for (const [id, status] of Object.entries(paperStatuses)) await tx.examPaper.update({ where: { id }, data: { deletedAt: null, deletedById: null, deletionBatchId: null, status: status as never } })
      for (const [id, status] of Object.entries(feedbackStatuses)) await tx.classroomFeedback.update({ where: { id }, data: { deletedAt: null, deletionBatchId: null, status } })
      for (const [id, status] of Object.entries(materialStatuses)) await tx.studyMaterial.update({ where: { id }, data: { deletedAt: null, deletedById: null, deletionBatchId: null, status: status as never } })
      await tx.performancePost.updateMany({ where: { deletionBatchId: batchId }, data: { deletedAt: null, deletedById: null, deletionBatchId: null } })
    } else if (record.entityType === 'Student') {
      await tx.student.update({ where: { id: record.entityId }, data: { deletedAt: null, deletedById: null, deletionBatchId: null, status: String(payload.studentStatus || 'ACTIVE'), leftAt: null } })
      await tx.enrollment.updateMany({ where: { deletionBatchId: batchId }, data: { deletedAt: null, deletedById: null, deletionBatchId: null, status: 'ACTIVE' } })
      if (payload.parentUserId) await tx.user.update({ where: { id: String(payload.parentUserId) }, data: { status: String(payload.parentStatus || 'active') } })
    } else if (record.entityType === 'ClassLesson') {
      await tx.classLesson.update({ where: { id: record.entityId }, data: { deletedAt: null, deletedById: null, deletionBatchId: null, status: String(payload.status || 'SCHEDULED') as never, cancelReason: (payload.cancelReason as string | null) || null } })
      const paperStatuses = (payload.paperStatuses || {}) as Record<string, string>
      const feedbackStatuses = (payload.feedbackStatuses || {}) as Record<string, string>
      const materialStatuses = (payload.materialStatuses || {}) as Record<string, string>
      for (const [id, status] of Object.entries(paperStatuses)) await tx.examPaper.update({ where: { id }, data: { deletedAt: null, deletedById: null, deletionBatchId: null, status: status as never } })
      for (const [id, status] of Object.entries(feedbackStatuses)) await tx.classroomFeedback.update({ where: { id }, data: { deletedAt: null, deletionBatchId: null, status } })
      for (const [id, status] of Object.entries(materialStatuses)) await tx.studyMaterial.update({ where: { id }, data: { deletedAt: null, deletedById: null, deletionBatchId: null, status: status as never } })
      await tx.performancePost.updateMany({ where: { deletionBatchId: batchId }, data: { deletedAt: null, deletedById: null, deletionBatchId: null } })
    } else if (record.entityType === 'ExamPaper') {
      await tx.examPaper.update({ where: { id: record.entityId }, data: { deletedAt: null, deletedById: null, deletionBatchId: null, status: String(payload.status || 'PUBLISHED') as never } })
    } else if (record.entityType === 'StudyMaterial') {
      await tx.studyMaterial.update({ where: { id: record.entityId }, data: { deletedAt: null, deletedById: null, deletionBatchId: null, status: String(payload.status || 'PUBLISHED') as never } })
    } else if (record.entityType === 'FileAsset') {
      await tx.fileAsset.update({ where: { id: record.entityId }, data: { deletedAt: null, deletedById: null, deletionBatchId: null } })
    }
    await tx.deletedRecord.delete({ where: { id: recordId } })
    await tx.activityLog.create({ data: { userId, action: 'TRASH_RESTORE', entityType: record.entityType, entityId: record.entityId, detail: `${record.entityName || record.entityId} 已从回收站恢复` } })
    return record
  })
}

async function purgeLessonTree(tx: Prisma.TransactionClient, lessonIds: string[]) {
  if (!lessonIds.length) return
  const attendanceIds = (await tx.attendance.findMany({ where: { lessonId: { in: lessonIds } }, select: { id: true } })).map((item) => item.id)
  if (attendanceIds.length) await tx.makeupRequest.deleteMany({ where: { attendanceId: { in: attendanceIds } } })
  await tx.teacherSalaryTransaction.deleteMany({ where: { lessonId: { in: lessonIds } } })
  await tx.intensiveLessonReview.deleteMany({ where: { lessonId: { in: lessonIds } } })
  const adjustmentIds = (await tx.lessonSettlementAdjustment.findMany({ where: { lessonId: { in: lessonIds } }, select: { id: true } })).map((item) => item.id)
  if (adjustmentIds.length) await tx.teacherSalaryTransaction.deleteMany({ where: { adjustmentId: { in: adjustmentIds } } })
  await tx.lessonSettlementAdjustment.deleteMany({ where: { lessonId: { in: lessonIds } } })
  await tx.classLessonStudent.deleteMany({ where: { lessonId: { in: lessonIds } } })
  await tx.attendance.deleteMany({ where: { lessonId: { in: lessonIds } } })
  await tx.postComment.deleteMany({ where: { post: { classLessonId: { in: lessonIds } } } })
  await tx.postReaction.deleteMany({ where: { post: { classLessonId: { in: lessonIds } } } })
  await tx.postBadge.deleteMany({ where: { post: { classLessonId: { in: lessonIds } } } })
  await tx.performancePost.deleteMany({ where: { classLessonId: { in: lessonIds } } })
  await tx.paperComment.deleteMany({ where: { paper: { classLessonId: { in: lessonIds } } } })
  await tx.paperReaction.deleteMany({ where: { paper: { classLessonId: { in: lessonIds } } } })
  await tx.paperQuestion.deleteMany({ where: { paper: { classLessonId: { in: lessonIds } } } })
  await tx.weaknessRecord.deleteMany({ where: { paper: { classLessonId: { in: lessonIds } } } })
  await tx.examPaper.deleteMany({ where: { classLessonId: { in: lessonIds } } })
  await tx.parentMessage.deleteMany({ where: { feedback: { classLessonId: { in: lessonIds } } } })
  await tx.classroomFeedback.deleteMany({ where: { classLessonId: { in: lessonIds } } })
  await tx.studyMaterial.updateMany({ where: { classLessonId: { in: lessonIds } }, data: { classLessonId: null, isLessonPreview: false } })
  await tx.classLesson.deleteMany({ where: { id: { in: lessonIds } } })
}

async function purgeCleanupBatch(tx: Prisma.TransactionClient, batchId: string, categories: CleanupCategoryKey[]) {
  for (const category of categories) {
    if (category === 'teacherSalaryTransaction') await tx.teacherSalaryTransaction.deleteMany({ where: { deletionBatchId: batchId } })
    else if (category === 'attendance') {
      await tx.makeupRequest.deleteMany({ where: { attendance: { deletionBatchId: batchId } } })
      await tx.attendance.deleteMany({ where: { deletionBatchId: batchId } })
    } else if (category === 'classroomFeedback') {
      await tx.teacherSalaryTransaction.deleteMany({ where: { feedbackId: { in: (await tx.classroomFeedback.findMany({ where: { deletionBatchId: batchId }, select: { id: true } })).map((item) => item.id) } } })
      await tx.parentMessage.deleteMany({ where: { feedback: { deletionBatchId: batchId } } })
      await tx.classroomFeedback.deleteMany({ where: { deletionBatchId: batchId } })
    } else if (category === 'performancePost') {
      await tx.postComment.deleteMany({ where: { post: { deletionBatchId: batchId } } })
      await tx.postReaction.deleteMany({ where: { post: { deletionBatchId: batchId } } })
      await tx.postBadge.deleteMany({ where: { post: { deletionBatchId: batchId } } })
      await tx.performancePost.deleteMany({ where: { deletionBatchId: batchId } })
    } else if (category === 'stageSummary') await tx.stageSummary.deleteMany({ where: { deletionBatchId: batchId } })
    else if (category === 'notification') await tx.notification.deleteMany({ where: { deletionBatchId: batchId } })
    else if (category === 'fileAsset') await tx.fileAsset.deleteMany({ where: { deletionBatchId: batchId } })
    else if (category === 'gradeRecord') {
      await tx.dimensionScore.deleteMany({ where: { grade: { deletionBatchId: batchId } } })
      await tx.classHighlight.deleteMany({ where: { grade: { deletionBatchId: batchId } } })
      await tx.gradeRecord.deleteMany({ where: { deletionBatchId: batchId } })
    } else if (category === 'examPaper') {
      await tx.paperComment.deleteMany({ where: { paper: { deletionBatchId: batchId } } })
      await tx.paperReaction.deleteMany({ where: { paper: { deletionBatchId: batchId } } })
      await tx.paperQuestion.deleteMany({ where: { paper: { deletionBatchId: batchId } } })
      await tx.weaknessRecord.deleteMany({ where: { paper: { deletionBatchId: batchId } } })
      await tx.examPaper.deleteMany({ where: { deletionBatchId: batchId } })
    } else if (category === 'achievementBadge') await tx.achievementBadge.deleteMany({ where: { deletionBatchId: batchId } })
    else if (category === 'hourTransaction') await tx.hourTransaction.deleteMany({ where: { deletionBatchId: batchId } })
    else if (category === 'learningGoal') await tx.learningGoal.deleteMany({ where: { deletionBatchId: batchId } })
    else if (category === 'leaveRequest') await tx.leaveRequest.deleteMany({ where: { deletionBatchId: batchId } })
    else if (category === 'fee') await tx.fee.deleteMany({ where: { deletionBatchId: batchId } })
  }
}

export async function purgeTrashRecord(prisma: PrismaClient, recordId: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.deletedRecord.findUniqueOrThrow({ where: { id: recordId } })
    if (record.entityType === 'CleanupBatch') {
      const payload = record.payload as Record<string, unknown>
      const categories = Array.isArray(payload.categories) ? payload.categories.filter((value): value is CleanupCategoryKey => typeof value === 'string' && isCleanupCategory(value)) : []
      if (!record.deletionBatchId) throw new Error('清理批次标识缺失')
      await purgeCleanupBatch(tx, record.deletionBatchId, categories)
    } else if (record.entityType === 'ClassGroup') {
      const lessonIds = (await tx.classLesson.findMany({ where: { groupId: record.entityId, deletedAt: { not: null } }, select: { id: true } })).map((item) => item.id)
      await purgeLessonTree(tx, lessonIds)
      const enrollmentIds = (await tx.enrollment.findMany({ where: { groupId: record.entityId, deletedAt: { not: null } }, select: { id: true } })).map((item) => item.id)
      if (enrollmentIds.length) await tx.hourTransaction.updateMany({ where: { enrollmentId: { in: enrollmentIds } }, data: { enrollmentId: null } })
      await tx.classHighlight.deleteMany({ where: { groupId: record.entityId } })
      const assessmentIds = (await tx.assessment.findMany({ where: { groupId: record.entityId }, select: { id: true } })).map((item) => item.id)
      if (assessmentIds.length) {
        const gradeIds = (await tx.gradeRecord.findMany({ where: { assessmentId: { in: assessmentIds } }, select: { id: true } })).map((item) => item.id)
        if (gradeIds.length) {
          await tx.dimensionScore.deleteMany({ where: { gradeId: { in: gradeIds } } })
          await tx.classHighlight.deleteMany({ where: { gradeId: { in: gradeIds } } })
          await tx.gradeRecord.deleteMany({ where: { id: { in: gradeIds } } })
        }
        await tx.assessment.deleteMany({ where: { id: { in: assessmentIds } } })
      }
      await tx.enrollment.deleteMany({ where: { groupId: record.entityId } })
      await tx.classGroupTeacher.deleteMany({ where: { groupId: record.entityId } })
      await tx.classGroup.delete({ where: { id: record.entityId } })
    } else if (record.entityType === 'ClassLesson') {
      await purgeLessonTree(tx, [record.entityId])
    } else if (record.entityType === 'ExamPaper') {
      await tx.paperComment.deleteMany({ where: { paperId: record.entityId } })
      await tx.paperReaction.deleteMany({ where: { paperId: record.entityId } })
      await tx.paperQuestion.deleteMany({ where: { paperId: record.entityId } })
      await tx.weaknessRecord.deleteMany({ where: { paperId: record.entityId } })
      await tx.examPaper.delete({ where: { id: record.entityId } })
    } else if (record.entityType === 'StudyMaterial') {
      await tx.studyMaterial.delete({ where: { id: record.entityId } })
    } else if (record.entityType === 'FileAsset') {
      await tx.fileAsset.delete({ where: { id: record.entityId } })
    } else if (record.entityType === 'Student') {
      await tx.makeupRequest.deleteMany({ where: { studentId: record.entityId } })
      await tx.attendance.deleteMany({ where: { studentId: record.entityId } })
      await tx.classLessonStudent.deleteMany({ where: { studentId: record.entityId } })
      await tx.enrollment.deleteMany({ where: { studentId: record.entityId } })
      await tx.student.update({ where: { id: record.entityId }, data: { parentId: null, parentUserId: null, mainTeacherId: null } })
      await tx.student.delete({ where: { id: record.entityId } })
    } else {
      throw new Error('不支持彻底删除该类型')
    }
    await tx.deletedRecord.delete({ where: { id: recordId } })
    await tx.activityLog.create({ data: { userId, action: 'TRASH_PURGE', entityType: record.entityType, entityId: record.entityId, detail: `${record.entityName || record.entityId} 已彻底删除` } })
    return record
  })
}

export async function cleanupExpiredTrash(prisma: PrismaClient, userId: string) {
  const records = await prisma.deletedRecord.findMany({ where: { expiresAt: { lte: new Date() } }, orderBy: { expiresAt: 'asc' }, take: 100 })
  let purged = 0
  const errors: Array<{ id: string; error: string }> = []
  for (const record of records) {
    try {
      await purgeTrashRecord(prisma, record.id, userId)
      purged++
    } catch (error) {
      errors.push({ id: record.id, error: error instanceof Error ? error.message : '清理失败' })
    }
  }
  return { scanned: records.length, purged, errors }
}
