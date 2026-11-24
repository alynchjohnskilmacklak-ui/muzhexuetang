import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => {
  class MockAuthError extends Error {
    status = 403
  }
  return {
    AuthError: MockAuthError,
    requireAdminUser: vi.fn(),
    checkTeacherConflict: vi.fn(),
    checkRateLimit: vi.fn(async () => ({ allowed: true })),
  }
})

vi.mock('@/lib/auth/guards', () => ({ AuthError: mocks.AuthError, requireAdminUser: mocks.requireAdminUser }))
vi.mock('@/lib/teacher-conflict', () => ({ checkTeacherConflict: mocks.checkTeacherConflict }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: mocks.checkRateLimit }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))

import { POST } from './route'
import { POST as POST_BATCH } from './batch/route'

describe('class-group teacher conflict endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkRateLimit.mockResolvedValue({ allowed: true })
    mocks.requireAdminUser.mockRejectedValue(new mocks.AuthError('需要管理员权限'))
  })

  it('denies non-admin access to a single conflict lookup', async () => {
    const response = await POST(new NextRequest('http://localhost/api/class-groups/check-teacher-conflict', {
      method: 'POST',
      body: JSON.stringify({ teacherId: 'teacher-2', date: '2026-11-08', startTime: '17:00', endTime: '18:00' }),
      headers: { 'content-type': 'application/json' },
    }))

    expect(response.status).toBe(403)
    expect(mocks.checkTeacherConflict).not.toHaveBeenCalled()
  })

  it('denies non-admin access to batch availability lookups', async () => {
    const response = await POST_BATCH(new NextRequest('http://localhost/api/class-groups/check-teacher-conflict/batch', {
      method: 'POST',
      body: JSON.stringify({ items: [{ key: 'one', teacherId: 'teacher-2', date: '2026-11-08', startTime: '17:00', endTime: '18:00' }] }),
      headers: { 'content-type': 'application/json' },
    }))

    expect(response.status).toBe(403)
    expect(mocks.checkTeacherConflict).not.toHaveBeenCalled()
  })
})
