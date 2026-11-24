import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  compare: vi.fn(),
  hash: vi.fn(),
  getPasswordPolicyError: vi.fn(),
}))

vi.mock('@/lib/auth/guards', () => ({ requireAuthenticatedUser: mocks.requireAuthenticatedUser }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))
vi.mock('@/lib/password-policy', () => ({ getPasswordPolicyError: mocks.getPasswordPolicyError }))
vi.mock('bcryptjs', () => ({ default: { compare: mocks.compare, hash: mocks.hash } }))

import { POST } from './route'

describe('POST /api/auth/change-password', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const prisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({ password: '$2b$hashed' }),
        update: vi.fn().mockResolvedValue({}),
      },
      activityLog: { create: vi.fn().mockResolvedValue({}) },
      $transaction: vi.fn().mockResolvedValue([]),
    }
    mocks.requireAuthenticatedUser.mockResolvedValue({ id: 'user-a', prisma })
    mocks.compare.mockResolvedValue(true)
    mocks.hash.mockResolvedValue('$2b$new-hash')
    mocks.getPasswordPolicyError.mockReturnValue(null)
  })

  it('compares the exact existing password, including leading and trailing spaces', async () => {
    const response = await POST(new NextRequest('http://localhost/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: ' current password ', newPassword: 'New-password-123' }),
    }))

    expect(response.status).toBe(200)
    expect(mocks.compare).toHaveBeenCalledWith(' current password ', '$2b$hashed')
  })
})
