import { describe, expect, it } from 'vitest'
import { hasSubmittedAttendance, isAttendanceDue } from './teacher-attendance-monitor'

const today = new Date(2026, 9, 2)
const now = new Date(2026, 9, 2, 16)
const lesson = {
  lessonDate: today,
  endTime: '15:00',
  subject: '数学',
  attendanceSubmittedAt: null,
  attendances: [],
  lessonStudents: [{ studentId: 'student-1' }],
  group: {
    course: { subject: '数学' },
    enrollments: [{ studentId: 'student-1', subjects: ['数学'] }],
  },
}

describe('teacher attendance monitoring', () => {
  it('counts an ended lesson with a valid subject student even before attendance submission', () => {
    expect(isAttendanceDue(lesson, now)).toBe(true)
    expect(hasSubmittedAttendance(lesson)).toBe(false)
  })

  it('does not flag a lesson that has not ended', () => {
    expect(isAttendanceDue({ ...lesson, endTime: '17:00' }, now)).toBe(false)
  })

  it('does not flag a lesson without an enrolled student for its subject', () => {
    expect(isAttendanceDue({ ...lesson, group: { ...lesson.group, enrollments: [{ studentId: 'student-1', subjects: ['语文'] }] } }, now)).toBe(false)
  })

  it('accepts a persisted attendance submission even without attendance rows', () => {
    expect(hasSubmittedAttendance({ attendances: [], attendanceSubmittedAt: now })).toBe(true)
  })
})
