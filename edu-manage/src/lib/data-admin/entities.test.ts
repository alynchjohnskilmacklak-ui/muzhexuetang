import { describe, it, expect } from 'vitest'
import { DATA_ADMIN_TRASH_ENTITIES, filterEditableFields } from './entities'

describe('data administration safe fields', () => {
  it('coerces a year string to a number and allows clearing', () => {
    expect(filterEditableFields('students', { birthYear: '2012', notes: '已核实' })).toEqual({ birthYear: 2012, notes: '已核实' })
    expect(filterEditableFields('teachers', { graduationYear: '' })).toEqual({ graduationYear: null })
  })
  it.each([{}, [2020], true, 1.5, 'NaN'])('rejects invalid year values %j', value => {
    expect(() => filterEditableFields('students', { birthYear: value })).toThrow()
  })
  it.each([
    ['attendances', { hoursDeducted: 2 }], ['class-lessons', { status: 'CANCELLED' }],
    ['classroom-feedbacks', { status: 'PUBLISHED' }], ['students', { remainHours: 100 }],
    ['teachers', { status: 'RESIGNED' }], ['enrollments', { totalHours: 100 }],
  ] as const)('prevents bypass of %s business workflows', (entity, payload) => {
    expect(() => filterEditableFields(entity, payload)).toThrow(/业务页面/)
  })
  it('only allows entities backed by the shared recycle-bin service', () => {
    expect(DATA_ADMIN_TRASH_ENTITIES).toEqual(['students', 'class-groups', 'class-lessons', 'exam-papers', 'materials'])
  })
})
