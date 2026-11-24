import { describe, expect, it, vi } from 'vitest'
import { presentDashboardUpcomingLesson, selectNextScheduledLessonDay, shouldShowWeekendNextLessons } from './dashboard-upcoming-lessons'
import { localDateColumnValue } from '@/lib/date/local-day'

describe('dashboard upcoming lessons', () => {
  it('shows a next-session preview only for an active weekend term with no lesson today', () => {
    expect(shouldShowWeekendNextLessons({ status: 'ACTIVE', kind: 'WEEKEND' }, 0)).toBe(true)
    expect(shouldShowWeekendNextLessons({ status: 'ACTIVE', kind: 'WEEKEND' }, 1)).toBe(false)
    expect(shouldShowWeekendNextLessons({ status: 'ACTIVE', kind: 'SUMMER' }, 0)).toBe(false)
    expect(shouldShowWeekendNextLessons({ status: 'ACTIVE', kind: 'WINTER' }, 0)).toBe(false)
    expect(shouldShowWeekendNextLessons({ status: 'DRAFT', kind: 'WEEKEND' }, 0)).toBe(false)
  })

  it('selects only the earliest future day with scheduled lessons', () => {
    const rows = [
      { id: 'today', lessonDate: localDateColumnValue('2026-10-31'), startTime: '09:00', status: 'SCHEDULED' },
      { id: 'completed', lessonDate: localDateColumnValue('2026-11-01'), startTime: '08:00', status: 'COMPLETED' },
      { id: 'cancelled', lessonDate: localDateColumnValue('2026-11-01'), startTime: '09:00', status: 'CANCELLED' },
      { id: 'next-late', lessonDate: localDateColumnValue('2026-11-02'), startTime: '10:00', status: 'SCHEDULED' },
      { id: 'in-progress', lessonDate: localDateColumnValue('2026-11-01'), startTime: '10:00', status: 'IN_PROGRESS' },
      { id: 'next-early', lessonDate: localDateColumnValue('2026-11-02'), startTime: '08:00', status: 'SCHEDULED' },
      { id: 'later', lessonDate: localDateColumnValue('2026-11-03'), startTime: '08:00', status: 'SCHEDULED' },
    ]

    expect(selectNextScheduledLessonDay(rows, '2026-10-31')).toMatchObject({
      date: '2026-11-02',
      lessons: [{ id: 'next-early' }, { id: 'next-late' }],
    })
  })

  it('uses the default course subject to resolve a legacy lesson teacher and roster', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-07T06:00:00.000Z'))
    try {
      const presentation = presentDashboardUpcomingLesson({
        id: 'lesson-legacy',
        groupId: 'group-1',
        lessonDate: localDateColumnValue('2026-11-07'),
        startTime: '09:00',
        endTime: '10:00',
        status: 'SCHEDULED',
        subject: null,
        teacherId: null,
        teacher: null,
        lessonStudents: [{ studentId: 'math-student' }, { studentId: 'english-student' }],
        group: {
          name: '周末多科班',
          teacher: { id: 'main-teacher', name: '主讲老师' },
          course: { subject: '数学' },
          room: { name: '201教室' },
          teacherAssignments: [
            { teacherId: 'math-teacher', subject: '数学', teacher: { name: '数学老师' } },
            { teacherId: 'english-teacher', subject: '英语', teacher: { name: '英语老师' } },
          ],
          enrollments: [
            { studentId: 'math-student', subjects: ['数学'] },
            { studentId: 'english-student', subjects: ['英语'] },
          ],
        },
      }, '2026-11-07')

      expect(presentation).toMatchObject({
        subject: '数学',
        teacher: '数学老师',
        studentCount: 1,
        date: '2026-11-07',
      })
    } finally {
      vi.useRealTimers()
    }
  })
})
