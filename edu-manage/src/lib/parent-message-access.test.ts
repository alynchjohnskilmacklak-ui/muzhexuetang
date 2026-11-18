import { describe, expect, it } from 'vitest'
import { getAccessibleParentMessageWhere } from './parent-message-access'

describe('parent message access scope', () => {
  it('builds teacher access as a database relationship filter without preloading enrollments', () => {
    const where = getAccessibleParentMessageWhere({
      id: 'user-1',
      role: 'teacher',
      teacherId: 'teacher-1',
    }, 'JUNIOR')

    expect(where).toEqual({
      OR: [
        {
          feedbackId: { not: null },
          feedback: { teacherId: 'teacher-1' },
        },
        {
          feedbackId: null,
          AND: [
            {
              student: {
                enrollments: {
                  some: {
                    status: 'ACTIVE',
                    group: {
                      OR: [
                        { teacherId: 'teacher-1' },
                        { teacherAssignments: { some: { teacherId: 'teacher-1' } } },
                      ],
                    },
                  },
                },
              },
            },
            { OR: [{ teacherId: 'teacher-1' }, { teacherId: null }] },
          ],
        },
      ],
    })
  })

  it('keeps parent and admin message scopes bounded by their own relationship', () => {
    expect(getAccessibleParentMessageWhere({
      id: 'parent-1',
      role: 'parent',
      teacherId: null,
    }, 'JUNIOR')).toEqual({ parentId: 'parent-1' })

    expect(getAccessibleParentMessageWhere({
      id: 'admin-1',
      role: 'admin',
      teacherId: null,
    }, 'SENIOR')).toEqual({ student: { division: 'SENIOR' } })
  })

  it('denies unknown roles and teachers without a teacher profile', () => {
    expect(getAccessibleParentMessageWhere({
      id: 'user-1',
      role: 'teacher',
      teacherId: null,
    }, 'JUNIOR')).toBeNull()

    expect(getAccessibleParentMessageWhere({
      id: 'user-2',
      role: 'student',
      teacherId: null,
    }, 'JUNIOR')).toBeNull()
  })
})
