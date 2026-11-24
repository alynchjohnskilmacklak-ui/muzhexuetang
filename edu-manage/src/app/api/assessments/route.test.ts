import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getRequestPrisma: vi.fn(), getRequestDivision: vi.fn() }))
vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/division', () => ({ getRequestDivision: mocks.getRequestDivision }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

describe('GET /api/assessments access control', () => {
  const groupFindFirst = vi.fn()
  const assessmentFindMany = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
    mocks.getRequestDivision.mockReturnValue('JUNIOR')
    mocks.getRequestPrisma.mockResolvedValue({
      classGroup: { findFirst: groupFindFirst },
      assessment: { findMany: assessmentFindMany },
    })
    groupFindFirst.mockResolvedValue(null)
  })

  it('blocks an administrator from reading a class in a different division', async () => {
    const response = await GET(new NextRequest('http://localhost/api/assessments?groupId=senior-group'))

    expect(response.status).toBe(403)
    expect(groupFindFirst).toHaveBeenCalledWith({
      where: { id: 'senior-group', division: 'JUNIOR', status: { not: 'ARCHIVED' } },
      select: { id: true },
    })
    expect(assessmentFindMany).not.toHaveBeenCalled()
  })
})
