import type { Prisma } from '@prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createClassroomFeedbackWithSideEffects } from './create'

function transactionDouble() {
  return {
    classroomFeedback: { create: vi.fn().mockResolvedValue({ id: 'feedback-1' }) },
    feedbackParentReadReceipt: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    achievementBadge: { create: vi.fn().mockResolvedValue({ id: 'badge-1' }) },
    notification: { create: vi.fn().mockResolvedValue({ id: 'notification-1' }) },
    activityLog: { create: vi.fn().mockResolvedValue({ id: 'log-1' }) },
  }
}

function input(status: 'PUBLISHED' | 'DRAFT') {
  return {
    data: {
      teacherId: 'teacher-1',
      studentIds: ['student-1'],
      lessonContent: '本节课完成了函数综合练习。',
      overallComment: null as string | null,
      summary: null as string | null,
      knowledgePoints: ['函数'],
      imageUrls: [],
      homework: [],
      badge: '专注之星',
      status,
    },
    actorUserId: 'user-1',
    teacherName: '陈',
    students: [{ id: 'student-1', name: '小牧', parentId: 'parent-1', parentUserId: null }],
    knowledgePoints: ['函数'],
    imageUrls: [],
    status,
    source: 'teacher' as const,
    detailFallback: '课堂反馈',
    notificationContent: '本节课堂反馈已更新',
  }
}

describe('createClassroomFeedbackWithSideEffects', () => {
  beforeEach(() => vi.stubEnv('QYWX_ENABLED', 'false'))
  afterEach(() => vi.unstubAllEnvs())

  it('keeps published feedback, badge, notification and audit log in one transaction workflow', async () => {
    const tx = transactionDouble()
    await createClassroomFeedbackWithSideEffects(tx as unknown as Prisma.TransactionClient, input('PUBLISHED'))

    expect(tx.classroomFeedback.create).toHaveBeenCalledOnce()
    expect(tx.achievementBadge.create).toHaveBeenCalledOnce()
    expect(tx.notification.create).toHaveBeenCalledOnce()
    expect(tx.feedbackParentReadReceipt.createMany).toHaveBeenCalledWith({
      data: [{ feedbackId: 'feedback-1', parentUserId: 'parent-1' }],
      skipDuplicates: true,
    })
    expect(tx.activityLog.create).toHaveBeenCalledOnce()
  })

  it('does not send published-only side effects for a draft', async () => {
    const tx = transactionDouble()
    await createClassroomFeedbackWithSideEffects(tx as unknown as Prisma.TransactionClient, input('DRAFT'))

    expect(tx.classroomFeedback.create).toHaveBeenCalledOnce()
    expect(tx.achievementBadge.create).not.toHaveBeenCalled()
    expect(tx.notification.create).not.toHaveBeenCalled()
    expect(tx.activityLog.create).toHaveBeenCalledOnce()
  })

  it('sends one feedback notice to a parent who has multiple students in the same feedback', async () => {
    const tx = transactionDouble()
    const sharedInput = input('PUBLISHED')
    sharedInput.data.studentIds = ['student-1', 'student-2']
    sharedInput.data.overallComment = '课堂反馈：课堂参与积极。'
    sharedInput.data.summary = '仅供老师查看的掌握记录'
    sharedInput.students = [
      { id: 'student-1', name: '小牧', parentId: 'parent-1', parentUserId: null },
      { id: 'student-2', name: '小禾', parentId: 'parent-1', parentUserId: null },
    ]

    await createClassroomFeedbackWithSideEffects(tx as unknown as Prisma.TransactionClient, sharedInput)

    expect(tx.notification.create).toHaveBeenCalledOnce()
    expect(tx.notification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'parent-1',
        studentId: null,
        content: expect.stringContaining('小牧：课堂参与积极。；小禾：课堂参与积极。'),
        pushStatus: 'none',
      }),
    }))
  })

  it('queues a published parent notice for the retry worker when WeCom is enabled', async () => {
    vi.stubEnv('QYWX_ENABLED', 'true')
    const tx = transactionDouble()
    await createClassroomFeedbackWithSideEffects(tx as unknown as Prisma.TransactionClient, input('PUBLISHED'))

    expect(tx.notification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ pushStatus: 'queued' }),
    }))
  })

  it('mirrors classroomFeedback records for consecutive sister lessons in the same session without repeating notifications', async () => {
    const tx = transactionDouble()
    const baseInput = input('PUBLISHED')
    const multiLessonInput = {
      ...baseInput,
      data: {
        ...baseInput.data,
        classLessonId: 'lesson-1',
      },
      additionalLessonIds: ['lesson-2'],
    }

    await createClassroomFeedbackWithSideEffects(tx as unknown as Prisma.TransactionClient, multiLessonInput)

    // Primary + sister lesson = 2 creates
    expect(tx.classroomFeedback.create).toHaveBeenCalledTimes(2)
    expect(tx.classroomFeedback.create).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({ classLessonId: 'lesson-1' }),
    })
    expect(tx.classroomFeedback.create).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({ classLessonId: 'lesson-2', notifySent: true }),
    })
    // Notifications should only be created once (for the primary feedback)
    expect(tx.notification.create).toHaveBeenCalledOnce()
  })
})
