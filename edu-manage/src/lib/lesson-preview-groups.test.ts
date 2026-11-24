import { describe, expect, it } from 'vitest'
import { groupLessonPreviewSlots } from './lesson-preview-groups'

const slot = (id: string, subject: string, startTime: string, overrides: Partial<{
  groupId: string
  teacherId: string | null
  material: unknown | null
}> = {}) => ({
  id,
  subject,
  groupId: overrides.groupId || 'group-a',
  teacherId: overrides.teacherId === undefined ? 'teacher-a' : overrides.teacherId,
  groupName: '周末冲刺班',
  teacherName: '任老师',
  startTime,
  endTime: '10:00',
  studentCount: 5,
  material: overrides.material ?? null,
})

describe('groupLessonPreviewSlots', () => {
  it('merges repeated sessions for the same class, subject, and teacher into one upload', () => {
    const slots = [
      slot('m1', '数学', '08:30'), slot('m2', '数学', '09:20'),
      slot('e1', '英语', '10:10'), slot('e2', '英语', '11:00'),
      slot('b1', '生物', '14:00'), slot('b2', '生物', '14:50'),
      slot('c1', '语文', '15:40'), slot('c2', '语文', '16:30'),
    ]

    const groups = groupLessonPreviewSlots(slots)
    expect(groups).toHaveLength(4)
    expect(groups.map((group) => group.pendingLessons)).toHaveLength(4)
    expect(groups.every((group) => group.lessons.length === 2)).toBe(true)
  })

  it('keeps different teachers separate and exposes only sessions still awaiting a material', () => {
    const groups = groupLessonPreviewSlots([
      slot('m1', '数学', '08:30'),
      slot('m2', '数学', '09:20', { material: { id: 'material' } }),
      slot('m3', '数学', '10:10', { teacherId: 'teacher-b' }),
    ])
    expect(groups).toHaveLength(2)
    expect(groups.find((group) => group.teacherId === 'teacher-a')?.pendingLessons.map((item) => item.id)).toEqual(['m1'])
  })

  it('does not merge sessions without a resolved teacher', () => {
    expect(groupLessonPreviewSlots([
      slot('m1', '数学', '08:30', { teacherId: null }),
      slot('m2', '数学', '09:20', { teacherId: null }),
    ])).toHaveLength(2)
  })
})
