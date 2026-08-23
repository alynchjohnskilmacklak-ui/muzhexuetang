import { describe, expect, it } from 'vitest'
import { isAdminTermScopedSWRKey } from './admin-term-scope-client'

describe('admin term scoped SWR keys', () => {
  it('invalidates business data that belongs to the selected term', () => {
    expect(isAdminTermScopedSWRKey('/api/dashboard?division=JUNIOR')).toBe(true)
    expect(isAdminTermScopedSWRKey('/api/students/grade-counts?division=JUNIOR')).toBe(true)
    expect(isAdminTermScopedSWRKey('/api/admin/salary?period=month')).toBe(true)
    expect(isAdminTermScopedSWRKey('/api/study-hall?date=2026-08-11')).toBe(true)
  })

  it('keeps global configuration and the term list cache', () => {
    expect(isAdminTermScopedSWRKey('/api/admin/academic-terms')).toBe(false)
    expect(isAdminTermScopedSWRKey('/api/settings/parent-accounts')).toBe(false)
    expect(isAdminTermScopedSWRKey(null)).toBe(false)
  })
})
