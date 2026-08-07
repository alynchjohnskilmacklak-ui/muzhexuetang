import { describe, expect, it } from 'vitest'
import { getSuperAdminEmails, isSuperAdminEmail } from '@/lib/super-admin'

describe('super admin identity', () => {
  it('normalizes configured emails and removes duplicates', () => {
    expect(getSuperAdminEmails(' Admin@Example.com,admin@example.com, boss@example.com '))
      .toEqual(['admin@example.com', 'boss@example.com'])
  })

  it('matches by stable email instead of display name', () => {
    expect(isSuperAdminEmail('ADMIN@example.com', 'admin@example.com')).toBe(true)
    expect(isSuperAdminEmail('other@example.com', 'admin@example.com')).toBe(false)
    expect(isSuperAdminEmail(undefined, 'admin@example.com')).toBe(false)
  })

  it('fails closed when no super admin email is configured', () => {
    expect(isSuperAdminEmail('admin@example.com', '')).toBe(false)
  })
})
