import { describe, expect, it } from 'vitest'
import { selectParentMembership } from './membership'

const students = [
  { id: 'child-a', name: '学生甲', membershipLevel: 'NORMAL' },
  { id: 'child-b', name: '学生乙', membershipLevel: 'SVIP' },
]

describe('selectParentMembership', () => {
  it('uses the selected child for the first render', () => {
    expect(selectParentMembership(students, 'child-b')).toEqual({
      activeChildId: 'child-b', studentName: '学生乙', membershipLevel: 'SVIP',
    })
  })

  it('ignores a stale or foreign child ID', () => {
    expect(selectParentMembership(students, 'not-linked')).toEqual({
      activeChildId: 'child-a', studentName: '学生甲', membershipLevel: 'NORMAL',
    })
  })

  it('uses a neutral theme when no child is linked', () => {
    expect(selectParentMembership([])).toEqual({
      activeChildId: '', studentName: '', membershipLevel: 'NORMAL',
    })
  })
})
