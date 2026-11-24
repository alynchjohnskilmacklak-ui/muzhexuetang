import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  studentFindFirst: vi.fn(),
  candidateFindMany: vi.fn(),
  transactionFindMany: vi.fn(),
  updateMany: vi.fn(),
  activityCreate: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET, POST } from './route'

const transactionClient = {
  student: { findMany: mocks.transactionFindMany, updateMany: mocks.updateMany },
  activityLog: { create: mocks.activityCreate },
}

const request = (path: string, body?: Record<string, unknown>) => new NextRequest(`http://localhost${path}`, {
  method: body ? 'POST' : 'GET',
  headers: body ? { 'Content-Type': 'application/json' } : undefined,
  body: body ? JSON.stringify(body) : undefined,
})

describe('/api/admin/student-identities/merge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
    mocks.studentFindFirst.mockResolvedValue({
      id: 'student-current', identityId: 'identity-current', division: 'JUNIOR',
      name: '学生甲', parentId: 'parent-1', parentUserId: null,
    })
    mocks.candidateFindMany.mockResolvedValue([{ id: 'student-old', identityId: 'identity-old' }])
    mocks.transactionFindMany.mockResolvedValue([
      { id: 'student-current', identityId: 'identity-current', name: '学生甲', parentId: 'parent-1', parentUserId: null },
      { id: 'student-old', identityId: 'identity-old', name: '学生甲', parentId: 'parent-1', parentUserId: null },
    ])
    mocks.updateMany.mockResolvedValue({ count: 2 })
    mocks.activityCreate.mockResolvedValue({})
    mocks.transaction.mockImplementation(async (callback: (tx: typeof transactionClient) => unknown) => callback(transactionClient))
    mocks.getRequestPrisma.mockResolvedValue({
      student: { findFirst: mocks.studentFindFirst, findMany: mocks.candidateFindMany },
      $transaction: mocks.transaction,
    })
  })

  it('scopes identity candidates to the admin division and excludes deleted records', async () => {
    const response = await GET(request('/api/admin/student-identities/merge?studentId=student-current'))

    expect(response.status).toBe(200)
    expect(mocks.studentFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'student-current', division: 'JUNIOR', deletedAt: null },
    }))
    expect(mocks.candidateFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ division: 'JUNIOR', deletedAt: null }),
    }))
  })

  it('revalidates division, visibility and shared parent ownership inside the merge transaction', async () => {
    const response = await POST(request('/api/admin/student-identities/merge', {
      canonicalStudentId: 'student-current',
      studentIds: ['student-current', 'student-old'],
      confirmSameChild: true,
    }))

    expect(response.status).toBe(200)
    expect(mocks.transactionFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: ['student-current', 'student-old'] }, division: 'JUNIOR', deletedAt: null },
    }))
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['student-current', 'student-old'] }, division: 'JUNIOR', deletedAt: null },
      data: { identityId: 'identity-current' },
    })
    expect(mocks.activityCreate).toHaveBeenCalledOnce()
  })

  it('rejects cross-division or deleted records without updating any identity', async () => {
    mocks.transactionFindMany.mockResolvedValue([{ id: 'student-current', identityId: 'identity-current', parentId: 'parent-1' }])

    const response = await POST(request('/api/admin/student-identities/merge', {
      canonicalStudentId: 'student-current',
      studentIds: ['student-current', 'student-old'],
      confirmSameChild: true,
    }))

    expect(response.status).toBe(404)
    expect(mocks.updateMany).not.toHaveBeenCalled()
    expect(mocks.activityCreate).not.toHaveBeenCalled()
  })

  it('rejects records linked to different parents', async () => {
    mocks.transactionFindMany.mockResolvedValue([
      { id: 'student-current', identityId: 'identity-current', parentId: 'parent-1', parentUserId: null },
      { id: 'student-old', identityId: 'identity-old', parentId: 'parent-2', parentUserId: null },
    ])

    const response = await POST(request('/api/admin/student-identities/merge', {
      canonicalStudentId: 'student-current',
      studentIds: ['student-current', 'student-old'],
      confirmSameChild: true,
    }))

    expect(response.status).toBe(409)
    expect(mocks.updateMany).not.toHaveBeenCalled()
  })
})
