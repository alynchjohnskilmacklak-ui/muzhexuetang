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

import { GET } from './route'

describe('GET /api/schedules/check-conflict', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkRateLimit.mockResolvedValue({ allowed: true })
    mocks.requireAdminUser.mockRejectedValue(new mocks.AuthError('需要管理员权限'))
  })

  it('denies non-admin access before reading teacher availability', async () => {
    const response = await GET(new NextRequest(
      'http://localhost/api/schedules/check-conflict?teacherId=teacher-2&date=2026-11-08&startTime=17:00&endTime=18:00',
    ))

    expect(response.status).toBe(403)
    expect(mocks.checkTeacherConflict).not.toHaveBeenCalled()
  })

  it('allows an administrator and uses the administrator division database', async () => {
    const prisma = { id: 'admin-database' }
    mocks.requireAdminUser.mockResolvedValue({ prisma })
    mocks.checkTeacherConflict.mockResolvedValue({ conflict: false })

    const response = await GET(new NextRequest(
      'http://localhost/api/schedules/check-conflict?teacherId=teacher-2&date=2026-11-08&startTime=17:00&endTime=18:00',
    ))

    expect(response.status).toBe(200)
    expect(mocks.checkTeacherConflict).toHaveBeenCalledWith(prisma, {
      teacherId: 'teacher-2', date: '2026-11-08', startTime: '17:00', endTime: '18:00',
    })
  })
})
