import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { localDateColumnValue, todayLocal } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  resolveAdminTermScope: vi.fn(),
}))

vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/division', () => ({ getRequestDivision: (_user: unknown, requested: string | null) => requested || 'JUNIOR' }))
vi.mock('@/lib/business-visibility', () => ({ visibleClassGroupWhere: {}, visibleStudentWhere: { deletedAt: null } }))
vi.mock('@/lib/admin-term-scope', () => ({ resolveAdminTermScope: mocks.resolveAdminTermScope }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET } from './route'

function lesson() {
  return {
    id: 'lesson-1',
    lessonDate: localDateColumnValue(todayLocal()),
    startTime: '09:00',
    endTime: '10:00',
    subject: '数学',
    attendanceSubmittedAt: null,
    teacher: { name: '教师甲', avatar: null },
    group: {
      name: '周末班',
      course: { name: '周末班', subject: '数学' },
      room: null,
      teacher: { name: '教师甲', avatar: null },
      enrollments: [
        { studentId: 'student-english', subjects: ['英语'] },
        { studentId: 'student-math', subjects: ['数学'] },
      ],
    },
    lessonStudents: [
      { student: { id: 'student-english', name: '英语学员', membershipLevel: 'NORMAL' } },
      { student: { id: 'student-math', name: '数学学员', membershipLevel: 'NORMAL' } },
    ],
    attendances: [],
    classroomFeedbacks: [],
  }
}

describe('GET /api/dashboard/closed-loop roster', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
    mocks.resolveAdminTermScope.mockResolvedValue({ id: 'term-1' })
  })

  it('only lists students enrolled in the lesson subject as feedback targets', async () => {
    mocks.getRequestPrisma.mockResolvedValue({
      classLesson: { findMany: vi.fn().mockResolvedValue([lesson()]) },
      parentMessage: { findMany: vi.fn().mockResolvedValue([]) },
    })

    const response = await GET(new NextRequest('http://localhost/api/dashboard/closed-loop?section=attendance'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.lessons[0].students.map((student: { id: string }) => student.id)).toEqual(['student-math'])
    expect(payload.lessons[0].missingFeedbackStudents).toEqual(['数学学员'])
  })
})
