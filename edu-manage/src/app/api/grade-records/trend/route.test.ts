import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  assertCanAccessStudent: vi.fn(),
}))
vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/auth/guards', () => ({ assertCanAccessStudent: mocks.assertCanAccessStudent }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

describe('grade trend group authorization', () => {
  const groupFindFirst = vi.fn()
  const assessmentFindMany = vi.fn()

  function request(studentId = 'student-1', groupId = 'group-1') {
    return new NextRequest(`http://localhost/api/grade-records/trend?studentId=${studentId}&groupId=${groupId}`)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'parent-1', role: 'parent', division: 'JUNIOR' })
    mocks.assertCanAccessStudent.mockResolvedValue(undefined)
    mocks.getRequestPrisma.mockResolvedValue({
      classGroup: { findFirst: groupFindFirst },
      assessment: { findMany: assessmentFindMany },
    })
    groupFindFirst.mockResolvedValue({ id: 'group-1' })
    assessmentFindMany.mockResolvedValue([])
  })

  it('does not read assessments when the child has no enrollment in the requested group', async () => {
    groupFindFirst.mockResolvedValue(null)
    const response = await GET(request('student-1', 'unrelated-group'))
    expect(response.status).toBe(404)
    expect(assessmentFindMany).not.toHaveBeenCalled()
    expect(groupFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'unrelated-group',
        division: 'JUNIOR',
        enrollments: { some: { studentId: 'student-1', deletedAt: null } },
      }),
    }))
  })

  it('allows historical enrollment for a linked parent and then reads that group trend', async () => {
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(mocks.assertCanAccessStudent).toHaveBeenCalledWith(expect.objectContaining({ id: 'parent-1', role: 'parent' }), 'student-1')
    expect(assessmentFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { groupId: 'group-1' } }))
  })

  it('requires the teacher to teach the same group as the enrolled student', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'teacher-user', role: 'teacher', teacherId: 'teacher-1', division: 'JUNIOR' })
    groupFindFirst.mockResolvedValue(null)
    const response = await GET(request())
    expect(response.status).toBe(404)
    expect(groupFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        enrollments: { some: { studentId: 'student-1', deletedAt: null } },
        OR: [
          { teacherId: 'teacher-1' },
          { teacherAssignments: { some: { teacherId: 'teacher-1' } } },
        ],
      }),
    }))
    expect(assessmentFindMany).not.toHaveBeenCalled()
  })
})
