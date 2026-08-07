import { describe, expect, it } from 'vitest'
import { hasSubmittedLessonAttendance } from '@/lib/attendance-submission'

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
