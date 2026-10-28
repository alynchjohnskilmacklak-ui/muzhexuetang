import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
vi.mock('server-only', () => ({}))
vi.mock('@/lib/data-correction/cleanup', () => ({ isCleanupCategory: vi.fn(), restoreCleanupBatch: vi.fn() }))
import { cleanupExpiredTrash, purgeTrashRecord, restoreTrashRecord, softDeleteEntity, TrashPurgeBlockedError } from './trash'

function makeClassGroupDeleteDb() {
  const tx = {
    classGroup: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: 'group-1', status: 'ACTIVE', course: {}, teacherAssignments: [],
        classLessons: [{ id: 'lesson-1', status: 'CANCELLED', cancelReason: '家长临时请假' }],
        enrollments: [],
      }),
      update: vi.fn(),
    },
    classLesson: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    enrollment: { updateMany: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    examPaper: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn() },
    classroomFeedback: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn() },
    studyMaterial: { findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn() },
    performancePost: { updateMany: vi.fn() },
    deletedRecord: { create: vi.fn().mockResolvedValue({ id: 'trash-group' }) },
    activityLog: { create: vi.fn() },
  }
  const db = {
    classGroup: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'group-1', name: '周末数学班', termId: 'term-1', status: 'ACTIVE', course: { name: '数学' },
        teacherAssignments: [], _count: { classLessons: 1, enrollments: 0 },
      }),
    },
    classLesson: { findMany: vi.fn().mockResolvedValue([{ id: 'lesson-1' }]) },
    attendance: { count: vi.fn().mockResolvedValue(0) },
    classroomFeedback: { count: vi.fn().mockResolvedValue(0) },
    examPaper: { count: vi.fn().mockResolvedValue(0) },
    $transaction: vi.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  }
  return { db: db as unknown as PrismaClient, tx }
}

