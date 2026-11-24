import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getRequestPrisma: vi.fn(),
  getRequestDivision: vi.fn(),
  resolveAdminTermScope: vi.fn(),
  calculateApprovedIntensiveHours: vi.fn(() => 0),
  calculateTaughtHours: vi.fn(() => 0),
}))

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/division', () => ({ getRequestDivision: mocks.getRequestDivision }))
vi.mock('@/lib/admin-term-scope', () => ({ resolveAdminTermScope: mocks.resolveAdminTermScope }))
vi.mock('@/lib/student-taught-hours', () => ({
  calculateApprovedIntensiveHours: mocks.calculateApprovedIntensiveHours,
  calculateTaughtHours: mocks.calculateTaughtHours,
}))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

describe('students list batch scope', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'admin-1', role: 'admin', division: 'JUNIOR' } })
    mocks.getRequestDivision.mockReturnValue('JUNIOR')
    mocks.resolveAdminTermScope.mockResolvedValue({
      id: 'term-current',
      name: '当前批次',
      code: 'TERM-CURRENT',
      status: 'ACTIVE',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T00:00:00.000Z'),
    })
  })

  it('filters grade, course enrollments, hours, fees and intensive attendance by selected term', async () => {
    const studentFindMany = vi.fn().mockResolvedValue([{
      id: 'student-1',
      name: '测试学生',
      grade: '初二',
      termMemberships: [{ grade: '初一' }],
      status: 'ACTIVE',
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
      mainTeacher: null,
      enrollments: [{
        id: 'enrollment-1',
        status: 'ACTIVE',
        remainHours: 4,
        totalHours: 10,
        usedHours: 6,
        group: { id: 'group-current', name: '初一英语班', status: 'ACTIVE', course: { id: 'course-1', name: '英语', type: 'GROUP', isActive: true } },
      }],
      fees: [],
      studyHallClasses: [],
    }])
    const studentCount = vi.fn().mockResolvedValue(1)
    const attendanceFindMany = vi.fn().mockResolvedValue([])
    const prisma = {
      student: { findMany: studentFindMany, count: studentCount },
      enrollment: { groupBy: vi.fn() },
      studentTermMembership: { groupBy: vi.fn() },
      attendance: { findMany: attendanceFindMany },
      studyHallHomeworkEntry: { findMany: vi.fn().mockResolvedValue([]) },
    }
    mocks.getRequestPrisma.mockResolvedValue(prisma)

    const response = await GET(new NextRequest('http://localhost/api/students?grade=%E5%88%9D%E4%B8%80&courseType=GROUP'))
    const payload = await response.json()
    const args = studentFindMany.mock.calls[0][0]

    expect(response.status).toBe(200)
    expect(args.where.termMemberships).toEqual({ some: { termId: 'term-current', grade: '初一' } })
    expect(args.where.enrollments.some.group.termId).toBe('term-current')
    expect(args.include.termMemberships.where).toEqual({ termId: 'term-current' })
    expect(args.include.enrollments.where.group.termId).toBe('term-current')
    expect(args.include.fees.where.termId).toBe('term-current')
    expect(attendanceFindMany.mock.calls[0][0].where.lesson.group.termId).toBe('term-current')
    expect(payload.students[0]).toMatchObject({ id: 'student-1', grade: '初一', remainHours: 4, totalHours: 10 })
    expect(payload.students[0].termMemberships).toBeUndefined()
  })

  it('uses membership grade for grade counts instead of the global student grade', async () => {
    const studentFindMany = vi.fn().mockResolvedValue([])
    const membershipGroupBy = vi.fn().mockResolvedValue([{ grade: '初一', _count: { _all: 3 } }])
    const prisma = {
      student: { findMany: studentFindMany, count: vi.fn().mockResolvedValue(0) },
      studentTermMembership: { groupBy: membershipGroupBy },
    }
    mocks.getRequestPrisma.mockResolvedValue(prisma)

    const response = await GET(new NextRequest('http://localhost/api/students?groupByGrade=true'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(membershipGroupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ termId: 'term-current', status: { not: 'WITHDRAWN' } }),
    }))
    expect(payload.gradeCounts).toEqual({ 初一: 3 })
  })
})
