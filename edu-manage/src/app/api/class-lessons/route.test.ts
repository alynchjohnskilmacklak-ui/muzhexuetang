import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { localDateColumnValue, todayLocal } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getRequestPrisma: vi.fn(), getActiveAcademicTerm: vi.fn() }))
vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/academic-term', () => ({ getActiveAcademicTerm: mocks.getActiveAcademicTerm }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

function lesson(id: string, subject: string) {
  const assignment = { teacherId: 'teacher-1', subject }
  return {
    id,
    subject,
    lessonDate: localDateColumnValue(todayLocal()),
    startTime: '09:00',
    endTime: '10:00',
    status: 'SCHEDULED',
    isManual: false,
    teacherId: 'teacher-1',
    teacherAssignments: [assignment],
    lessonStudents: [{ studentId: 'student-1', student: { id: 'student-1', name: '学员甲' } }],
    group: {
      id: 'group-1',
      teacherId: 'teacher-1',
      intensiveMode: null,
      course: { id: 'course-1', name: '周末班', subject, grade: '初二', type: 'GROUP', color: null },
      teacherAssignments: [assignment],
      enrollments: [{ id: 'enrollment-1', studentId: 'student-1', subjects: ['数学'] }],
    },
  }
}

describe('GET /api/class-lessons parent roster visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'parent-1', role: 'parent', division: 'JUNIOR' })
    mocks.getActiveAcademicTerm.mockResolvedValue({ id: 'term-1' })
  })

  it('returns only lessons for subjects the child is enrolled in and excludes postponed lessons', async () => {
    const findMany = vi.fn().mockResolvedValue([
      lesson('math-lesson', '数学'),
      lesson('english-lesson', '英语'),
    ])
    mocks.getRequestPrisma.mockResolvedValue({
      student: { findMany: vi.fn().mockResolvedValue([{ id: 'student-1' }]) },
      classLesson: { findMany },
    })

    const response = await GET(new NextRequest('http://localhost/api/class-lessons'))
    const payload = await response.json()
    const query = findMany.mock.calls[0][0]

    expect(response.status).toBe(200)
    expect(payload.map((row: { id: string }) => row.id)).toEqual(['math-lesson'])
    expect(query.where.status).toEqual({ notIn: ['CANCELLED', 'POSTPONED'] })
    expect(query.where.group.enrollments.some).toMatchObject({
      studentId: { in: ['student-1'] },
      status: 'ACTIVE',
      deletedAt: null,
    })
    expect(query.include.group.include.enrollments.select).toEqual({ id: true, studentId: true, subjects: true })
  })
})
