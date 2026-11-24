import { describe, expect, it, vi } from 'vitest'
import {
  markFeedbackReadFromNotifications,
  resetFeedbackReadReceiptsForParents,
} from './notification-read-sync'

describe('classroom feedback notification read sync', () => {
  it('marks only published feedback linked to this parent as read', async () => {
    const studentFindMany = vi.fn().mockResolvedValue([{ id: 'student-1' }])
    const classroomFeedbackFindMany = vi.fn().mockResolvedValue([{ id: 'feedback-1' }])
    const upsert = vi.fn().mockResolvedValue({})
    const db = {
      student: { findMany: studentFindMany },
      classroomFeedback: { findMany: classroomFeedbackFindMany },
      feedbackParentReadReceipt: { upsert },
    } as never

    const readAt = new Date('2026-10-30T10:00:00.000Z')
    const result = await markFeedbackReadFromNotifications(db, 'parent-1', [
      { relatedType: 'CLASSROOM_FEEDBACK', relatedId: 'feedback-1' },
      { relatedType: 'CLASSROOM_FEEDBACK', relatedId: 'feedback-1' },
      { type: 'INFO', relatedType: 'PARENT_MESSAGE', relatedId: 'message-1' },
    ], readAt)

    expect(result).toBe(1)
    expect(studentFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ deletedAt: null }),
    }))
    expect(classroomFeedbackFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: { in: ['feedback-1'] },
        status: 'PUBLISHED',
        deletedAt: null,
        studentIds: { hasSome: ['student-1'] },
      }),
    }))
    expect(upsert).toHaveBeenCalledWith({
      where: { feedbackId_parentUserId: { feedbackId: 'feedback-1', parentUserId: 'parent-1' } },
      create: { feedbackId: 'feedback-1', parentUserId: 'parent-1', readAt },
      update: { readAt },
    })
  })

  it('resets each parent receipt once when a teacher posts a new reply', async () => {
    const upsert = vi.fn().mockResolvedValue({})
    const db = {
      student: { findMany: vi.fn() },
      classroomFeedback: { findMany: vi.fn() },
      feedbackParentReadReceipt: { upsert },
    } as never

    await resetFeedbackReadReceiptsForParents(db, 'feedback-1', ['parent-1', 'parent-1', 'parent-2'])

    expect(upsert).toHaveBeenCalledTimes(2)
    expect(upsert).toHaveBeenNthCalledWith(1, {
      where: { feedbackId_parentUserId: { feedbackId: 'feedback-1', parentUserId: 'parent-1' } },
      create: { feedbackId: 'feedback-1', parentUserId: 'parent-1', readAt: null },
      update: { readAt: null },
    })
  })
})
