import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getRequestPrisma: vi.fn(), getParentChildren: vi.fn() }))
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/parent-children', () => ({
  getParentChildren: mocks.getParentChildren,
  findParentChild: (children: Array<{ id: string; recordIds: string[] }>, requested: string | null) =>
    children.find((child) => requested && child.recordIds.includes(requested)) || null,
}))

import { GET } from './route'

function createDb() {
  return {
    student: {
      findMany: vi.fn().mockResolvedValue([{
        id: 'child-1', name: '学员甲', grade: '初二', enrollments: [],
      }]),
    },
    attendance: { findMany: vi.fn().mockResolvedValue([]) },
    hourTransaction: { findMany: vi.fn().mockResolvedValue([]) },
  }
}

describe('GET /api/parent/hour-records scope', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'parent-1', role: 'parent' } })
    mocks.getParentChildren.mockResolvedValue([{
      id: 'child-1', name: '学员甲', recordIds: ['child-old-term', 'child-1'],
    }])
  })

  it('scopes requested child records and ignores soft-deleted ledger rows', async () => {
    const db = createDb()
    mocks.getRequestPrisma.mockResolvedValue(db)

    const response = await GET(new NextRequest('http://localhost/api/parent/hour-records?studentId=child-1'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.students).toHaveLength(1)
    expect(db.attendance.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ studentId: { in: ['child-old-term', 'child-1'] }, deletedAt: null }),
    }))
    expect(db.hourTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ studentId: { in: ['child-old-term', 'child-1'] }, deletedAt: null }),
    }))
  })

  it('returns 404 for an unlinked child instead of broadening to every linked child', async () => {
    const db = createDb()
    mocks.getRequestPrisma.mockResolvedValue(db)

    const response = await GET(new NextRequest('http://localhost/api/parent/hour-records?studentId=someone-else'))

    expect(response.status).toBe(404)
    expect(db.attendance.findMany).not.toHaveBeenCalled()
    expect(db.hourTransaction.findMany).not.toHaveBeenCalled()
  })
})
