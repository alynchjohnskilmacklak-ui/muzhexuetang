import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { todayLocal } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({
  requireCurrentTeacher: vi.fn(),
  teacherLessonScopeWhere: vi.fn(),
  auth: vi.fn(),
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  isClassLessonInActiveTerm: vi.fn(),
  getActiveAcademicTerm: vi.fn(),
}))
vi.mock('@/lib/teacher-portal', () => ({
  requireCurrentTeacher: mocks.requireCurrentTeacher,
  teacherLessonScopeWhere: mocks.teacherLessonScopeWhere,
  TEACHER_LOG_ACTIONS: {},
  todayRange: vi.fn(() => ({ start: new Date(), end: new Date() })),
}))
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/admin-term-scope', () => ({ isClassLessonInActiveTerm: mocks.isClassLessonInActiveTerm }))
vi.mock('@/lib/academic-term', () => ({ getActiveAcademicTerm: mocks.getActiveAcademicTerm }))

import { GET, POST } from './route'

describe('teacher attendance route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-09T02:15:00.000Z'))
    mocks.getActiveAcademicTerm.mockResolvedValue({
      id: 'term-active',
      name: '当前批次',
      code: 'TERM-ACTIVE',
      kind: 'REGULAR',
      startDate: new Date('2026-09-01T00:00:00.000Z'),
      endDate: new Date('2026-12-31T00:00:00.000Z'),
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lists the selected teacher subject across the active term when requested', async () => {
    const lessonDate = new Date('2026-10-28T00:00:00.000Z')
    const lesson = {
      id: 'lesson-term-list',
      lessonDate,
      startTime: '10:00',
      endTime: '11:00',
      status: 'SCHEDULED',
      subject: '英语',
      attendanceSubmittedAt: null,
      hoursDeductedAt: null,
      attendances: [],
      lessonStudents: [{ studentId: 'student-a' }],
      group: {
        name: '初一英语班',
        lessonMinutes: 60,
        intensiveMode: 'NORMAL',
        course: { name: '英语课', type: 'GROUP', subject: '英语' },
        room: { name: '201教室' },
        teacherAssignments: [{ teacherId: 'teacher-1', subject: '英语' }],
        enrollments: [{ studentId: 'student-a', subjects: ['英语'] }],
      },
    }
    const prisma = { classLesson: { findMany: vi.fn().mockResolvedValue([lesson]) } }
    mocks.requireCurrentTeacher.mockResolvedValue({
      teacher: { id: 'teacher-1', name: '胡老师', division: 'JUNIOR' },
      prisma,
    })
    mocks.teacherLessonScopeWhere.mockResolvedValue({ teacherId: 'teacher-1' })

    const response = await GET(new NextRequest('http://localhost/api/teacher/attendance?scope=term'))
    const payload = await response.json()
    const query = prisma.classLesson.findMany.mock.calls[0][0]

    expect(response.status).toBe(200)
    expect(mocks.teacherLessonScopeWhere).toHaveBeenCalledWith(prisma, 'teacher-1', 'term-active')
    expect(query.where.lessonDate).toEqual({
      gte: new Date('2026-08-31T16:00:00.000Z'),
      lt: new Date('2026-12-31T16:00:00.000Z'),
    })
    expect(payload[0]).toMatchObject({
      id: 'lesson-term-list',
      subject: '英语',
      groupName: '初一英语班',
      status: 'SCHEDULED',
      intensiveMode: 'NORMAL',
      attendanceSubmitted: false,
    })
    expect(new Date(payload[0].lessonDate).toISOString()).toBe(lessonDate.toISOString())
  })

  it('does not write attendance or hours when another submission has claimed the lesson', async () => {
    const student = { id: 'student-1', deletedAt: null }
    const lesson = {
      id: 'lesson-claim-race',
      lessonDate: new Date(`${todayLocal()}T00:00:00.000Z`),
      startTime: '10:00',
      endTime: '11:00',
      status: 'SCHEDULED',
      subject: '数学',
      teacherId: 'teacher-1',
      attendanceSubmittedAt: null,
      hoursDeductedAt: null,
      settlementStatus: 'UNSETTLED',
      intensiveReviewStatus: 'NOT_REQUIRED',
      intensiveReviews: [],
      lessonStudents: [{ studentId: student.id }],
      group: {
        id: 'group-1',
        name: '初二数学班',
        lessonMinutes: 60,
        intensiveMode: 'NORMAL',
        teachingType: 'GROUP',
        teacherId: 'teacher-1',
        course: { name: '数学课', type: 'GROUP', subject: '数学' },
        term: { kind: 'WEEKEND' },
        teacher: { id: 'teacher-1', name: '胡老师' },
        teacherAssignments: [{ teacherId: 'teacher-1', subject: '数学' }],
        enrollments: [{ id: 'enrollment-1', studentId: student.id, subjects: ['数学'], student }],
      },
    }
    const claim = vi.fn().mockResolvedValue({ count: 0 })
    const attendanceUpsert = vi.fn()
    const tx = { classLesson: { updateMany: claim }, attendance: { upsert: attendanceUpsert } }
    const prisma = {
      classLesson: { findFirst: vi.fn().mockResolvedValue(lesson) },
      systemConfig: { findUnique: vi.fn().mockResolvedValue({ schedulePeriods: [] }) },
      attendance: { count: vi.fn().mockResolvedValue(0) },
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    }
    mocks.auth.mockResolvedValue({ user: { id: 'user-1', role: 'teacher' } })
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1', division: 'JUNIOR' })
    mocks.requireCurrentTeacher.mockResolvedValue({
      teacher: { id: 'teacher-1', name: '胡老师' },
      user: { id: 'user-1', division: 'JUNIOR' },
      prisma,
    })
    mocks.teacherLessonScopeWhere.mockResolvedValue({ teacherId: 'teacher-1' })

    const response = await POST(new NextRequest('http://localhost/api/teacher/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: lesson.id, records: [{ studentId: student.id, status: 'PRESENT' }] }),
    }))

    expect(response.status).toBe(409)
    expect((await response.json()).error).toContain('正在提交或已提交')
    expect(mocks.teacherLessonScopeWhere).toHaveBeenCalledWith(prisma, 'teacher-1', 'term-active')
    expect(claim).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ attendanceSubmittedAt: null, hoursDeductedAt: null }),
    }))
    expect(attendanceUpsert).not.toHaveBeenCalled()
  })

  it('rejects teacher backfill after the lesson has ended before loading billing data', async () => {
    const yesterday = new Date(`${todayLocal()}T00:00:00+08:00`)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const lesson = {
      id: 'lesson-ended-yesterday',
      lessonDate: yesterday,
      startTime: '09:00',
      endTime: '10:00',
      status: 'SCHEDULED',
      subject: '数学',
      attendanceSubmittedAt: null,
      hoursDeductedAt: null,
      settlementStatus: 'UNSETTLED',
      intensiveReviewStatus: 'NOT_REQUIRED',
      group: {
        id: 'group-1',
        name: '初二数学班',
        lessonMinutes: 60,
        intensiveMode: 'NORMAL',
        course: { name: '数学课', type: 'GROUP', subject: '数学' },
        term: { kind: 'WEEKEND' },
        teacherAssignments: [{ teacherId: 'teacher-1', subject: '数学' }],
        enrollments: [],
      },
      lessonStudents: [],
    }
    const systemConfigLookup = vi.fn()
    const prisma = {
      classLesson: { findFirst: vi.fn().mockResolvedValue(lesson) },
      systemConfig: { findUnique: systemConfigLookup },
      attendance: { count: vi.fn() },
    }
    mocks.auth.mockResolvedValue({ user: { id: 'user-1', role: 'teacher' } })
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1', division: 'JUNIOR' })
    mocks.requireCurrentTeacher.mockResolvedValue({
      teacher: { id: 'teacher-1', name: '胡老师' },
      user: { id: 'user-1', division: 'JUNIOR' },
      prisma,
    })
    mocks.teacherLessonScopeWhere.mockResolvedValue({ teacherId: 'teacher-1' })

    const response = await POST(new NextRequest('http://localhost/api/teacher/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: lesson.id, records: [{ studentId: 'student-1', status: 'PRESENT' }] }),
    }))

    expect(response.status).toBe(409)
    expect((await response.json()).error).toContain('不能补录已结束课程')
    expect(systemConfigLookup).not.toHaveBeenCalled()
    expect(prisma.attendance.count).not.toHaveBeenCalled()
  })

  it('keeps a historical snapshot student visible after the enrollment is inactive', async () => {
    mocks.teacherLessonScopeWhere.mockResolvedValue({ teacherId: 'teacher-1' })
    const formerStudent = {
      id: 'student-former',
      name: '历史学员',
      gender: '未知',
      grade: '初二',
      membershipLevel: 'NORMAL',
      status: 'ACTIVE',
      deletedAt: null,
    }
    const lesson = {
      id: 'lesson-past',
      lessonDate: new Date('2026-10-28T00:00:00.000Z'),
      startTime: '10:00',
      endTime: '11:00',
      status: 'COMPLETED',
      subject: '数学',
      teacherId: 'teacher-1',
      attendanceSubmittedAt: new Date('2026-10-28T03:00:00.000Z'),
      hoursDeductedAt: new Date('2026-10-28T03:00:00.000Z'),
      settlementStatus: 'SETTLED',
      intensiveReviewStatus: 'NOT_REQUIRED',
      intensiveReviews: [],
      attendances: [{ studentId: 'student-former', status: 'PRESENT' }],
      lessonStudents: [{ studentId: 'student-former', student: formerStudent }],
      group: {
        name: '初二数学班',
        lessonMinutes: 60,
        intensiveMode: 'NORMAL',
        teachingType: 'GROUP',
        teacherId: 'teacher-1',
        course: { name: '数学课', type: 'GROUP', subject: '数学' },
        room: { name: '201教室' },
        teacher: { id: 'teacher-1', name: '胡老师' },
        teacherAssignments: [{ teacherId: 'teacher-1', subject: '数学', teacher: { id: 'teacher-1', name: '胡老师', subjects: ['数学'] } }],
        enrollments: [],
      },
    }
    const prisma = {
      classLesson: {
        findFirst: vi.fn().mockResolvedValue(lesson),
        findMany: vi.fn().mockResolvedValue([]),
      },
      systemConfig: { findUnique: vi.fn().mockResolvedValue({ schedulePeriods: [] }) },
      studentMealAttendance: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null) },
      leaveRequest: { findMany: vi.fn().mockResolvedValue([]) },
    }
    mocks.requireCurrentTeacher.mockResolvedValue({ teacher: { id: 'teacher-1', name: '胡老师' }, prisma })

    const response = await GET(new NextRequest('http://localhost/api/teacher/attendance?lessonId=lesson-past'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.students).toHaveLength(1)
    expect(payload.students[0]).toMatchObject({
      studentId: 'student-former',
      enrollmentId: null,
      name: '历史学员',
      remainHours: 0,
      status: 'PRESENT',
    })
  })

  it('only returns active students enrolled in the lesson subject', async () => {
    mocks.teacherLessonScopeWhere.mockResolvedValue({ teacherId: 'teacher-1' })
    const mathStudent = {
      id: 'student-math',
      name: '数学学员',
      gender: '未知',
      grade: '初二',
      membershipLevel: 'NORMAL',
      status: 'ACTIVE',
      deletedAt: null,
    }
    const englishStudent = {
      ...mathStudent,
      id: 'student-english',
      name: '英语学员',
    }
    const lesson = {
      id: 'lesson-math',
      lessonDate: new Date(`${todayLocal()}T00:00:00.000Z`),
      startTime: '10:00',
      endTime: '11:00',
      status: 'SCHEDULED',
      subject: '数学',
      teacherId: 'teacher-1',
      attendanceSubmittedAt: null,
      hoursDeductedAt: null,
      intensiveReviewStatus: 'NOT_REQUIRED',
      intensiveReviews: [],
      attendances: [],
      lessonStudents: [
        { studentId: mathStudent.id, student: mathStudent },
        { studentId: englishStudent.id, student: englishStudent },
      ],
      group: {
        name: '初二多科班',
        lessonMinutes: 60,
        intensiveMode: 'NORMAL',
        teachingType: 'GROUP',
        teacherId: 'teacher-1',
        course: { name: '综合课程', type: 'GROUP', subject: '数学' },
        room: { name: '201教室' },
        teacher: { id: 'teacher-1', name: '胡老师' },
        teacherAssignments: [{ teacherId: 'teacher-1', subject: '数学' }],
        enrollments: [
          { id: 'en-math', studentId: mathStudent.id, subjects: ['数学'], remainHours: 8, student: mathStudent },
          { id: 'en-english', studentId: englishStudent.id, subjects: ['英语'], remainHours: 6, student: englishStudent },
        ],
      },
    }
    const prisma = {
      classLesson: {
        findFirst: vi.fn().mockResolvedValue(lesson),
        findMany: vi.fn().mockResolvedValue([]),
      },
      systemConfig: { findUnique: vi.fn().mockResolvedValue({ schedulePeriods: [] }) },
      studentMealAttendance: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null) },
      leaveRequest: { findMany: vi.fn().mockResolvedValue([]) },
    }
    mocks.requireCurrentTeacher.mockResolvedValue({ teacher: { id: 'teacher-1', name: '胡老师' }, prisma })

    const response = await GET(new NextRequest('http://localhost/api/teacher/attendance?lessonId=lesson-math'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.students.map((student: { studentId: string }) => student.studentId)).toEqual(['student-math'])
  })

  it('defaults an unrecorded student with an active leave request to LEAVE', async () => {
    const lessonDate = new Date()
    const leaveStudent = {
      id: 'student-leave',
      name: '请假学员',
      gender: '未知',
      grade: '初二',
      membershipLevel: 'NORMAL',
      status: 'ACTIVE',
      deletedAt: null,
    }
    const presentStudent = {
      ...leaveStudent,
      id: 'student-present',
      name: '实际到课学员',
    }
    const lesson = {
      id: 'lesson-today',
      lessonDate,
      startTime: '10:00',
      endTime: '11:00',
      status: 'SCHEDULED',
      subject: '数学',
      teacherId: 'teacher-1',
      attendanceSubmittedAt: null,
      hoursDeductedAt: null,
      settlementStatus: 'UNSETTLED',
      intensiveReviewStatus: 'NOT_REQUIRED',
      intensiveReviews: [],
      attendances: [{ studentId: 'student-present', status: 'PRESENT' }],
      lessonStudents: [
        { studentId: 'student-leave', student: leaveStudent },
        { studentId: 'student-present', student: presentStudent },
      ],
      group: {
        name: '初二数学班',
        lessonMinutes: 60,
        intensiveMode: 'NORMAL',
        teachingType: 'GROUP',
        teacherId: 'teacher-1',
        course: { name: '数学课', type: 'GROUP', subject: '数学' },
        room: { name: '201教室' },
        teacher: { id: 'teacher-1', name: '胡老师' },
        teacherAssignments: [{ teacherId: 'teacher-1', subject: '数学', teacher: { id: 'teacher-1', name: '胡老师', subjects: ['数学'] } }],
        enrollments: [leaveStudent, presentStudent].map((student) => ({
          id: `enrollment-${student.id}`,
          studentId: student.id,
          subjects: ['数学'],
          student,
        })),
      },
    }
    const prisma = {
      classLesson: {
        findFirst: vi.fn().mockResolvedValue(lesson),
        findMany: vi.fn().mockResolvedValue([]),
      },
      systemConfig: { findUnique: vi.fn().mockResolvedValue({ schedulePeriods: [] }) },
      studentMealAttendance: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn().mockResolvedValue(null) },
      leaveRequest: {
        findMany: vi.fn().mockResolvedValue([
          { studentId: 'student-leave', lessonId: lesson.id, leaveDate: lessonDate, status: 'pending', deletedAt: null },
          { studentId: 'student-present', lessonId: lesson.id, leaveDate: lessonDate, status: 'approved', deletedAt: null },
        ]),
      },
    }
    mocks.requireCurrentTeacher.mockResolvedValue({ teacher: { id: 'teacher-1', name: '胡老师' }, prisma })

    const response = await GET(new NextRequest('http://localhost/api/teacher/attendance?lessonId=lesson-today'))
    const payload = await response.json()
    const statuses = Object.fromEntries(payload.students.map((student: { studentId: string; status: string }) => [student.studentId, student.status]))

    expect(response.status).toBe(200)
    expect(statuses).toEqual({ 'student-leave': 'LEAVE', 'student-present': 'PRESENT' })
  })

  it('rejects attendance submitted for a student not enrolled in the lesson subject', async () => {
    const lesson = {
      id: 'lesson-math',
      lessonDate: new Date(`${todayLocal()}T00:00:00.000Z`),
      startTime: '10:00',
      endTime: '11:00',
      status: 'SCHEDULED',
      subject: '数学',
      teacherId: 'teacher-1',
      attendanceSubmittedAt: null,
      hoursDeductedAt: null,
      settlementStatus: 'UNSETTLED',
      intensiveReviewStatus: 'NOT_REQUIRED',
      intensiveReviews: [],
      lessonStudents: [{ studentId: 'student-math' }, { studentId: 'student-english' }],
      group: {
        id: 'group-1',
        name: '初二多科班',
        lessonMinutes: 60,
        intensiveMode: 'NORMAL',
        teachingType: 'GROUP',
        teacherId: 'teacher-1',
        course: { name: '综合课程', type: 'GROUP', subject: '数学' },
        term: { kind: 'WEEKEND' },
        teacher: { id: 'teacher-1', name: '胡老师' },
        teacherAssignments: [{ teacherId: 'teacher-1', subject: '数学' }],
        enrollments: [
          { id: 'en-math', studentId: 'student-math', subjects: ['数学'] },
          { id: 'en-english', studentId: 'student-english', subjects: ['英语'] },
        ],
      },
    }
    const prisma = {
      classLesson: { findFirst: vi.fn().mockResolvedValue(lesson) },
      systemConfig: { findUnique: vi.fn().mockResolvedValue({ schedulePeriods: [] }) },
      attendance: { count: vi.fn().mockResolvedValue(0) },
      $transaction: vi.fn(),
    }
    mocks.auth.mockResolvedValue({ user: { id: 'user-1', role: 'teacher' } })
    mocks.getCurrentUser.mockResolvedValue({ id: 'user-1', division: 'JUNIOR' })
    mocks.requireCurrentTeacher.mockResolvedValue({
      teacher: { id: 'teacher-1', name: '胡老师' },
      user: { id: 'user-1', division: 'JUNIOR' },
      prisma,
    })
    mocks.teacherLessonScopeWhere.mockResolvedValue({ teacherId: 'teacher-1' })

    const response = await POST(new NextRequest('http://localhost/api/teacher/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonId: lesson.id,
        records: [{ studentId: 'student-english', status: 'PRESENT' }],
      }),
    }))

    expect(response.status).toBe(409)
    expect((await response.json()).error).toContain('报名名单已更新')
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('exposes the first-period meal report state to attendance clients', async () => {
    const student = {
      id: 'student-first-period',
      name: '首节学员',
      gender: '未知',
      grade: '初一',
      membershipLevel: 'NORMAL',
      status: 'ACTIVE',
      deletedAt: null,
    }
    const lessonDate = new Date('2026-11-09T00:00:00.000Z')
    const lesson = {
      id: 'lesson-first-period',
      lessonDate,
      startTime: '08:00',
      endTime: '08:40',
      status: 'COMPLETED',
      subject: '数学',
      teacherId: 'teacher-1',
      attendanceSubmittedAt: new Date('2026-11-09T00:40:00.000Z'),
      hoursDeductedAt: new Date('2026-11-09T00:40:00.000Z'),
      settlementStatus: 'UNSETTLED',
      intensiveReviewStatus: 'NOT_REQUIRED',
      intensiveReviews: [],
      attendances: [{ studentId: student.id, status: 'PRESENT' }],
      lessonStudents: [{ studentId: student.id, student }],
      group: {
        id: 'group-first',
        name: '初一数学班',
        lessonMinutes: 40,
        intensiveMode: 'NORMAL',
        teachingType: 'GROUP',
        teacherId: 'teacher-1',
        course: { name: '数学课', type: 'GROUP', subject: '数学' },
        room: { name: '201教室' },
        teacher: { id: 'teacher-1', name: '胡老师' },
        teacherAssignments: [{ teacherId: 'teacher-1', subject: '数学', teacher: { id: 'teacher-1', name: '胡老师', subjects: ['数学'] } }],
        enrollments: [{ id: 'enrollment-1', studentId: student.id, subjects: ['数学'], remainHours: 5, student }],
      },
    }
    const prisma = {
      classLesson: {
        findFirst: vi.fn().mockResolvedValue(lesson),
        findMany: vi.fn().mockResolvedValue([lesson]),
      },
      systemConfig: { findUnique: vi.fn().mockResolvedValue({ schedulePeriods: null }) },
      studentMealAttendance: {
        findMany: vi.fn().mockResolvedValue([{ studentId: student.id, eating: true }]),
        findFirst: vi.fn().mockResolvedValue({ id: 'first-meal-row' }),
      },
      leaveRequest: { findMany: vi.fn().mockResolvedValue([]) },
    }
    mocks.teacherLessonScopeWhere.mockResolvedValue({ teacherId: 'teacher-1' })
    mocks.requireCurrentTeacher.mockResolvedValue({
      teacher: { id: 'teacher-1', name: '胡老师', division: 'JUNIOR' },
      prisma,
    })

    const response = await GET(new NextRequest('http://localhost/api/teacher/attendance?lessonId=lesson-first-period'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.lesson).toMatchObject({
      isSystemFirstPeriod: true,
      hasFirstPeriodMealSubmission: true,
    })
  })
})
