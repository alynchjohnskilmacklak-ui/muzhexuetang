import { describe, expect, it } from 'vitest'
import { buildWeeklyLessonRosters, summarizeWeeklyAttendance } from './parent-weekly-report'

describe('parent weekly report accuracy', () => {
  it('counts only the subject the student enrolled in when a group teaches multiple subjects', () => {
    const rosters = buildWeeklyLessonRosters([
      {
        id: 'math-lesson',
        subject: '数学',
        lessonDate: new Date('2026-10-20T00:00:00.000Z'),
        lessonStudents: [],
        group: {
          teacherId: 'teacher-1',
          teacherAssignments: [],
          course: { subject: '语文' },
          enrollments: [
            { studentId: 'student-a', subjects: ['数学', '英语'] },
            { studentId: 'student-b', subjects: ['英语'] },
          ],
        },
      },
    ], ['student-a', 'student-b'])

    expect([...rosters.get('student-a') || []]).toEqual(['math-lesson'])
    expect(rosters.has('student-b')).toBe(false)
  })

  it('uses the lesson roster snapshot when available and still restricts it to linked children', () => {
    const rosters = buildWeeklyLessonRosters([
      {
        id: 'lesson-snapshot',
        subject: '数学',
        lessonDate: new Date('2026-10-20T00:00:00.000Z'),
        lessonStudents: [{ studentId: 'student-a' }, { studentId: 'other-student' }],
        group: { teacherAssignments: [], course: { subject: '数学' }, enrollments: [] },
      },
    ], ['student-a'])

    expect([...rosters.get('student-a') || []]).toEqual(['lesson-snapshot'])
    expect(rosters.has('other-student')).toBe(false)
  })

  it('excludes a current lesson snapshot when its child is not enrolled in that lesson subject', () => {
    const rosters = buildWeeklyLessonRosters([
      {
        id: 'english-lesson',
        subject: '英语',
        lessonDate: new Date(Date.now() + 86_400_000),
        lessonStudents: [{ studentId: 'student-a' }],
        group: {
          teacherAssignments: [],
          course: { subject: '英语' },
          enrollments: [{ studentId: 'student-a', subjects: ['数学'] }],
        },
      },
    ], ['student-a'])

    expect(rosters.has('student-a')).toBe(false)
  })

  it('does not call an in-progress week fully attended when later lessons are unrecorded', () => {
    const summary = summarizeWeeklyAttendance(new Set(['lesson-1', 'lesson-2']), [
      { id: 'attendance-1', lessonId: 'lesson-1', status: 'PRESENT' },
    ])

    expect(summary.attendanceRate).toBe(100)
    expect(summary.fullyAttendedWeek).toBe(false)
  })

  it('ignores soft-deleted attendance rows', () => {
    const summary = summarizeWeeklyAttendance(new Set(['lesson-1']), [
      { id: 'deleted', lessonId: 'lesson-1', status: 'PRESENT', deletedAt: new Date() },
    ])

    expect(summary.attendance).toHaveLength(0)
    expect(summary.attendanceRate).toBeNull()
  })

  it('ignores unrelated lessons and collapses duplicate attendance rows before calculating the rate', () => {
    const summary = summarizeWeeklyAttendance(new Set(['lesson-1']), [
      { id: 'latest', lessonId: 'lesson-1', status: 'PRESENT' },
      { id: 'older', lessonId: 'lesson-1', status: 'ABSENT' },
      { id: 'other', lessonId: 'lesson-other', status: 'ABSENT' },
    ])

    expect(summary.attendance).toHaveLength(1)
    expect(summary.attendanceRate).toBe(100)
    expect(summary.fullyAttendedWeek).toBe(true)
  })
})
