import { describe, expect, it } from 'vitest'
import { resolveParentChildSelection } from './parent-children'

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
