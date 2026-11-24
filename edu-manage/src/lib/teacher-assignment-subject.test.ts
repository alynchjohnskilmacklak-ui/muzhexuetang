import { describe, expect, it } from 'vitest'
import { findTeacherAssignmentForSubject } from './teacher-assignment-subject'

describe('findTeacherAssignmentForSubject', () => {
  it('treats a legacy null subject as the group default subject', () => {
    const legacyAssignment = { id: 'legacy', teacherId: 'teacher-old', subject: null }

    expect(findTeacherAssignmentForSubject([legacyAssignment], '数学', '数学', 'teacher-old'))
      .toBe(legacyAssignment)
  })

  it('prefers an explicit matching assignment over a legacy default row', () => {
    const explicitAssignment = { id: 'explicit', teacherId: 'teacher-old', subject: '数学' }
    const legacyAssignment = { id: 'legacy', teacherId: 'teacher-old', subject: null }

    expect(findTeacherAssignmentForSubject([legacyAssignment, explicitAssignment], '数学', '数学', 'teacher-old'))
      .toBe(explicitAssignment)
  })

  it('matches a new teacher explicit default-subject row against a legacy null assignment', () => {
    const newTeacherAssignment = { id: 'explicit-new', teacherId: 'teacher-new', subject: '数学' }

    expect(findTeacherAssignmentForSubject([newTeacherAssignment], null, '数学', 'teacher-new'))
      .toBe(newTeacherAssignment)
  })

  it('does not match a null default assignment to another subject', () => {
    const legacyAssignment = { id: 'legacy', teacherId: 'teacher-old', subject: null }

    expect(findTeacherAssignmentForSubject([legacyAssignment], '英语', '数学', 'teacher-old')).toBeNull()
  })

  it('does not guess when more than one assignment is still ambiguous', () => {
    const assignments = [
      { id: 'math-1', teacherId: 'teacher-1', subject: '数学' },
      { id: 'math-2', teacherId: 'teacher-2', subject: '数学' },
    ]

    expect(findTeacherAssignmentForSubject(assignments, '数学', '数学')).toBeNull()
  })
})
