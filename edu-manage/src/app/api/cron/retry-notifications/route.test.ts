import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  prisma: { notification: { findMany: vi.fn(), updateMany: vi.fn() } },
  getPrismaForDivision: vi.fn(),
  isDualDbEnabled: vi.fn(),
  qywxEnabled: vi.fn(),
  getQywxGroupSendResult: vi.fn(),
  sendQywxParentMass: vi.fn(),
  buildParentDailyDigest: vi.fn(),
  getLocalDayRange: vi.fn(),
  localDateKey: vi.fn(),
  getParentDailyFeedbackReadiness: vi.fn(),
  createOverdueFeeAlerts: vi.fn(),
  createRenewalTermAlerts: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mocks.prisma,
  getPrismaForDivision: mocks.getPrismaForDivision,
  isDualDbEnabled: mocks.isDualDbEnabled,
}))
vi.mock('@/lib/qywx', () => ({
  qywxEnabled: mocks.qywxEnabled,
  getQywxGroupSendResult: mocks.getQywxGroupSendResult,
  sendQywxParentMass: mocks.sendQywxParentMass,
}))
vi.mock('@/lib/daily-digest', () => ({ buildParentDailyDigest: mocks.buildParentDailyDigest }))
vi.mock('@/lib/date/local-day', () => ({ getLocalDayRange: mocks.getLocalDayRange, localDateKey: mocks.localDateKey }))
vi.mock('@/lib/qywx-daily-feedback', () => ({ getParentDailyFeedbackReadiness: mocks.getParentDailyFeedbackReadiness }))
vi.mock('@/lib/overdue-fee-alerts', () => ({ createOverdueFeeAlerts: mocks.createOverdueFeeAlerts }))
vi.mock('@/lib/renewal-term-alerts', () => ({ createRenewalTermAlerts: mocks.createRenewalTermAlerts }))

import { POST } from './route'

describe('POST /api/cron/retry-notifications authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', 'cron-test-secret')
    vi.stubEnv('HEALTH_TOKEN', 'health-test-secret')
    mocks.prisma.notification.findMany.mockResolvedValue([])
    mocks.prisma.notification.updateMany.mockResolvedValue({ count: 0 })
    mocks.qywxEnabled.mockReturnValue(false)
    mocks.isDualDbEnabled.mockReturnValue(false)
    mocks.createOverdueFeeAlerts.mockResolvedValue({ notified: 0 })
    mocks.createRenewalTermAlerts.mockResolvedValue({ notified: 0 })
  })

  afterEach(() => vi.unstubAllEnvs())

  it('rejects the health token before polling or sending parent notifications', async () => {
    const response = await POST(new NextRequest('http://localhost/api/cron/retry-notifications', {
      method: 'POST',
      headers: { authorization: 'Bearer health-test-secret' },
    }))

    expect(response.status).toBe(401)
    expect(mocks.prisma.notification.findMany).not.toHaveBeenCalled()
    expect(mocks.sendQywxParentMass).not.toHaveBeenCalled()
  })

  it('accepts CRON_SECRET and processes an empty queue safely', async () => {
    const response = await POST(new NextRequest('http://localhost/api/cron/retry-notifications', {
      method: 'POST',
      headers: { authorization: 'Bearer cron-test-secret' },
    }))

    expect(response.status).toBe(200)
    expect(mocks.prisma.notification.findMany).toHaveBeenCalled()
    expect(mocks.sendQywxParentMass).not.toHaveBeenCalled()
  })
})
