import type { Prisma } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'
import { createClassroomFeedbackWithSideEffects } from './create'

function transactionDouble() {
  return {
    classroomFeedback: { create: vi.fn().mockResolvedValue({ id: 'feedback-1' }) },
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
  it('keeps published feedback, badge, notification and audit log in one transaction workflow', async () => {
    const tx = transactionDouble()
    await createClassroomFeedbackWithSideEffects(tx as unknown as Prisma.TransactionClient, input('PUBLISHED'))

    expect(tx.classroomFeedback.create).toHaveBeenCalledOnce()
    expect(tx.achievementBadge.create).toHaveBeenCalledOnce()
    expect(tx.notification.create).toHaveBeenCalledOnce()
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
})
