import { describe, expect, it } from 'vitest'
import { groupParentStudentRecords, selectLatestParentStudents } from './parent-student-selection'

function student(id: string, termStart: string, termStatus: string, grade: string) {
  return {
    id,
    name: '何浩辰',
    gender: null,
    birthYear: 2011,
    grade: null,
    updatedAt: new Date(`${termStart}T08:00:00Z`),
    termMemberships: [{
      grade,
      status: 'ACTIVE',
      joinedAt: new Date(`${termStart}T08:00:00Z`),
      term: { status: termStatus, startDate: new Date(`${termStart}T00:00:00Z`), name: '测试批次' },
    }],
  }
}

describe('selectLatestParentStudents', () => {
  it('keeps the record belonging to the active operational term', () => {
    const rows = selectLatestParentStudents([
      student('historical', '2025-09-01', 'ARCHIVED', '初一'),
      student('current', '2026-09-01', 'ACTIVE', '初二'),
    ])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: 'current', grade: '初二' })
  })

  it('does not collapse different students with the same name and different birth years', () => {
    const first = student('first', '2026-09-01', 'ACTIVE', '初二')
    const second = { ...student('second', '2026-09-01', 'ACTIVE', '初一'), birthYear: 2012 }
    expect(selectLatestParentStudents([first, second])).toHaveLength(2)
  })

  it('keeps historical IDs with the current child for parent reports', () => {
    const groups = groupParentStudentRecords([
      student('historical', '2025-09-01', 'ARCHIVED', '初一'),
      student('current', '2026-09-01', 'ACTIVE', '初二'),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]).toMatchObject({ student: { id: 'current' }, recordIds: ['historical', 'current'] })
  })

  it('does not merge same-name children enrolled in the same active term', () => {
    expect(selectLatestParentStudents([
      student('first', '2026-09-01', 'ACTIVE', '初二'),
      student('second', '2026-09-01', 'ACTIVE', '初二'),
    ])).toHaveLength(2)
  })
})
