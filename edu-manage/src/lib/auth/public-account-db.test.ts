import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  dual: true,
  defaultDb: { name: 'default' },
  juniorDb: { name: 'junior' },
  seniorDb: { name: 'senior' },
  getPrismaForDivision: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks.defaultDb,
  isDualDbEnabled: () => mocks.dual,
  getPrismaForDivision: mocks.getPrismaForDivision,
}))

import { getPublicAuthDatabases, parseAuthDivision } from '@/lib/auth/public-account-db'

describe('public authentication database selection', () => {
  beforeEach(() => {
    mocks.dual = true
    mocks.getPrismaForDivision.mockReset()
    mocks.getPrismaForDivision.mockImplementation((division: string) => (
      division === 'SENIOR' ? mocks.seniorDb : mocks.juniorDb
    ))
  })

  it('parses only supported divisions', () => {
    expect(parseAuthDivision('JUNIOR')).toBe('JUNIOR')
    expect(parseAuthDivision('SENIOR')).toBe('SENIOR')
    expect(parseAuthDivision('ALL')).toBeUndefined()
  })

  it('uses the explicitly selected database in dual database mode', () => {
    const result = getPublicAuthDatabases('SENIOR')
    expect(result).toEqual([{ division: 'SENIOR', prisma: mocks.seniorDb }])
    expect(mocks.getPrismaForDivision).toHaveBeenCalledWith('SENIOR')
  })

  it('searches both databases when a public reset request has no division', () => {
    expect(getPublicAuthDatabases()).toEqual([
      { division: 'JUNIOR', prisma: mocks.juniorDb },
      { division: 'SENIOR', prisma: mocks.seniorDb },
    ])
  })

  it('uses the default client in single database mode', () => {
    mocks.dual = false
    expect(getPublicAuthDatabases('SENIOR')).toEqual([
      { division: 'SENIOR', prisma: mocks.defaultDb },
    ])
    expect(mocks.getPrismaForDivision).not.toHaveBeenCalled()
  })
})
