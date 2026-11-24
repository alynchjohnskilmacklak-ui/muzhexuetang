import { describe, expect, it } from 'vitest'
import { isStudentInLessonRoster, resolveLessonStudentIds, resolveSubjectLessonStudentIds } from '@/lib/lesson-roster'

const now = new Date('2026-09-13T12:00:00+08:00')

describe('subject lesson roster', () => {
  it('uses subject snapshots instead of the whole group', () => {
    expect(resolveLessonStudentIds(
      ['math-student'],
      ['math-student', 'english-only-student'],
      new Date('2026-09-13T00:00:00+08:00'),
      now,
    )).toEqual(['math-student'])
  })

  it('keeps an empty roster for current and future subjects with no enrolments', () => {
    expect(resolveLessonStudentIds(
      [],
      ['student-in-other-subject'],
      new Date('2026-09-14T00:00:00+08:00'),
      now,
    )).toEqual([])
  })

  it('does not fall back for a current Shanghai-day lesson when the server runs in UTC', () => {
    expect(resolveLessonStudentIds(
      [],
      ['student-in-other-subject'],
      new Date('2026-09-13T00:00:00+08:00'),
      new Date('2026-09-13T12:00:00+08:00'),
    )).toEqual([])
  })

  it('falls back to the group roster only for historical legacy lessons', () => {
    expect(resolveLessonStudentIds(
      [],
      ['legacy-student'],
      new Date('2026-09-12T00:00:00+08:00'),
      now,
    )).toEqual(['legacy-student'])
  })

  it('rejects attendance for a student outside the subject snapshot', () => {
    expect(isStudentInLessonRoster(
      'english-only-student',
      ['math-student'],
      ['math-student', 'english-only-student'],
      new Date('2026-09-13T00:00:00+08:00'),
      now,
    )).toBe(false)
  })

  it('intersects a stale snapshot with the current subject enrolment', () => {
    expect(resolveSubjectLessonStudentIds(
      ['math-student', 'english-only-student'],
      [
        { studentId: 'math-student', subjects: ['数学', '英语'] },
        { studentId: 'english-only-student', subjects: ['英语'] },
      ],
      '数学',
      new Date('2026-09-13T00:00:00+08:00'),
      now,
    )).toEqual(['math-student'])
  })

  it('uses the same active subject roster for upcoming previews and attendance', () => {
    const groupEnrollments = [
      { studentId: 'math-student', subjects: ['数学'] },
      { studentId: 'english-student', subjects: ['英语'] },
    ]
    const nextLessonRoster = resolveSubjectLessonStudentIds(
      ['math-student', 'english-student'],
      groupEnrollments,
      '数学',
      new Date('2026-09-14T00:00:00+08:00'),
      now,
    )

    expect(nextLessonRoster).toEqual(['math-student'])
    expect(nextLessonRoster.length).toBe(1)
  })

  it('does not copy a current or future lesson from group enrollment when its roster snapshot is missing', () => {
    const groupEnrollment = [
      { studentId: 'math-student', subjects: ['数学'] },
      { studentId: 'english-student', subjects: ['英语'] },
    ]

    expect(resolveSubjectLessonStudentIds(
      [],
      groupEnrollment,
      '数学',
      new Date('2026-09-13T00:00:00+08:00'),
      now,
    )).toEqual([])
    expect(resolveSubjectLessonStudentIds(
      [],
      groupEnrollment,
      '数学',
      new Date('2026-09-14T00:00:00+08:00'),
      now,
    )).toEqual([])
  })

  it('preserves a saved historical roster after a student withdraws or changes subjects', () => {
    expect(resolveSubjectLessonStudentIds(
      ['former-math-student', 'current-math-student'],
      [{ studentId: 'current-math-student', subjects: ['数学'] }],
      '数学',
      new Date('2026-09-12T00:00:00+08:00'),
      now,
    )).toEqual(['former-math-student', 'current-math-student'])
  })

  it('does not include another subject when falling back for a historical lesson', () => {
    expect(resolveSubjectLessonStudentIds(
      [],
      [
        { studentId: 'math-student', subjects: ['数学'] },
        { studentId: 'english-student', subjects: ['英语'] },
      ],
      '数学',
      new Date('2026-09-12T00:00:00+08:00'),
      now,
    )).toEqual(['math-student'])
  })
})
