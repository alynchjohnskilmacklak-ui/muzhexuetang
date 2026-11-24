import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
}))

vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET, PATCH } from './route'

describe('/api/settings/notify', () => {
  const upsert = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin' })
    mocks.getRequestPrisma.mockResolvedValue({ notifyConfig: { upsert } })
    upsert.mockResolvedValue({ id: 'singleton', absenceAlert: true, lowHoursWarn: 3, overdueFeeAlert: true })
  })

  it('allows administrators to persist the supported attendance alert settings', async () => {
    const response = await PATCH(new NextRequest('http://localhost/api/settings/notify', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ absenceAlert: false, lowHoursWarn: 5, overdueFeeAlert: false }),
    }))

    expect(response.status).toBe(200)
    expect(upsert).toHaveBeenCalledWith({
      where: { id: 'singleton' },
      create: { id: 'singleton', absenceAlert: false, lowHoursWarn: 5, overdueFeeAlert: false },
      update: { absenceAlert: false, lowHoursWarn: 5, overdueFeeAlert: false },
    })
  })

  it('rejects out-of-range thresholds and unsupported fields', async () => {
    const invalidThreshold = await PATCH(new NextRequest('http://localhost/api/settings/notify', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lowHoursWarn: 51 }),
    }))
    const unsupportedField = await PATCH(new NextRequest('http://localhost/api/settings/notify', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ performancePush: false }),
    }))

    expect(invalidThreshold.status).toBe(400)
    expect(unsupportedField.status).toBe(400)
    expect(upsert).not.toHaveBeenCalled()
  })

  it('does not expose or mutate settings for non-administrators', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'teacher-1', role: 'teacher' })
    const response = await PATCH(new NextRequest('http://localhost/api/settings/notify', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ absenceAlert: false }),
    }))

    expect(response.status).toBe(403)
    expect(upsert).not.toHaveBeenCalled()
  })
})
