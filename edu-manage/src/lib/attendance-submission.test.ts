import { describe, expect, it } from 'vitest'
import {
  hasAttendingStudent,
  hasSubmittedLessonAttendance,
  isCancelledOrPostponedLesson,
  validateAttendanceSubmissionRecords,
} from '@/lib/attendance-submission'

describe('hasSubmittedLessonAttendance', () => {
  it('uses attendanceSubmittedAt as the canonical marker', () => {
    expect(hasSubmittedLessonAttendance({
      attendanceSubmittedAt: new Date('2026-07-27T12:00:00+08:00'),
      attendances: [],
    })).toBe(true)
  })

  it('supports completed legacy lessons that already have attendance records', () => {
    expect(hasSubmittedLessonAttendance({
      attendanceSubmittedAt: null,
      status: 'COMPLETED',
      attendances: [{ studentId: 'student-a' }],
    })).toBe(true)
  })

  it('supports a complete legacy attendance snapshot', () => {
    expect(hasSubmittedLessonAttendance({
      attendanceSubmittedAt: null,
      status: 'SCHEDULED',
      attendances: [
        { studentId: 'student-a' },
        { studentId: 'student-b' },
      ],
      expectedStudentIds: ['student-a', 'student-b'],
    })).toBe(true)
  })

  it('does not treat partial or empty attendance as submitted', () => {
    expect(hasSubmittedLessonAttendance({
      status: 'SCHEDULED',
      attendances: [{ studentId: 'student-a' }],
      expectedStudentIds: ['student-a', 'student-b'],
    })).toBe(false)

    expect(hasSubmittedLessonAttendance({
      status: 'COMPLETED',
      attendances: [],
      expectedStudentIds: ['student-a'],
    })).toBe(false)
  })
})

describe('hasAttendingStudent', () => {
  it('requires an explicit actual attendance, including legacy late status', () => {
    expect(hasAttendingStudent([{ status: 'PRESENT' }, { status: 'LEAVE' }])).toBe(true)
    expect(hasAttendingStudent([{ status: 'LATE' }])).toBe(true)
    expect(hasAttendingStudent([{ status: 'LEAVE' }, { status: 'ABSENT' }])).toBe(false)
    expect(hasAttendingStudent([{ status: 'MAKEUP' }, { status: 'invalid' }])).toBe(false)
    expect(hasAttendingStudent([])).toBe(false)
  })
})

describe('attendance submission validation', () => {
  const roster = new Set(['student-a', 'student-b'])

  it('accepts unique, eligible students with valid attendance status', () => {
    expect(validateAttendanceSubmissionRecords([
      { studentId: 'student-a', status: 'PRESENT', actualMinutes: 35 },
      { studentId: 'student-b', status: 'LEAVE' },
    ], roster)).toEqual({
      ok: true,
      records: [
        { studentId: 'student-a', status: 'PRESENT', actualMinutes: 35 },
        { studentId: 'student-b', status: 'LEAVE', actualMinutes: null },
      ],
    })
  })

  it('rejects duplicate or out-of-roster records instead of partially saving', () => {
    expect(validateAttendanceSubmissionRecords([
      { studentId: 'student-a', status: 'PRESENT' },
      { studentId: 'student-a', status: 'LEAVE' },
    ], roster)).toMatchObject({ ok: false, reason: 'DUPLICATE_STUDENT' })
    expect(validateAttendanceSubmissionRecords([
      { studentId: 'student-a', status: 'PRESENT' },
      { studentId: 'student-x', status: 'PRESENT' },
    ], roster)).toMatchObject({ ok: false, reason: 'OUTSIDE_ROSTER' })
    expect(validateAttendanceSubmissionRecords([
      { studentId: 'student-a', status: 'PRESENT' },
    ], roster)).toMatchObject({ ok: false, reason: 'MISSING_ROSTER_STUDENT' })
  })

  it('rejects malformed status/minutes and cancelled or postponed lessons', () => {
    expect(validateAttendanceSubmissionRecords([{ studentId: 'student-a', status: 'UNKNOWN' }], roster))
      .toMatchObject({ ok: false, reason: 'INVALID_STATUS' })
    expect(validateAttendanceSubmissionRecords([{ studentId: 'student-a', status: 'PRESENT', actualMinutes: -15 }], roster))
      .toMatchObject({ ok: false, reason: 'INVALID_MINUTES' })
    expect(isCancelledOrPostponedLesson('CANCELLED')).toBe(true)
    expect(isCancelledOrPostponedLesson('POSTPONED')).toBe(true)
    expect(isCancelledOrPostponedLesson('SCHEDULED')).toBe(false)
  })
})
