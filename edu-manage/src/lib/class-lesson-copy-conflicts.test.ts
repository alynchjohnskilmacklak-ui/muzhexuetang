import { describe, expect, it } from 'vitest'
import { findClassLessonCopyConflicts, type CopyScheduleSlot } from './class-lesson-copy-conflicts'

const slot = (overrides: Partial<CopyScheduleSlot> = {}): CopyScheduleSlot => ({
  id: 'target',
  groupId: 'group-a',
  groupName: '周末班 A',
  teacherId: 'teacher-a',
  teacherName: '任老师',
  roomId: 'room-a',
  roomName: '一号教室',
  studentIds: ['student-a'],
  startTime: '09:00',
  endTime: '10:00',
  ...overrides,
})

describe('findClassLessonCopyConflicts', () => {
  it('detects same-time teacher, room, and student conflicts', () => {
    const conflicts = findClassLessonCopyConflicts(
      [slot()],
      [slot({ id: 'existing', groupId: 'group-b', groupName: '周末班 B', startTime: '09:30', endTime: '10:30' })],
    )
    expect(conflicts.map((item) => item.type).sort()).toEqual(['room', 'student', 'teacher'])
  })

  it('allows adjacent time slots and does not confuse different resources', () => {
    const conflicts = findClassLessonCopyConflicts(
      [slot()],
      [slot({
        id: 'existing', groupId: 'group-b', teacherId: 'teacher-b', roomId: 'room-b',
        studentIds: ['student-b'], startTime: '10:00', endTime: '11:00',
      })],
    )
    expect(conflicts).toEqual([])
  })

  it('checks conflicts between multiple copied sessions', () => {
    const conflicts = findClassLessonCopyConflicts(
      [slot(), slot({ id: 'second-target', groupId: 'group-b', groupName: '周末班 B' })],
      [],
    )
    expect(conflicts.map((item) => item.type).sort()).toEqual(['room', 'student', 'teacher'])
  })

  it('only compares moved lessons with lessons on the same calendar date', () => {
    const target = slot({ dateKey: '2026-11-07' })
    const anotherDay = slot({ id: 'other-day', dateKey: '2026-11-08', startTime: '09:30', endTime: '10:30' })
    const sameDay = slot({ id: 'same-day', dateKey: '2026-11-07', startTime: '09:30', endTime: '10:30' })

    expect(findClassLessonCopyConflicts([target], [anotherDay])).toEqual([])
    expect(findClassLessonCopyConflicts([target], [sameDay]).map((item) => item.type).sort())
      .toEqual(['room', 'student', 'teacher'])
  })
})
