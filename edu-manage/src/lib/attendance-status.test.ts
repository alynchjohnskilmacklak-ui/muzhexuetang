import { describe, expect, it } from 'vitest'
import {
  canSubmitTeacherAttendance,
  normalizeAttendanceRecordStatus,
  markAllPresentPreservingLeave,
  resolveAttendanceSubmissionStatus,
  toAttendanceDisplayStatus,
} from '@/lib/attendance-status'

describe('two-state attendance editor', () => {
  it('does not allow attendance actions before the roster loads or when it is empty', () => {
    expect(canSubmitTeacherAttendance(false, 3)).toBe(false)
    expect(canSubmitTeacherAttendance(true, 0)).toBe(false)
    expect(canSubmitTeacherAttendance(true, 3)).toBe(true)
  })

  it('normalizes legacy late status as present', () => {
    expect(normalizeAttendanceRecordStatus('late')).toBe('PRESENT')
  })

  it('projects historical four-state values without changing their meaning', () => {
    expect(toAttendanceDisplayStatus('ABSENT')).toBe('LEAVE')
    expect(toAttendanceDisplayStatus('MAKEUP')).toBe('PRESENT')
  })

  it('preserves untouched historical values on submission', () => {
    expect(resolveAttendanceSubmissionStatus({
      displayedStatus: 'LEAVE',
      originalStatus: 'ABSENT',
      changed: false,
    })).toBe('ABSENT')
    expect(resolveAttendanceSubmissionStatus({
      displayedStatus: 'PRESENT',
      originalStatus: 'MAKEUP',
      changed: false,
    })).toBe('MAKEUP')
  })

  it('uses the visible two-state choice after an explicit edit', () => {
    expect(resolveAttendanceSubmissionStatus({
      displayedStatus: 'PRESENT',
      originalStatus: 'ABSENT',
      changed: true,
    })).toBe('PRESENT')
  })

  it('does not overwrite leave/absence while applying one-click present', () => {
    const result = markAllPresentPreservingLeave(
      ['present-student', 'leave-student', 'absent-student'],
      new Map([
        ['present-student', 'PRESENT'],
        ['leave-student', 'LEAVE'],
        ['absent-student', toAttendanceDisplayStatus('ABSENT')],
      ]),
    )

    expect([...result.statuses.entries()]).toEqual([
      ['present-student', 'PRESENT'],
      ['leave-student', 'LEAVE'],
      ['absent-student', 'LEAVE'],
    ])
    expect(result.updatedStudentIds).toEqual(['present-student'])
    expect(result.preservedStudentIds).toEqual(['leave-student', 'absent-student'])
  })
})
