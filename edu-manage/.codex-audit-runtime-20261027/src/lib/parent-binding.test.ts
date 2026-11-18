import { describe, expect, it } from 'vitest'
import { canReuseStudentRecord, parentIdsForPhone } from './parent-binding'

describe('parent binding safety', () => {
  it('identifies one existing household without duplicating account IDs', () => {
    expect(parentIdsForPhone([
      { parentId: 'parent-1', parentUserId: 'parent-1' },
      { parentId: 'parent-1', parentUserId: 'parent-1' },
    ])).toEqual(['parent-1'])
  })

  it('keeps conflicting accounts ambiguous for explicit admin choice', () => {
    expect(parentIdsForPhone([
      { parentId: 'parent-1', parentUserId: null },
      { parentId: 'parent-2', parentUserId: null },
    ])).toHaveLength(2)
  })

  it('rejects reusing a different named or different aged child', () => {
    expect(canReuseStudentRecord({ name: '甲同学', birthYear: 2012 }, { name: '乙同学', birthYear: 2012 })).toBe(false)
    expect(canReuseStudentRecord({ name: '甲同学', birthYear: 2012 }, { name: '甲同学', birthYear: 2013 })).toBe(false)
  })

  it('allows the same child with a missing birth year to keep a historical record', () => {
    expect(canReuseStudentRecord({ name: '甲同学', birthYear: 2012 }, { name: '甲同学', birthYear: null })).toBe(true)
  })
})
