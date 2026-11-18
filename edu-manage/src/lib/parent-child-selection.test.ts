import { describe, expect, it } from 'vitest'
import { resolveParentChildId, resolveParentChildSelection, resolveParentChildRequest } from './parent-child-selection'

const children = [
  { id: 'mazimo-current', recordIds: ['mazimo-current', 'mazimo-history'], name: '马子墨' },
  { id: 'mazichen-current', recordIds: ['mazichen-current'], name: '马紫晨' },
]

describe('parent child selection', () => {
  it('flags an invalid URL even when another remembered child is valid', () => {
    expect(resolveParentChildRequest(children, 'foreign-child', 'mazichen-current')).toEqual({
      selected: children[1], invalidChild: true,
    })
  })

  it('canonicalizes an authorized historical record without treating its context as invalid', () => {
    expect(resolveParentChildRequest(children, 'mazimo-history', 'mazichen-current')).toEqual({
      selected: children[0], invalidChild: false,
    })
  })

  it('handles missing selections and an empty child list', () => {
    expect(resolveParentChildRequest(children, null, 'mazichen-current').selected?.id).toBe('mazichen-current')
    expect(resolveParentChildRequest(children, 'unknown', 'unknown')).toEqual({ selected: children[0], invalidChild: true })
    expect(resolveParentChildRequest([], 'unknown')).toEqual({ selected: undefined, invalidChild: true })
  })
  it('prefers a valid URL child over the remembered child', () => {
    expect(resolveParentChildId(children, ['mazimo-current', 'mazichen-current'])).toBe('mazimo-current')
  })

  it('uses the remembered child when the page has no valid URL selection', () => {
    expect(resolveParentChildId(children, [null, 'mazichen-current'])).toBe('mazichen-current')
    expect(resolveParentChildId(children, ['deleted-record', 'mazichen-current'])).toBe('mazichen-current')
  })

  it('maps a historical student record ID to its current child identity', () => {
    expect(resolveParentChildId(children, ['mazimo-history'])).toBe('mazimo-current')
  })

  it('falls back to the first child only when no requested or remembered ID matches', () => {
    expect(resolveParentChildId(children, ['deleted-record', 'also-deleted'])).toBe('mazimo-current')
    expect(resolveParentChildSelection([], ['anything'])).toBeUndefined()
  })
})
