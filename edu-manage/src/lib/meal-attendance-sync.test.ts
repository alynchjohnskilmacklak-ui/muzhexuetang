import { describe, expect, it } from 'vitest'
import { resolveEatingMealStudentIds } from './meal-attendance-sync'

describe('resolveEatingMealStudentIds', () => {
  it('only includes selected students marked present in attendance', () => {
    expect(resolveEatingMealStudentIds([
      { studentId: 'present', status: 'PRESENT' },
      { studentId: 'leave', status: 'LEAVE' },
      { studentId: 'absent', status: 'ABSENT' },
      { studentId: 'makeup', status: 'MAKEUP' },
    ], ['present', 'leave', 'absent', 'makeup', 'outside', 'present'])).toEqual(['present'])
  })
})
