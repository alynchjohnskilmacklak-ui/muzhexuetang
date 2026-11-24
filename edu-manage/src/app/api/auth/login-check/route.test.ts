import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ precheckLoginAccount: vi.fn() }))

vi.mock('@/lib/login-accounts', () => ({ precheckLoginAccount: mocks.precheckLoginAccount }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

describe('POST /api/auth/login-check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.precheckLoginAccount.mockResolvedValue({ ok: true })
  })

  it('checks lockout with the trusted reverse-proxy IP', async () => {
    const response = await POST(new NextRequest('http://localhost/api/auth/login-check', {
      method: 'POST',
      body: JSON.stringify({
        email: '13800138000', loginRole: 'parent', division: 'JUNIOR', identifierType: 'phone',
      }),
      headers: {
        'content-type': 'application/json',
        'x-real-ip': '203.0.113.10',
        'x-forwarded-for': '198.51.100.99',
      },
    }))

    expect(response.status).toBe(200)
    expect(mocks.precheckLoginAccount).toHaveBeenCalledWith(
      '13800138000', 'parent', 'JUNIOR', 'phone', '203.0.113.10',
    )
  })
})