function makeClassGroupRestoreDb(payload: Record<string, unknown>, currentCancelReason: string | null) {
  const tx = {
    deletedRecord: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: 'trash-group', entityType: 'ClassGroup', entityId: 'group-1', deletionBatchId: 'batch-1', payload,
        entityName: '周末数学班',
      }),
      delete: vi.fn(),
    },
    classGroup: {
      findUnique: vi.fn().mockResolvedValue({ deletionBatchId: 'batch-1' }),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn(),
    },
    classLesson: {
      findMany: vi.fn().mockResolvedValue([{ id: 'lesson-1', cancelReason: currentCancelReason }]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    enrollment: { updateMany: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    examPaper: { updateMany: vi.fn() },
    classroomFeedback: { updateMany: vi.fn() },
    studyMaterial: { updateMany: vi.fn() },
    performancePost: { updateMany: vi.fn() },
    activityLog: { create: vi.fn() },
  }
  const db = {
    $transaction: vi.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  }
  return { db: db as unknown as PrismaClient, tx }
}

function makeStudentPurgeDb(hourTransactionCounts: [number, number] = [1, 0]) {
  const count = vi.fn().mockResolvedValue(0)
  const hourTransactionCount = vi.fn()
    .mockResolvedValueOnce(hourTransactionCounts[0])
    .mockResolvedValueOnce(hourTransactionCounts[1])
  const reference = (countFn: typeof count = count) => ({ count: countFn, deleteMany: vi.fn(), updateMany: vi.fn() })
  const tx = {
    deletedRecord: {
      findUniqueOrThrow: vi.fn().mockResolvedValue({
        id: 'trash-student', entityType: 'Student', entityId: 'student-1', deletionBatchId: 'batch-student', payload: {},
      }),
      delete: vi.fn(),
    },
    classLessonStudent: reference(),
    enrollment: reference(),
    attendance: reference(),
    makeupRequest: reference(),
    hourTransaction: reference(hourTransactionCount),
    gradeRecord: reference(),
    classHighlight: reference(),
    fee: reference(),
    performancePost: reference(),
    achievementBadge: reference(),
    examPaper: reference(),
    learningGoal: reference(),
    weaknessRecord: reference(),
    stageSummary: reference(),
    leaveRequest: reference(),
    parentMealChoice: reference(),
    studentMealAttendance: reference(),
    studentTermMembership: reference(),
    studyHallPlan: reference(),
    studyHallRecord: reference(),
    studyHallClassStudent: reference(),
    studyHallHomeworkEntry: reference(),
    feedbackRewardRecord: reference(),
    masteryRecord: reference(),
    practiceResult: reference(),
    practiceAttempt: reference(),
    parentMessage: reference(),
    courseChangeEvent: reference(),
    notification: { count: vi.fn() },
    fileAsset: reference(),
    classroomFeedback: reference(),
    student: { update: vi.fn(), delete: vi.fn() },
    activityLog: { create: vi.fn() },
    studyMaterial: { delete: vi.fn() },
  }
  const db = {
    deletedRecord: {
      findMany: vi.fn().mockResolvedValue([{ id: 'trash-student' }, { id: 'trash-material' }]),
    },
    $transaction: vi.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
  }
  tx.deletedRecord.findUniqueOrThrow
    .mockResolvedValueOnce({ id: 'trash-student', entityType: 'Student', entityId: 'student-1', deletionBatchId: 'batch-student', payload: {} })
    .mockResolvedValueOnce({ id: 'trash-material', entityType: 'StudyMaterial', entityId: 'material-1', deletionBatchId: 'batch-material', payload: {}, entityName: '讲义' })
  return { db: db as unknown as PrismaClient, tx }
}

function expectNoStudentHistoryMutations(tx: ReturnType<typeof makeStudentPurgeDb>['tx']) {
  const relatedModels = [
    tx.classLessonStudent, tx.enrollment, tx.hourTransaction, tx.attendance, tx.makeupRequest,
    tx.gradeRecord, tx.classHighlight, tx.fee, tx.performancePost, tx.achievementBadge,
    tx.examPaper, tx.learningGoal, tx.weaknessRecord, tx.stageSummary, tx.leaveRequest,
    tx.parentMealChoice, tx.studentMealAttendance, tx.studentTermMembership,
    tx.studyHallPlan, tx.studyHallRecord, tx.studyHallClassStudent, tx.studyHallHomeworkEntry,
    tx.feedbackRewardRecord, tx.masteryRecord, tx.practiceResult, tx.practiceAttempt,
    tx.parentMessage, tx.courseChangeEvent, tx.fileAsset, tx.classroomFeedback,
  ]
  for (const model of relatedModels) {
    expect(model.deleteMany).not.toHaveBeenCalled()
    expect(model.updateMany).not.toHaveBeenCalled()
  }
}

describe('family-safe student trash and batch-specific recovery', () => {
  const makeDb = () => {
    const tx = {
      student: {
        findFirst: vi.fn().mockResolvedValue({ id: 's1', name: '学员', parentId: 'parent1', parentUserId: 'parent1' }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({ status: 'ACTIVE', parentId: 'parent1', parentUserId: 'parent1', mainTeacherId: 'teacher1', leftAt: null }),
        findUnique: vi.fn().mockResolvedValue({ deletionBatchId: 'batch1' }),
        count: vi.fn().mockResolvedValue(1), update: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      enrollment: { count: vi.fn().mockResolvedValue(1), updateMany: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
      attendance: { count: vi.fn().mockResolvedValue(1) },
      examPaper: { count: vi.fn().mockResolvedValue(0) },
      classroomFeedback: { count: vi.fn().mockResolvedValue(0) },
      user: { findUnique: vi.fn().mockResolvedValue({ status: 'active' }), update: vi.fn(), updateMany: vi.fn() },
      deletedRecord: { create: vi.fn().mockResolvedValue({ id: 'trash1' }), findUniqueOrThrow: vi.fn(), delete: vi.fn() },
      activityLog: { create: vi.fn() },
    }
    return { tx, db: { ...tx, $transaction: async (fn: (client: typeof tx) => unknown) => fn(tx) } as unknown as PrismaClient }
  }
  beforeEach(() => vi.clearAllMocks())
  it('does not disable a parent who still has another valid child', async () => {
    const { db, tx } = makeDb()
    await softDeleteEntity(db, 'Student', 's1', { id: 'admin' }, '重复档案')
    expect(tx.user.update).not.toHaveBeenCalled()
    expect(tx.deletedRecord.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ payload: expect.objectContaining({ studentStatus: 'ACTIVE', mainTeacherId: 'teacher1', parentStatuses: {} }) }) }))
  })
  it('only pauses the parent once when the last child is deleted', async () => {
    const { db, tx } = makeDb()
    tx.student.count.mockResolvedValue(0)
    await softDeleteEntity(db, 'Student', 's1', { id: 'admin' }, '离开机构')
    expect(tx.user.update).toHaveBeenCalledTimes(1)
    expect(tx.deletedRecord.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ payload: expect.objectContaining({ parentStatuses: { parent1: 'active' } }) }) }))
  })
  it('does not create another deletion batch when a concurrent request already claimed the record', async () => {
    const { db, tx } = makeDb()
    tx.student.updateMany.mockResolvedValue({ count: 0 })
    await expect(softDeleteEntity(db, 'Student', 's1', { id: 'admin' }, '重复点击')).rejects.toThrow(/未重复删除/)
    expect(tx.deletedRecord.create).not.toHaveBeenCalled()
  })
  it('restores only associations belonging to the original deletion batch', async () => {
    const { db, tx } = makeDb()
    tx.deletedRecord.findUniqueOrThrow.mockResolvedValue({ id: 'trash1', entityType: 'Student', entityId: 's1', deletionBatchId: 'batch1', payload: { studentStatus: 'ACTIVE', mainTeacherId: 'teacher1', parentStatuses: { parent1: 'active' } } })
    await restoreTrashRecord(db, 'trash1', 'admin')
    expect(tx.enrollment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { deletionBatchId: 'batch1' } }))
    expect(tx.student.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ deletedAt: null, mainTeacherId: 'teacher1' }) }))
    expect(tx.user.updateMany).toHaveBeenCalledWith({ where: { id: 'parent1', status: 'disabled' }, data: { status: 'active' } })
  })
  it('does not overwrite a newer deletion batch while restoring an older record', async () => {
    const { db, tx } = makeDb()
    tx.student.findUnique.mockResolvedValue({ deletionBatchId: 'new-batch' })
    tx.deletedRecord.findUniqueOrThrow.mockResolvedValue({ id: 'trash1', entityType: 'Student', entityId: 's1', deletionBatchId: 'batch1', payload: {} })
    await expect(restoreTrashRecord(db, 'trash1', 'admin')).rejects.toThrow(/其他删除批次/)
    expect(tx.student.update).not.toHaveBeenCalled()
    expect(tx.deletedRecord.delete).not.toHaveBeenCalled()
  })

  it('stores original lesson cancellation reasons when a class group is trashed', async () => {
    const { db, tx } = makeClassGroupDeleteDb()

    await softDeleteEntity(db, 'ClassGroup', 'group-1', { id: 'admin' })

    expect(tx.deletedRecord.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        payload: expect.objectContaining({ lessonCancelReasons: { 'lesson-1': '家长临时请假' } }),
      }),
    }))
  })

  it('restores the original lesson cancellation reason after a class group is restored', async () => {
    const { db, tx } = makeClassGroupRestoreDb({
      groupStatus: 'ACTIVE',
      lessonStatuses: { 'lesson-1': 'CANCELLED' },
      lessonCancelReasons: { 'lesson-1': '家长临时请假' },
      enrollmentStatuses: {}, paperStatuses: {}, feedbackStatuses: {}, materialStatuses: {},
    }, '班级已删除并进入回收站')

    await restoreTrashRecord(db, 'trash-group', 'admin')

    expect(tx.classLesson.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ deletedAt: { not: null }, deletionBatchId: 'batch-1' }),
    }))
    expect(tx.classLesson.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'lesson-1', deletionBatchId: 'batch-1', cancelReason: '班级已删除并进入回收站' },
      data: expect.objectContaining({ cancelReason: '家长临时请假', status: 'CANCELLED' }),
    }))
  })

  it('preserves a newer lesson cancellation reason when restoring a legacy trash record', async () => {
    const { db, tx } = makeClassGroupRestoreDb({
      groupStatus: 'ACTIVE',
      lessonStatuses: { 'lesson-1': 'CANCELLED' },
      enrollmentStatuses: {}, paperStatuses: {}, feedbackStatuses: {}, materialStatuses: {},
    }, '后来确认：停课顺延')

    await restoreTrashRecord(db, 'trash-group', 'admin')

    const update = tx.classLesson.updateMany.mock.calls[0][0]
    expect(update.where).toEqual({ id: 'lesson-1', deletionBatchId: 'batch-1' })
    expect(update.data).not.toHaveProperty('cancelReason')
  })

  it('blocks permanent student deletion before mutating rows when FK or legacy references remain', async () => {
    const { db, tx } = makeStudentPurgeDb()

    await expect(purgeTrashRecord(db, 'trash-student', 'admin')).rejects.toBeInstanceOf(TrashPurgeBlockedError)

    expectNoStudentHistoryMutations(tx)
    expect(tx.student.update).not.toHaveBeenCalled()
    expect(tx.student.delete).not.toHaveBeenCalled()
    expect(tx.deletedRecord.delete).not.toHaveBeenCalled()
    expect(tx.activityLog.create).not.toHaveBeenCalled()
  })

  it('preserves all FK and student-linked teaching history instead of deleting it during purge', async () => {
    const { db, tx } = makeStudentPurgeDb()
    tx.parentMealChoice.count.mockResolvedValue(1)

    await expect(purgeTrashRecord(db, 'trash-student', 'admin')).rejects.toMatchObject({
      blockers: expect.arrayContaining([
        expect.objectContaining({ relation: '课次学员关联' }),
        expect.objectContaining({ relation: '班级归属' }),
        expect.objectContaining({ relation: '考勤记录' }),
        expect.objectContaining({ relation: '补课申请' }),
        expect.objectContaining({ relation: '用餐选择记录' }),
        expect.objectContaining({ relation: '用餐考勤记录' }),
        expect.objectContaining({ relation: '家长消息关联' }),
        expect.objectContaining({ relation: '反馈奖励记录' }),
        expect.objectContaining({ relation: '知识点掌握记录' }),
        expect.objectContaining({ relation: '练习结果' }),
        expect.objectContaining({ relation: '练习作答记录' }),
        expect.objectContaining({ relation: '课程变更历史' }),
      ]),
    })

    expectNoStudentHistoryMutations(tx)
    expect(tx.student.update).not.toHaveBeenCalled()
    expect(tx.student.delete).not.toHaveBeenCalled()
    expect(tx.deletedRecord.delete).not.toHaveBeenCalled()
    expect(tx.activityLog.create).not.toHaveBeenCalled()
  })

  it('counts soft-deleted FK references that Prisma normally hides from trash views', async () => {
    const { db, tx } = makeStudentPurgeDb([0, 1])

    await expect(purgeTrashRecord(db, 'trash-student', 'admin')).rejects.toBeInstanceOf(TrashPurgeBlockedError)

    expect(tx.hourTransaction.count).toHaveBeenNthCalledWith(2, {
      where: { studentId: 'student-1', deletedAt: { not: null } },
    })
  })

  it('purges an unreferenced student without deleting or rewriting any history', async () => {
    const { db, tx } = makeStudentPurgeDb([0, 0])

    await purgeTrashRecord(db, 'trash-student', 'admin')

    expect(tx.student.delete).toHaveBeenCalledTimes(1)
    expect(tx.student.delete).toHaveBeenCalledWith({ where: { id: 'student-1' } })
    expect(tx.student.update).not.toHaveBeenCalled()
    expectNoStudentHistoryMutations(tx)
    expect(tx.deletedRecord.delete).toHaveBeenCalledWith({ where: { id: 'trash-student' } })
    expect(tx.activityLog.create).toHaveBeenCalledTimes(1)
  })

  it('continues expired-trash cleanup after reporting a blocked student item', async () => {
    const { db, tx } = makeStudentPurgeDb()

    const result = await cleanupExpiredTrash(db, 'admin')

    expect(result.scanned).toBe(2)
    expect(result.purged).toBe(1)
    expect(result.errors).toEqual([expect.objectContaining({ id: 'trash-student', blocked: true })])
    expectNoStudentHistoryMutations(tx)
    expect(tx.student.delete).not.toHaveBeenCalled()
    expect(tx.studyMaterial.delete).toHaveBeenCalledWith({ where: { id: 'material-1' } })
  })
})
