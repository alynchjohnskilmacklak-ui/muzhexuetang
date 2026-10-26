import { describe, expect, it } from 'vitest'
import { getDataAdminDivisionScope } from './division-scope'

describe('data-admin division scopes', () => {
  it('filters student-related entities through their student relation', () => {
    expect(getDataAdminDivisionScope('exam-papers', 'JUNIOR')).toEqual({
      student: { division: 'JUNIOR' },
    })
  })

  it('filters classroom feedback through its teacher relation, not a nonexistent student relation', () => {
    expect(getDataAdminDivisionScope('classroom-feedbacks', 'SENIOR')).toEqual({
      teacher: { is: { division: 'SENIOR' } },
    })
  })

  it('keeps admin-shared materials visible and scopes teacher materials by teacher or lesson division', () => {
    expect(getDataAdminDivisionScope('materials', 'JUNIOR')).toEqual({
      AND: [{
        OR: [
          { source: 'ADMIN' },
          { teacher: { is: { division: 'JUNIOR' } } },
          { classLesson: { is: { division: 'JUNIOR' } } },
        ],
      }],
    })
  })

  it('uses a direct division field for entities that own one', () => {
    expect(getDataAdminDivisionScope('teachers', 'SENIOR')).toEqual({ division: 'SENIOR' })
  })
})
