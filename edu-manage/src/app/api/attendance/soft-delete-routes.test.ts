import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  getRequestDivision: vi.fn(),
  resolveAdminTermScope: vi.fn(),
  getActiveAcademicTerm: vi.fn(),
  resolveTeacherForUser: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/division', () => ({ getRequestDivision: mocks.getRequestDivision }))
vi.mock('@/lib/admin-term-scope', () => ({ resolveAdminTermScope: mocks.resolveAdminTermScope }))
vi.mock('@/lib/academic-term', () => ({ getActiveAcademicTerm: mocks.getActiveAcademicTerm }))
vi.mock('@/lib/performance', () => ({ resolveTeacherForUser: mocks.resolveTeacherForUser }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))

import { GET as getAttendanceList } from './route'
import { GET as getAttendanceDetail } from './[lessonId]/route'
import { GET as getAttendanceHistory } from './history/route'

const removedAttendance = {
  id: 'attendance-deleted',
  lessonId: 'lesson-a',
  studentId: 'student-a',
  status: 'PRESENT',
  deletedAt: new Date('2026-10-29T10:00:00.000Z'),
}

function lessonFixture() {
  return {
    id: 'lesson-a',
    lessonDate: new Date('2026-10-30T00:00:00.000Z'),
    startTime: '09:00',
    endTime: '10:00',
    status: 'SCHEDULED',
    subject: '数学',
    teacherId: 'teacher-a',
    teacher: { id: 'teacher-a', name: '教师甲' },
    group: {
      id: 'group-a',
      name: '测试班级',
      teacherId: 'teacher-a',
      roomId: 'room-a',
      course: { id: 'course-a', name: '测试课程', subject: '数学', type: 'GROUP', color: null },
      teacher: { id: 'teacher-a', name: '教师甲' },
      room: { id: 'room-a', name: '测试教室', type: 'CLASSROOM', usageType: 'TEACHING' },
      teacherAssignments: [],
      enrollments: [{ studentId: 'student-a', subjects: ['数学'], student: { id: 'student-a', name: '测试学员' } }],
    },
    lessonStudents: [{ studentId: 'student-a', student: { id: 'student-a', name: '测试学员' } }],
    attendances: [removedAttendance],
  }
}

describe('attendance read routes exclude soft-deleted records', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'admin-a', role: 'admin', division: 'JUNIOR' } })
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-a', role: 'admin', division: 'JUNIOR' })
    mocks.getRequestDivision.mockReturnValue('JUNIOR')
    mocks.resolveAdminTermScope.mockResolvedValue({ id: 'term-a' })
  })

  it('queries the selected Shanghai calendar day with an exclusive next-day boundary', async () => {
    const lesson = lessonFixture()
    const db = {
      classLesson: {
        findMany: vi.fn(async () => [lesson]),
      },
    }
    mocks.getRequestPrisma.mockResolvedValue(db)

    await getAttendanceList(new NextRequest('http://localhost/api/attendance?date=2026-10-30&division=JUNIOR'))

    expect(db.classLesson.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        lessonDate: {
          gte: new Date('2026-10-30T00:00:00.000Z'),
          lt: new Date('2026-10-31T00:00:00.000Z'),
        },
      }),
    }))
  })

  it('rejects impossible calendar dates instead of querying an adjacent day', async () => {
    const db = { classLesson: { findMany: vi.fn() } }
    mocks.getRequestPrisma.mockResolvedValue(db)

    const response = await getAttendanceList(new NextRequest('http://localhost/api/attendance?date=2026-02-31&division=JUNIOR'))

    expect(response.status).toBe(400)
    expect(db.classLesson.findMany).not.toHaveBeenCalled()
  })

  it('does not count a deleted attendance as completed in the daily list', async () => {
    const lesson = lessonFixture()
    const db = {
      classLesson: {
        findMany: vi.fn(async (args: { include?: { attendances?: { where?: { deletedAt?: null } } } }) => {
          const excludesDeleted = args.include?.attendances?.where?.deletedAt === null
          return [{ ...lesson, attendances: excludesDeleted ? [] : lesson.attendances }]
        }),
      },
    }
    mocks.getRequestPrisma.mockResolvedValue(db)

    const response = await getAttendanceList(new NextRequest('http://localhost/api/attendance?date=2026-10-30&division=JUNIOR'))
    const [row] = await response.json()

    expect(db.classLesson.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({ attendances: { where: { deletedAt: null }, select: { id: true, studentId: true, status: true } } }),
    }))
    expect(row.attendances).toEqual([])
    expect(row.attendanceStatus).toBe('pending')
  })

  it('does not return soft-deleted rows from lesson attendance details', async () => {
    const db = {
      attendance: {
        findMany: vi.fn(async (args: { where?: { deletedAt?: null } }) =>
          args.where?.deletedAt === null ? [] : [removedAttendance]),
      },
    }
    mocks.getRequestPrisma.mockResolvedValue(db)

    const response = await getAttendanceDetail(
      new NextRequest('http://localhost/api/attendance/lesson-a?division=JUNIOR'),
      { params: Promise.resolve({ lessonId: 'lesson-a' }) },
    )

    expect(db.attendance.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ lessonId: 'lesson-a', deletedAt: null }),
    }))
    expect(await response.json()).toEqual([])
  })

  it('omits soft-deleted rows from attendance history totals', async () => {
    const db = {
      classLesson: {
        findMany: vi.fn(async (args: { include?: { attendances?: { where?: { deletedAt?: null } } } }) => {
          const excludesDeleted = args.include?.attendances?.where?.deletedAt === null
          return [{
            id: 'lesson-a',
            lessonDate: new Date('2026-10-30T00:00:00.000Z'),
            startTime: '09:00',
            group: { id: 'group-a', name: '测试班级', course: { subject: '数学' } },
            status: 'COMPLETED',
            attendances: excludesDeleted ? [] : [removedAttendance],
          }]
        }),
      },
    }
    mocks.getRequestPrisma.mockResolvedValue(db)

    const response = await getAttendanceHistory(new NextRequest('http://localhost/api/attendance/history?division=JUNIOR'))
    const [row] = await response.json()

    expect(db.classLesson.findMany).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.objectContaining({
        attendances: { where: { deletedAt: null, student: expect.any(Object) }, include: { student: { select: { id: true, name: true } } } },
      }),
    }))
    expect(row).toMatchObject({ present: 0, leave: 0, absent: 0, total: 0, records: [] })
  })
})
