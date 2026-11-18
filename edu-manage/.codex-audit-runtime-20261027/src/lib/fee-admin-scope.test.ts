import { describe, expect, it } from 'vitest'
import { resolveFeeDivisionScope } from '@/lib/fee-division-scope'

describe('fee admin division scope', () => {
  it('defaults ordinary admins to the division stored in their session', () => {
    expect(resolveFeeDivisionScope('SENIOR', undefined, false)).toBe('SENIOR')
    expect(resolveFeeDivisionScope('JUNIOR', 'unexpected', false)).toBe('JUNIOR')
  })

  it('rejects cross-division and all-division access for ordinary admins', () => {
    expect(() => resolveFeeDivisionScope('JUNIOR', 'SENIOR', false)).toThrow('无权访问其他学部')
    expect(() => resolveFeeDivisionScope('SENIOR', 'all', false)).toThrow('无权访问其他学部')
  })

  it('allows configured super admins to choose either division or all', () => {
    expect(resolveFeeDivisionScope('JUNIOR', 'SENIOR', true)).toBe('SENIOR')
    expect(resolveFeeDivisionScope('SENIOR', 'all', true)).toBe('all')
  })
})
