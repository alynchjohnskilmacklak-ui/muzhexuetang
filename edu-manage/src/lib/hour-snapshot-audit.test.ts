import { describe, expect, it } from 'vitest'
import { auditHourSnapshots } from './hour-snapshot-audit'

describe('auditHourSnapshots', () => {
  it('ignores tiny floating point noise while matching the active enrollment ledger', () => {
    const result = auditHourSnapshots([{
      id: 'student-1',
      name: '学员一',
      remainHours: 1.20000001,
      totalHours: 10,
      enrollments: [
        { remainHours: 0.7, totalHours: 4 },
        { remainHours: 0.5, totalHours: 6 },
      ],
    }])

    expect(result.checkedCount).toBe(1)
    expect(result.mismatchCount).toBe(0)
    expect(result.mismatches).toEqual([])
  })

  it('reports snapshot and ledger differences, including students without active enrollments', () => {
    const result = auditHourSnapshots([
      {
        id: 'student-1',
        name: '学员一',
        remainHours: 134.4,
        totalHours: 160,
        enrollments: [{ remainHours: 0, totalHours: 0 }],
      },
      {
        id: 'student-2',
        name: '学员二',
        remainHours: 2,
        totalHours: 2,
        enrollments: [],
      },
    ])

    expect(result.mismatchCount).toBe(2)
    expect(result.mismatches).toMatchObject([
      { studentId: 'student-1', mismatch: 'BOTH', remainDelta: 134.4, totalDelta: 160, enrollmentCount: 1 },
      { studentId: 'student-2', mismatch: 'BOTH', remainDelta: 2, totalDelta: 2, enrollmentCount: 0 },
    ])
  })
})
