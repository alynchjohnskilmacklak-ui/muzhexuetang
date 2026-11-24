import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ getLoginStatus: vi.fn() }))

vi.mock('@/lib/login-accounts', () => ({ getLoginStatus: mocks.getLoginStatus }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

describe('POST /api/auth/login-status', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getLoginStatus.mockResolvedValue({ locked: false, failCount: 0, remaining: 5 })
  })

  it('uses only the trusted reverse-proxy IP for lockout status', async () => {
    const response = await POST(new NextRequest('http://localhost/api/auth/login-status', {
      method: 'POST',
      body: JSON.stringify({ email: 'parent@example.com', division: 'SENIOR' }),
      headers: {
        'content-type': 'application/json',
        'x-real-ip': '203.0.113.8',
        'x-forwarded-for': '198.51.100.99',
      },
    }))

    expect(response.status).toBe(200)
    expect(mocks.getLoginStatus).toHaveBeenCalledWith('parent@example.com', 'SENIOR', '203.0.113.8')
  })
})
