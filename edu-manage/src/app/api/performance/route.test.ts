import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getRequestPrisma: vi.fn(),
  resolveTeacherForUser: vi.fn(),
  assertTeacherOwnsStudent: vi.fn(),
  getParentChildren: vi.fn(),
  findParentChild: vi.fn(),
  postFindMany: vi.fn(),
  postCount: vi.fn(),
  studentFindMany: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/performance', () => ({ resolveTeacherForUser: mocks.resolveTeacherForUser }))
vi.mock('@/lib/teacher-portal', () => ({ assertTeacherOwnsStudent: mocks.assertTeacherOwnsStudent, TEACHER_LOG_ACTIONS: {} }))
vi.mock('@/lib/parent-children', () => ({
  getParentChildren: mocks.getParentChildren,
  findParentChild: mocks.findParentChild,
}))
vi.mock('@/lib/division', () => ({ getRequestDivision: () => 'JUNIOR' }))
vi.mock('@/lib/admin-term-scope', () => ({ resolveAdminTermScope: vi.fn() }))
vi.mock('@/lib/academic-term', () => ({ getActiveAcademicTerm: vi.fn() }))
vi.mock('@/lib/learning-record-term', () => ({ resolveLearningRecordTermId: vi.fn() }))
vi.mock('@/lib/notifications', () => ({ createNotification: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

describe('/api/performance parent identity scope', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'parent-1', role: 'parent', division: 'JUNIOR' } })
    mocks.getRequestPrisma.mockResolvedValue({
      student: { findMany: mocks.studentFindMany },
      performancePost: { findMany: mocks.postFindMany, count: mocks.postCount },
    })
    mocks.getParentChildren.mockResolvedValue([{ id: 'student-current', recordIds: ['student-current', 'student-old'] }])
    mocks.findParentChild.mockImplementation((children: Array<{ id: string; recordIds: string[] }>, requested: string) => (
      children.find((child) => child.recordIds.includes(requested)) || null
    ))
    mocks.postFindMany.mockResolvedValue([])
    mocks.postCount.mockResolvedValue(0)
    mocks.studentFindMany.mockResolvedValue([{ id: 'student-current' }])
  })

  it('returns current and historical posts for the selected child identity', async () => {
    const response = await GET(new NextRequest('http://localhost/api/performance?studentId=student-current&limit=50'))

    expect(response.status).toBe(200)
    expect(mocks.postFindMany.mock.calls[0][0].where.studentId).toEqual({
      in: ['student-current', 'student-old'],
    })
    expect(mocks.postFindMany.mock.calls[0][0].where.student).toEqual(expect.objectContaining({
      id: { in: ['student-current', 'student-old'] },
      OR: [{ parentId: 'parent-1' }, { parentUserId: 'parent-1' }],
      deletedAt: null,
    }))
    expect(mocks.postFindMany.mock.calls[0][0].where.student).not.toHaveProperty('status')
    expect(mocks.studentFindMany).not.toHaveBeenCalled()
  })

  it('does not return posts when the requested identity is not linked to the parent', async () => {
    mocks.findParentChild.mockReturnValue(null)

    const response = await GET(new NextRequest('http://localhost/api/performance?studentId=other-child'))

    expect(response.status).toBe(403)
    expect(mocks.postFindMany).not.toHaveBeenCalled()
  })

  it('keeps the existing active-child scope when no student is selected', async () => {
    const response = await GET(new NextRequest('http://localhost/api/performance'))

    expect(response.status).toBe(200)
    expect(mocks.postFindMany.mock.calls[0][0].where.studentId).toEqual({ in: ['student-current'] })
    expect(mocks.studentFindMany).toHaveBeenCalledOnce()
  })
})
