import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getPrismaForDivision: vi.fn(),
  sendWxMessage: vi.fn(),
  hasSubmittedLessonAttendance: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({ getPrismaForDivision: mocks.getPrismaForDivision }))
vi.mock('@/lib/wxpusher', () => ({ sendWxMessage: mocks.sendWxMessage }))
vi.mock('@/lib/attendance-submission', () => ({ hasSubmittedLessonAttendance: mocks.hasSubmittedLessonAttendance }))

import { POST } from './route'

describe('POST /api/cron/daily-ops-report authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', 'cron-test-secret')
    vi.stubEnv('HEALTH_TOKEN', 'health-test-secret')
  })

  afterEach(() => vi.unstubAllEnvs())

  it('rejects the health token before reading or notifying business data', async () => {
    const response = await POST(new NextRequest('http://localhost/api/cron/daily-ops-report', {
      method: 'POST',
      headers: { authorization: 'Bearer health-test-secret' },
    }))

    expect(response.status).toBe(401)
    expect(mocks.getPrismaForDivision).not.toHaveBeenCalled()
    expect(mocks.sendWxMessage).not.toHaveBeenCalled()
  })

  it('rejects query-string credentials', async () => {
    const response = await POST(new NextRequest('http://localhost/api/cron/daily-ops-report?token=cron-test-secret', {
      method: 'POST',
    }))

    expect(response.status).toBe(401)
    expect(mocks.getPrismaForDivision).not.toHaveBeenCalled()
  })

  it('accepts CRON_SECRET from the bearer header and completes with an empty database fixture', async () => {
    const db = {
      classLesson: { findMany: vi.fn(async () => []) },
      classroomFeedback: { count: vi.fn(async () => 0) },
      user: { findMany: vi.fn(async () => []) },
    }
    mocks.getPrismaForDivision.mockReturnValue(db)

    const response = await POST(new NextRequest('http://localhost/api/cron/daily-ops-report', {
      method: 'POST',
      headers: { authorization: 'Bearer cron-test-secret' },
    }))

    expect(response.status).toBe(200)
    expect(mocks.getPrismaForDivision).toHaveBeenCalledTimes(2)
    expect(mocks.sendWxMessage).not.toHaveBeenCalled()
  })
})
