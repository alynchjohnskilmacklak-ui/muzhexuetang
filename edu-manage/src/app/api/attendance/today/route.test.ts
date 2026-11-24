import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getLocalDayRange, todayLocal } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  getRequestDivision: vi.fn(),
  resolveAdminTermScope: vi.fn(),
  getActiveAcademicTerm: vi.fn(),
}))
vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/division', () => ({ getRequestDivision: mocks.getRequestDivision }))
vi.mock('@/lib/admin-term-scope', () => ({ resolveAdminTermScope: mocks.resolveAdminTermScope }))
vi.mock('@/lib/academic-term', () => ({ getActiveAcademicTerm: mocks.getActiveAcademicTerm }))

import { GET } from './route'

describe('GET /api/attendance/today scope', () => {
  it('preserves visible class constraints and resolves subject from the selected teacher assignment', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
    mocks.getRequestDivision.mockReturnValue('JUNIOR')
    mocks.resolveAdminTermScope.mockResolvedValue({ id: 'term-1' })
    const tomorrow = new Date(`${todayLocal()}T00:00:00.000Z`)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    const lessonDate = getLocalDayRange(tomorrow.toISOString().slice(0, 10)).start
    const lesson = {
      id: 'lesson-1',
      lessonDate,
      startTime: '09:00',
      endTime: '10:00',
      status: 'SCHEDULED',
      teacherId: null,
      teacher: null,
      attendances: [],
      lessonStudents: [{ studentId: 'student-math' }, { studentId: 'student-english' }],
      group: {
        id: 'group-1',
        name: '多科班',
        intensiveMode: 'NORMAL',
        teachingType: 'GROUP',
        course: { id: 'course-1', name: '综合课程', subject: '数学', type: 'GROUP', color: null },
        teacher: { id: 'teacher-1', name: '主讲老师' },
        teacherAssignments: [{ teacherId: 'teacher-2', subject: '英语', teacher: { id: 'teacher-2', name: '英语老师' } }],
        room: null,
        enrollments: [
          { id: 'en-math', studentId: 'student-math', status: 'ACTIVE', deletedAt: null, subjects: ['数学'], remainHours: 2, student: { id: 'student-math', name: '数学学员', status: 'ACTIVE' } },
          { id: 'en-english', studentId: 'student-english', status: 'ACTIVE', deletedAt: null, subjects: ['英语'], remainHours: 3, student: { id: 'student-english', name: '英语学员', status: 'ACTIVE' } },
        ],
      },
    }
    const db = {
      classLesson: { findMany: vi.fn().mockResolvedValue([lesson]) },
      studentMealAttendance: { findMany: vi.fn().mockResolvedValue([]) },
      leaveRequest: { findMany: vi.fn().mockResolvedValue([]) },
    }
    mocks.getRequestPrisma.mockResolvedValue(db)

    const response = await GET(new NextRequest(`http://localhost/api/attendance/today?teacherId=teacher-2&date=${todayLocal()}`))
    const payload = await response.json()
    const query = db.classLesson.findMany.mock.calls[0][0]

    expect(response.status).toBe(200)
    expect(query.where.group).toMatchObject({
      termId: 'term-1',
      status: { not: 'ARCHIVED' },
      deletedAt: null,
    })
    expect(query.where.group.course).toBeDefined()
    expect(payload[0].group.subject).toBe('英语')
    expect(payload[0].group.teacherId).toBe('teacher-2')
    expect(payload[0].students.map((student: { studentId: string }) => student.studentId)).toEqual(['student-english'])
  })

  it('defaults an unrecorded roster student with an active leave request to leave', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
    mocks.getRequestDivision.mockReturnValue('JUNIOR')
    mocks.resolveAdminTermScope.mockResolvedValue({ id: 'term-1' })
    const date = todayLocal()
    const lessonDate = getLocalDayRange(date).start
    const lesson = {
      id: 'lesson-leave',
      lessonDate,
      startTime: '09:00',
      endTime: '10:00',
      status: 'SCHEDULED',
      teacherId: 'teacher-1',
      teacher: { id: 'teacher-1', name: '数学老师' },
      attendances: [],
      lessonStudents: [{ studentId: 'student-leave' }],
      group: {
        id: 'group-1',
        name: '初二数学班',
        intensiveMode: 'NORMAL',
        teachingType: 'GROUP',
        course: { id: 'course-1', name: '数学', subject: '数学', type: 'GROUP', color: null },
        teacher: { id: 'teacher-1', name: '数学老师' },
        teacherAssignments: [],
        room: null,
        enrollments: [{
          id: 'enrollment-1',
          studentId: 'student-leave',
          status: 'ACTIVE',
          deletedAt: null,
          subjects: ['数学'],
          remainHours: 8,
          student: { id: 'student-leave', name: '请假学员', status: 'ACTIVE' },
        }],
      },
    }
    const db = {
      classLesson: { findMany: vi.fn().mockResolvedValue([lesson]) },
      studentMealAttendance: { findMany: vi.fn().mockResolvedValue([]) },
      leaveRequest: {
        findMany: vi.fn().mockResolvedValue([{
          studentId: 'student-leave',
          lessonId: lesson.id,
          leaveDate: lessonDate,
          status: 'pending',
          deletedAt: null,
        }]),
      },
    }
    mocks.getRequestPrisma.mockResolvedValue(db)

    const response = await GET(new NextRequest(`http://localhost/api/attendance/today?date=${date}&division=JUNIOR`))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload[0].students).toMatchObject([{ studentId: 'student-leave', status: 'LEAVE' }])
  })

  it('keeps historical snapshot students and attendance visible after their enrollment becomes inactive', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
    mocks.getRequestDivision.mockReturnValue('JUNIOR')
    mocks.resolveAdminTermScope.mockResolvedValue({ id: 'term-1' })
    const previousDay = new Date(`${todayLocal()}T00:00:00.000Z`)
    previousDay.setUTCDate(previousDay.getUTCDate() - 1)
    const date = previousDay.toISOString().slice(0, 10)
    const lessonDate = getLocalDayRange(date).start
    const formerStudent = {
      id: 'student-former',
      name: '历史学员',
      phone: null,
      status: 'INACTIVE',
      deletedAt: null,
    }
    const lesson = {
      id: 'lesson-past',
      lessonDate,
      startTime: '09:00',
      endTime: '10:00',
      status: 'COMPLETED',
      teacherId: 'teacher-1',
      teacher: { id: 'teacher-1', name: '数学老师' },
      attendances: [{ studentId: 'student-former', status: 'PRESENT' }],
      lessonStudents: [{ studentId: 'student-former', student: formerStudent }],
      group: {
        id: 'group-1',
        name: '初二数学班',
        intensiveMode: 'NORMAL',
        teachingType: 'GROUP',
        course: { id: 'course-1', name: '数学', subject: '数学', type: 'GROUP', color: null },
        teacher: { id: 'teacher-1', name: '数学老师' },
        teacherAssignments: [],
        room: null,
        enrollments: [],
      },
    }
    const db = {
      classLesson: { findMany: vi.fn().mockResolvedValue([lesson]) },
      studentMealAttendance: { findMany: vi.fn().mockResolvedValue([]) },
      leaveRequest: { findMany: vi.fn().mockResolvedValue([]) },
    }
    mocks.getRequestPrisma.mockResolvedValue(db)

    const response = await GET(new NextRequest(`http://localhost/api/attendance/today?date=${date}&division=JUNIOR`))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload[0].students).toMatchObject([{
      studentId: 'student-former',
      studentName: '历史学员',
      enrollmentId: null,
      remainHours: 0,
      status: 'PRESENT',
    }])
    expect(payload[0].attendanceCount).toBe(1)
    expect(payload[0].totalStudents).toBe(1)
  })
})
