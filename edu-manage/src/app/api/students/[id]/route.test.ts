import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  resolveAdminTermScope: vi.fn(),
  resolveTeacherForUser: vi.fn(),
  calculateApprovedIntensiveHours: vi.fn(() => 0),
  calculateTaughtHours: vi.fn(() => 0),
}))

vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/admin-term-scope', () => ({ resolveAdminTermScope: mocks.resolveAdminTermScope }))
vi.mock('@/lib/performance', () => ({ resolveTeacherForUser: mocks.resolveTeacherForUser }))
vi.mock('@/lib/student-taught-hours', () => ({
  calculateApprovedIntensiveHours: mocks.calculateApprovedIntensiveHours,
  calculateTaughtHours: mocks.calculateTaughtHours,
}))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

describe('student detail batch scope', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
    mocks.resolveAdminTermScope.mockResolvedValue({ id: 'term-current', name: '当前批次' })
  })

  it('returns enrollment, attendance, fee and grade data from the selected term only', async () => {
    const studentFindFirst = vi.fn().mockResolvedValue({
      id: 'student-1',
      division: 'JUNIOR',
      name: '测试学生',
      grade: '初二',
      termMemberships: [{ grade: '初一' }],
      status: 'ACTIVE',
      enrollments: [],
      attendances: [],
      fees: [],
      parentUserId: null,
      parentId: null,
    })
    const attendanceFindMany = vi.fn().mockResolvedValue([])
    const prisma = {
      student: {
        findUnique: vi.fn().mockResolvedValue({ id: 'student-1', division: 'JUNIOR' }),
        findFirst: studentFindFirst,
      },
      attendance: { findMany: attendanceFindMany },
    }
    mocks.getRequestPrisma.mockResolvedValue(prisma)

    const response = await GET(
      new NextRequest('http://localhost/api/students/student-1'),
      { params: Promise.resolve({ id: 'student-1' }) },
    )
    const payload = await response.json()
    const args = studentFindFirst.mock.calls[0][0]

    expect(response.status).toBe(200)
    expect(args.where.termMemberships).toEqual({ some: { termId: 'term-current' } })
    expect(args.include.enrollments.where.group.termId).toBe('term-current')
    expect(args.include.attendances.where.OR).toEqual([
      { lesson: { group: { termId: 'term-current' } } },
      { lessonId: null, enrollment: { group: { termId: 'term-current' } } },
    ])
    expect(args.include.fees.where).toEqual({ termId: 'term-current' })
    expect(attendanceFindMany.mock.calls[0][0].where.lesson.group.termId).toBe('term-current')
    expect(payload.grade).toBe('初一')
  })

  it('calculates family balances from the selected batch instead of the lifetime student snapshot', async () => {
    const studentFindFirst = vi.fn().mockResolvedValue({
      id: 'student-1',
      division: 'JUNIOR',
      name: '当前学生',
      grade: '初二',
      termMemberships: [{ grade: '初一' }],
      status: 'ACTIVE',
      enrollments: [],
      attendances: [],
      fees: [],
      parentUserId: 'parent-1',
      parentId: null,
    })
    const familyRows = [
      { id: 'student-1', name: '当前学生', grade: '初二', status: 'ACTIVE', totalHours: 99, remainHours: 88, termMemberships: [{ grade: '初一' }], enrollments: [] },
      { id: 'student-2', name: '家庭成员', grade: '初三', status: 'ACTIVE', totalHours: 77, remainHours: 66, termMemberships: [{ grade: '初二' }], enrollments: [] },
    ]
    const familyFindMany = vi.fn().mockResolvedValue(familyRows)
    const groupBy = vi.fn().mockResolvedValue([
      { studentId: 'student-1', _sum: { totalHours: 10, remainHours: 3.5 } },
    ])
    const prisma = {
      student: {
        findUnique: vi.fn().mockResolvedValue({ id: 'student-1', division: 'JUNIOR' }),
        findFirst: studentFindFirst,
        findMany: familyFindMany,
      },
      enrollment: { groupBy },
      attendance: { findMany: vi.fn().mockResolvedValue([]) },
    }
    mocks.getRequestPrisma.mockResolvedValue(prisma)

    const response = await GET(
      new NextRequest('http://localhost/api/students/student-1'),
      { params: Promise.resolve({ id: 'student-1' }) },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(groupBy).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        studentId: { in: ['student-1', 'student-2'] },
        group: expect.objectContaining({ termId: 'term-current' }),
      }),
    }))
    expect(payload.family.map((row: { remainHours: number; totalHours: number }) => [row.totalHours, row.remainHours]))
      .toEqual([[10, 3.5], [0, 0]])
  })
})
