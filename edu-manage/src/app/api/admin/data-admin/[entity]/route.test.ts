import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getRequestPrisma: vi.fn(),
  getRequestDivision: vi.fn(),
  getDynamicModel: vi.fn(),
  model: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
}))

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/division', () => ({ getRequestDivision: mocks.getRequestDivision }))
vi.mock('@/lib/data-admin/dynamic-model', () => ({ getDynamicModel: mocks.getDynamicModel }))

import { NextRequest } from 'next/server'
import { GET } from './route'

describe('GET /api/admin/data-admin/[entity] division scoping', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'admin-a', role: 'admin', division: 'JUNIOR' } })
    mocks.getRequestPrisma.mockResolvedValue({})
    mocks.getRequestDivision.mockReturnValue('JUNIOR')
    mocks.getDynamicModel.mockReturnValue(mocks.model)
    mocks.model.count.mockResolvedValue(0)
    mocks.model.findMany.mockResolvedValue([])
  })

  async function query(entity: string, query = '') {
    const request = new NextRequest(`http://localhost/api/admin/data-admin/${entity}${query}`)
    return GET(request, { params: Promise.resolve({ entity }) })
  }

  it('queries classroom feedback through the teacher division relation', async () => {
    const response = await query('classroom-feedbacks')

    expect(response.status).toBe(200)
    expect(mocks.model.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ teacher: { is: { division: 'JUNIOR' } } }),
    })
  })

  it('scopes materials without overwriting the search OR filter', async () => {
    const response = await query('materials', '?search=代数')

    expect(response.status).toBe(200)
    expect(mocks.model.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: [{ OR: expect.arrayContaining([
          { source: 'ADMIN' },
          { teacher: { is: { division: 'JUNIOR' } } },
          { classLesson: { is: { division: 'JUNIOR' } } },
        ]) }],
        OR: expect.arrayContaining([
          { title: { contains: '代数', mode: 'insensitive' } },
          { subject: { contains: '代数', mode: 'insensitive' } },
        ]),
      }),
    }))
  })
})
