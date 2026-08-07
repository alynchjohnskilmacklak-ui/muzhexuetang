import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ validateLoginAccount: vi.fn() }))

vi.mock('@/lib/login-accounts', () => ({
  validateLoginAccount: mocks.validateLoginAccount,
}))

import { authenticateCredentialInput } from '@/lib/credential-auth'
import { resetCredentialRateLimitsForTests } from '@/lib/login-rate-limit'

describe('authoritative credential authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetCredentialRateLimitsForTests()
  })

  it('invokes the password-validating account function exactly once', async () => {
    mocks.validateLoginAccount.mockResolvedValue({
      ok: true,
      user: {
        id: 'parent-user',
        email: 'parent@example.com',
        name: '家长',
        role: 'parent',
        division: 'JUNIOR',
      },
    })

    const result = await authenticateCredentialInput({
      email: 'parent@example.com',
      password: 'secret',
      loginRole: 'parent',
      division: 'JUNIOR',
      meta: {
        ip: '127.0.0.1',
        userAgent: 'test',
        device: 'Desktop',
        os: 'Test',
        browser: 'Test',
      },
    })

    expect(result.ok).toBe(true)
    expect(mocks.validateLoginAccount).toHaveBeenCalledTimes(1)
    expect(mocks.validateLoginAccount).toHaveBeenCalledWith(
      'parent@example.com',
      'secret',
      'parent',
      { persistUser: true, recordAttempt: true, recordSuccess: true },
      expect.objectContaining({ ip: '127.0.0.1' }),
      'JUNIOR',
    )
  })
})
