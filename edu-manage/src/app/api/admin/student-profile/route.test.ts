import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  getRequestPrisma: vi.fn(),
  getStudentProfile: vi.fn(),
  studentFindFirst: vi.fn(),
  studentFindMany: vi.fn(),
  stageSummaryFindMany: vi.fn(),
}))

vi.mock('@/lib/get-user', () => ({ requireRole: mocks.requireRole }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/student-profile', () => ({ getStudentProfile: mocks.getStudentProfile }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

describe('admin student profile identity aggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireRole.mockResolvedValue({ division: 'JUNIOR' })
    mocks.getStudentProfile.mockResolvedValue({ overview: {}, record: {}, study: {} })
    mocks.studentFindFirst.mockResolvedValue({
      id: 'student-current',
      identityId: 'identity-a',
      division: 'JUNIOR',
      name: '学生甲',
      grade: '初二',
      school: '一中',
      gender: 'FEMALE',
      status: 'ACTIVE',
      parentName: '家长甲',
      mainTeacher: { name: '教师甲' },
      enrollments: [],
    })
    mocks.studentFindMany.mockResolvedValue([
      { id: 'student-current' },
      { id: 'student-old-term' },
    ])
    mocks.stageSummaryFindMany.mockResolvedValue([])
    mocks.getRequestPrisma.mockResolvedValue({
      student: {
        findFirst: mocks.studentFindFirst,
        findMany: mocks.studentFindMany,
      },
      stageSummary: { findMany: mocks.stageSummaryFindMany },
    })
  })

  it('uses linked records for profile and published summaries within the same division', async () => {
    const response = await GET(new NextRequest(
      'http://localhost/api/admin/student-profile?studentId=student-current&months=12',
    ))

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.recordIds).toEqual(['student-current', 'student-old-term'])
    expect(payload.student).not.toHaveProperty('identityId')
    expect(mocks.studentFindMany).toHaveBeenCalledWith({
      where: { identityId: 'identity-a', division: 'JUNIOR', deletedAt: null },
      select: { id: true },
    })
    expect(mocks.studentFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'student-current', division: 'JUNIOR', deletedAt: null },
    }))
    expect(mocks.getStudentProfile).toHaveBeenCalledWith(
      expect.anything(),
      'student-current',
      expect.objectContaining({ from: expect.any(Date), to: expect.any(Date) }),
      ['student-current', 'student-old-term'],
      { includeReport: true, includeImages: false },
    )
    expect(mocks.stageSummaryFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        studentId: { in: ['student-current', 'student-old-term'] },
        status: 'PUBLISHED',
      }),
    }))
  })

  it('does not return a student outside the admin division', async () => {
    mocks.studentFindFirst.mockResolvedValue(null)
    const response = await GET(new NextRequest(
      'http://localhost/api/admin/student-profile?studentId=student-other',
    ))

    expect(response.status).toBe(404)
    expect(mocks.studentFindMany).not.toHaveBeenCalled()
    expect(mocks.getStudentProfile).not.toHaveBeenCalled()
  })
})
