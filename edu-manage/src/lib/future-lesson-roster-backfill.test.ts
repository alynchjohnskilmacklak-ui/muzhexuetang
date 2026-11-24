import { describe, expect, it } from 'vitest'
import { planFutureLessonRosterBackfill } from './future-lesson-roster-backfill'

const now = new Date('2026-11-09T12:00:00.000Z') // 北京时间 20:00

function lesson(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lesson-1',
    lessonDate: new Date('2026-11-10T00:00:00.000Z'),
    startTime: '08:30',
    teacherId: 'teacher-math',
    subject: null,
    status: 'SCHEDULED',
    deletedAt: null,
    attendanceSubmittedAt: null,
    hoursDeductedAt: null,
    lessonStudents: [],
    attendances: [],
    group: {
      id: 'group-1',
      name: '初中综合班',
      status: 'ACTIVE',
      deletedAt: null,
      teacherId: 'teacher-math',
      course: { subject: '综合课程', isActive: true, deletedAt: null },
      teacherAssignments: [
        { teacherId: 'teacher-math', subject: '数学' },
        { teacherId: 'teacher-english', subject: '英语' },
      ],
      enrollments: [
        { studentId: 'math-student', status: 'ACTIVE', deletedAt: null, student: { status: 'ACTIVE', deletedAt: null }, subjects: ['数学'] },
        { studentId: 'english-student', status: 'ACTIVE', deletedAt: null, student: { status: 'ACTIVE', deletedAt: null }, subjects: ['英语'] },
        { studentId: 'inactive-student', status: 'ACTIVE', deletedAt: null, student: { status: 'INACTIVE', deletedAt: null }, subjects: ['数学'] },
      ],
    },
    ...overrides,
  }
}

describe('planFutureLessonRosterBackfill', () => {
  it('plans only active enrollments for the lesson subject when an upcoming lesson has no snapshot', () => {
    expect(planFutureLessonRosterBackfill([lesson()], now)).toMatchObject([
      { lessonId: 'lesson-1', groupName: '初中综合班', subject: '数学', studentIds: ['math-student'] },
    ])
  })

  it('does not rewrite history, started lessons, existing snapshots, or lessons with attendance', () => {
    const past = lesson({ id: 'past', lessonDate: new Date('2026-11-08T00:00:00.000Z') })
    const alreadyStartedToday = lesson({ id: 'started-today', lessonDate: new Date('2026-11-09T00:00:00.000Z'), startTime: '19:00' })
    const existingSnapshot = lesson({ id: 'snapshotted', lessonStudents: [{ studentId: 'math-student' }] })
    const attended = lesson({ id: 'attended', attendances: [{ id: 'attendance-1' }] })
    const submitted = lesson({ id: 'submitted', attendanceSubmittedAt: new Date('2026-11-09T11:00:00.000Z') })
    const cancelled = lesson({ id: 'cancelled', status: 'CANCELLED' })

    expect(planFutureLessonRosterBackfill([past, alreadyStartedToday, existingSnapshot, attended, submitted, cancelled], now)).toEqual([])
  })

  it('skips a course when no active enrollment matches its subject', () => {
    const noSubjectMatch = lesson({
      subject: '物理',
      group: { ...lesson().group, teacherAssignments: [], enrollments: lesson().group.enrollments },
    })
    expect(planFutureLessonRosterBackfill([noSubjectMatch], now)).toEqual([])
  })
})
