import { describe, expect, it } from 'vitest'
import { findTeacherReplacementConflicts, type TeacherReplacementSlot } from './teacher-replacement-conflicts'

const target = (overrides: Partial<TeacherReplacementSlot> = {}): TeacherReplacementSlot => ({
  id: 'target', date: '2026-10-31', startTime: '09:00', endTime: '10:00', groupName: '周末班 A', ...overrides,
})

describe('findTeacherReplacementConflicts', () => {
  it('blocks overlapping work assigned to the replacement teacher', () => {
    expect(findTeacherReplacementConflicts([target()], [{
      ...target({ id: 'other', groupName: '周末班 B', startTime: '09:30', endTime: '10:30' }),
      teacherId: 'new-teacher',
    }])).toHaveLength(1)
  })

  it('allows adjacent sessions and sessions on different dates', () => {
    expect(findTeacherReplacementConflicts([target()], [
      { ...target({ id: 'adjacent', startTime: '10:00', endTime: '11:00' }), teacherId: 'new-teacher' },
      { ...target({ id: 'next-day', date: '2026-11-01', startTime: '09:30', endTime: '10:30' }), teacherId: 'new-teacher' },
    ])).toEqual([])
  })

  it('checks overlapping target lessons against each other', () => {
    expect(findTeacherReplacementConflicts([
      target(), target({ id: 'second-target', groupName: '周末班 A', startTime: '09:30', endTime: '10:30' }),
    ], [])).toHaveLength(1)
  })
})
