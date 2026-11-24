import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ requireFeeAdminScope: vi.fn(), getRequestPrisma: vi.fn(), getPrismaForDivision: vi.fn(), isDualDbEnabled: vi.fn() }))
vi.mock('@/lib/fee-admin-scope', () => ({ requireFeeAdminScope: mocks.requireFeeAdminScope }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma, getPrismaForDivision: mocks.getPrismaForDivision, isDualDbEnabled: mocks.isDualDbEnabled }))
vi.mock('@/lib/admin-term-scope', () => ({ resolveAdminTermScope: vi.fn() }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { POST } from './route'

describe('POST /api/renewals', () => {
  const membershipFindFirst = vi.fn()
  const prisma = { studentTermMembership: { findFirst: membershipFindFirst } }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireFeeAdminScope.mockResolvedValue({ user: { id: 'admin-1', division: 'JUNIOR' }, division: 'JUNIOR' })
    mocks.isDualDbEnabled.mockReturnValue(false)
    mocks.getRequestPrisma.mockResolvedValue(prisma)
  })

  it('rejects unknown follow-up statuses', async () => {
    const response = await POST(new NextRequest('http://localhost/api/renewals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: 'student-1', termId: 'term-1', status: 'MAYBE' }),
    }))
    expect(response.status).toBe(400)
    expect(membershipFindFirst).not.toHaveBeenCalled()
  })

  it('does not record follow-up for a student outside the active term', async () => {
    membershipFindFirst.mockResolvedValue(null)
    const response = await POST(new NextRequest('http://localhost/api/renewals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: 'student-1', termId: 'old-term', status: 'CONTACTED', note: '已联系' }),
    }))
    expect(response.status).toBe(404)
    expect(membershipFindFirst).toHaveBeenCalled()
  })
})
