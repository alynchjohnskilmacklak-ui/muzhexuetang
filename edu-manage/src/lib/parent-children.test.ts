import { describe, expect, it, vi } from 'vitest'
import { getParentChildren, resolveParentChildSelection } from './parent-children'

const children = [
  { id: 'child-a', recordIds: ['student-a-old', 'student-a-current'] },
  { id: 'child-b', recordIds: ['student-b'] },
]

describe('parent child feedback scope', () => {
  it('uses the requested child and includes only that child’s linked records', () => {
    const scope = resolveParentChildSelection(children, 'student-a-old', 'student-b')

    expect(scope.selectedChild?.id).toBe('child-a')
    expect(scope.studentIds).toEqual(['student-a-old', 'student-a-current'])
    expect(scope.invalidChild).toBe(false)
  })

  it('uses the stored active child when the URL has no child selection', () => {
    const scope = resolveParentChildSelection(children, '', 'student-b')

    expect(scope.selectedChild?.id).toBe('child-b')
    expect(scope.studentIds).toEqual(['student-b'])
  })

  it('uses the first linked child when neither URL nor active-child cookie is set', () => {
    const scope = resolveParentChildSelection(children, '', '')

    expect(scope.selectedChild?.id).toBe('child-a')
    expect(scope.studentIds).toEqual(['student-a-old', 'student-a-current'])
  })

  it('keeps all linked children only for the explicit all-children view', () => {
    const scope = resolveParentChildSelection(children, 'all', 'student-b')

    expect(scope.selectedChild).toBeNull()
    expect(scope.studentIds).toEqual(['student-a-old', 'student-a-current', 'student-b'])
    expect(scope.invalidChild).toBe(false)
  })

  it('does not fall back to another child for an invalid requested id', () => {
    const scope = resolveParentChildSelection(children, 'someone-elses-student', 'student-b')

    expect(scope.selectedChild).toBeNull()
    expect(scope.studentIds).toEqual([])
    expect(scope.invalidChild).toBe(true)
  })
})

describe('getParentChildren historical records', () => {
  it('keeps inactive term records under the active child identity without showing inactive-only identities', async () => {
    const firstTerm = new Date('2026-07-01T00:00:00Z')
    const secondTerm = new Date('2026-10-01T00:00:00Z')
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'student-old', identityId: 'identity-a', name: '学生甲', grade: '初一', status: 'INACTIVE',
        gender: null, birthYear: null, updatedAt: firstTerm, membershipLevel: null,
        termMemberships: [{ grade: '初一', status: 'COMPLETED', joinedAt: firstTerm, term: { status: 'COMPLETED', startDate: firstTerm, name: '第一期' } }],
      },
      {
        id: 'student-current', identityId: 'identity-a', name: '学生甲', grade: '初二', status: 'ACTIVE',
        gender: null, birthYear: null, updatedAt: secondTerm, membershipLevel: null,
        termMemberships: [{ grade: '初二', status: 'ACTIVE', joinedAt: secondTerm, term: { status: 'ACTIVE', startDate: secondTerm, name: '第二期' } }],
      },
      {
        id: 'student-inactive-only', identityId: 'identity-b', name: '学生乙', grade: '初一', status: 'INACTIVE',
        gender: null, birthYear: null, updatedAt: firstTerm, membershipLevel: null,
        termMemberships: [],
      },
    ])

    const children = await getParentChildren({ student: { findMany } } as never, 'parent-1')

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        OR: [{ parentId: 'parent-1' }, { parentUserId: 'parent-1' }],
        deletedAt: null,
      },
    }))
    expect(children).toHaveLength(1)
    expect(children[0]).toMatchObject({
      id: 'student-current',
      name: '学生甲',
      termName: '第二期',
      recordIds: ['student-old', 'student-current'],
    })
  })
})
