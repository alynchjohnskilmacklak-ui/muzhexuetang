import { describe, expect, it, vi } from 'vitest'
import type { Prisma } from '@prisma/client'
import { recordCourseChangeEvent } from './course-change-events'

describe('recordCourseChangeEvent', () => {
  it('creates one event and one parent notification for siblings in the same change', async () => {
    const tx = {
      student: { findMany: vi.fn().mockResolvedValue([
        { id: 'student-1', name: '小牧', parentId: 'parent-1', parentUserId: null },
        { id: 'student-2', name: '小禾', parentId: 'parent-1', parentUserId: null },
      ]) },
      courseChangeEvent: { create: vi.fn().mockResolvedValue({ id: 'event-1' }) },
      notification: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
    } as unknown as Prisma.TransactionClient

    const result = await recordCourseChangeEvent(tx, {
      eventType: 'MAKEUP_ADDED', actorUserId: 'admin-1', groupId: 'group-1',
      lessonIds: ['lesson-1', 'lesson-1'], studentIds: ['student-1', 'student-2'],
      title: '课程安排已更新', summary: '周六新增数学课。',
    })

    expect(result).toMatchObject({ recipientCount: 1, notificationCount: 1, event: { id: 'event-1' } })
    expect(tx.courseChangeEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      lessonIds: ['lesson-1'], studentIds: ['student-1', 'student-2'], notificationCount: 1,
    }) })
    expect(tx.notification.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ userId: 'parent-1', relatedType: 'COURSE_CHANGE_EVENT', relatedId: 'event-1' })],
    }))
  })

  it('records the event without notifications when the class is not parent-visible', async () => {
    const tx = {
      student: { findMany: vi.fn().mockResolvedValue([{ id: 'student-1', name: '小牧', parentId: 'parent-1', parentUserId: null }]) },
      courseChangeEvent: { create: vi.fn().mockResolvedValue({ id: 'event-1' }) },
      notification: { createMany: vi.fn() },
    } as unknown as Prisma.TransactionClient

    const result = await recordCourseChangeEvent(tx, {
      eventType: 'LESSON_ADDED', actorUserId: 'admin-1', lessonIds: ['lesson-1'],
      studentIds: ['student-1'], title: '课程已变更', summary: '请查看课表。', notifyParents: false,
    })

    expect(result.recipientCount).toBe(0)
    expect(tx.notification.createMany).not.toHaveBeenCalled()
  })
})
