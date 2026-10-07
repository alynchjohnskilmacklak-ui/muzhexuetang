import { describe, expect, it } from 'vitest'
import { feedbackSubject } from './subject'

describe('feedbackSubject', () => {
  it('prefers the actual lesson subject over the teacher assignment', () => {
    expect(feedbackSubject({ subject: '数学', group: { teacherAssignments: [{ teacherId: 't1', subject: '英语' }] } }, 't1')).toBe('数学')
  })

  it('uses a unique assignment for an unlinked feedback', () => {
    expect(feedbackSubject(null, 't1', { teacherAssignments: [{ teacherId: 't1', subject: '数学' }] })).toBe('数学')
  })

  it('does not guess when a teacher has multiple subjects in one group', () => {
    expect(feedbackSubject(null, 't1', { teacherAssignments: [
      { teacherId: 't1', subject: '数学' }, { teacherId: 't1', subject: '英语' },
    ], course: { subject: '英语' } })).toBe('')
  })

  it('does not borrow another teacher’s assignment or the course default', () => {
    expect(feedbackSubject(null, 't1', { teacherAssignments: [{ teacherId: 't2', subject: '英语' }], course: { subject: '英语' } })).toBe('')
  })
})
