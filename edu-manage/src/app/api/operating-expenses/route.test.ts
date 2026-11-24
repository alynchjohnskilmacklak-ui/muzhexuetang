import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ requireFeeAdminScope: vi.fn(), getRequestPrisma: vi.fn(), getPrismaForDivision: vi.fn(), isDualDbEnabled: vi.fn() }))
vi.mock('@/lib/fee-admin-scope', () => ({ requireFeeAdminScope: mocks.requireFeeAdminScope }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma, getPrismaForDivision: mocks.getPrismaForDivision, isDualDbEnabled: mocks.isDualDbEnabled }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

describe('POST /api/operating-expenses validation', () => {
  const create = vi.fn()
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireFeeAdminScope.mockResolvedValue({ user: { id: 'admin-1', division: 'JUNIOR' }, division: 'JUNIOR' })
    mocks.isDualDbEnabled.mockReturnValue(false)
    mocks.getRequestPrisma.mockResolvedValue({ operatingExpense: { create } })
  })

  it('rejects unsupported cost categories before writing', async () => {
    const response = await POST(new NextRequest('http://localhost/api/operating-expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'PROFIT', description: '估算利润', amount: 200, occurredAt: '2026-11-01' }),
    }))
    expect(response.status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })

  it('rejects non-positive amounts before writing', async () => {
    const response = await POST(new NextRequest('http://localhost/api/operating-expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'RENT', description: '租金', amount: 0, occurredAt: '2026-11-01' }),
    }))
    expect(response.status).toBe(400)
    expect(create).not.toHaveBeenCalled()
  })
})
