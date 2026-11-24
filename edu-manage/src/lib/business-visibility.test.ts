import { describe, expect, it } from 'vitest'
import { parentVisibleLessonWhere, parentVisibleNotificationWhere } from './business-visibility'

describe('parentVisibleNotificationWhere', () => {
  it('allows generic notices and notices attached to a currently linked active child', () => {
    expect(parentVisibleNotificationWhere('parent-1')).toEqual({
      OR: [
        { studentId: null },
        {
          student: {
            is: {
              OR: [{ parentId: 'parent-1' }, { parentUserId: 'parent-1' }],
              status: { not: 'INACTIVE' },
              deletedAt: null,
            },
          },
        },
      ],
    })
  })
})

describe('parentVisibleLessonWhere', () => {
  it('limits a lesson to the selected child’s active enrollment', () => {
    const where = parentVisibleLessonWhere('parent-1', ['child-1'])

    expect(where.group).toMatchObject({
      enrollments: {
        some: {
          studentId: { in: ['child-1'] },
          student: {
            OR: [{ parentId: 'parent-1' }, { parentUserId: 'parent-1' }],
            status: { not: 'INACTIVE' },
            deletedAt: null,
          },
        },
      },
    })
    expect(where.status).toEqual({ notIn: ['CANCELLED', 'POSTPONED'] })
    expect(where.deletedAt).toBeNull()
  })
})
