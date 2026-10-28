import { describe, expect, it } from 'vitest'
import { isParentStudentInLesson } from './parent-lesson-visibility'

describe('isParentStudentInLesson', () => {
  const group = { course: { subject: '数学' }, enrollments: [
    { studentId: 'math', subjects: ['数学'] },
    { studentId: 'english', subjects: ['英语'] },
  ] }

  it('uses the manual lesson roster, not the whole class enrollment', () => {
    const lesson = { isManual: true, subject: '数学', group, lessonStudents: [{ studentId: 'math' }] }
    expect(isParentStudentInLesson(lesson, 'math')).toBe(true)
    expect(isParentStudentInLesson(lesson, 'english')).toBe(false)
  })

  it('does not expose an empty manual lesson roster', () => {
    expect(isParentStudentInLesson({ isManual: true, subject: '数学', group, lessonStudents: [] }, 'math')).toBe(false)
  })

  it('does not fall back to enrollment when another student has a snapshot row', () => {
    expect(isParentStudentInLesson({ subject: '数学', group, _count: { lessonStudents: 1 }, lessonStudents: [] }, 'math')).toBe(false)
  })

  it('uses enrollment subject for a legacy lesson without snapshots', () => {
    const lesson = { subject: '数学', group, lessonStudents: [] }
    expect(isParentStudentInLesson(lesson, 'math')).toBe(true)
    expect(isParentStudentInLesson(lesson, 'english')).toBe(false)
  })
})
