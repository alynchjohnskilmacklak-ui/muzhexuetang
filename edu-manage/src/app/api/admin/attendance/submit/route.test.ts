import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getLocalDayRange, todayLocal } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({ getCurrentUser: vi.fn(), getRequestPrisma: vi.fn(), isClassLessonInActiveTerm: vi.fn() }))
vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/admin-term-scope', () => ({ isClassLessonInActiveTerm: mocks.isClassLessonInActiveTerm }))

import { POST } from './route'

describe('POST /api/admin/attendance/submit subject roster', () => {
  it('uses the selected assigned teacher subject instead of the class primary teacher subject', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
    mocks.isClassLessonInActiveTerm.mockResolvedValue(true)
    const lesson = {
      id: 'lesson-1',
      division: 'JUNIOR',
      lessonDate: getLocalDayRange(todayLocal()).start,
      startTime: '00:00',
      endTime: '01:00',
      status: 'SCHEDULED',
      teacherId: null,
      attendanceSubmittedAt: null,
      hoursDeductedAt: null,
      settlementStatus: 'UNSETTLED',
      intensiveReviewStatus: 'NOT_REQUIRED',
      group: {
        id: 'group-1',
        name: '多科班',
        teacherId: 'teacher-primary',
        teacher: { id: 'teacher-primary', name: '主讲老师' },
        intensiveMode: 'NORMAL',
        lessonMinutes: 60,
        course: { type: 'GROUP', subject: '数学' },
        term: { kind: 'WEEKEND' },
        teacherAssignments: [
          { teacherId: 'teacher-primary', subject: '数学' },
          { teacherId: 'teacher-english', subject: '英语' },
        ],
        enrollments: [
          { id: 'en-math', studentId: 'student-math', subjects: ['数学'], totalHours: 10, remainHours: 10 },
          { id: 'en-english', studentId: 'student-english', subjects: ['英语'], totalHours: 10, remainHours: 10 },
        ],
      },
      lessonStudents: [{ studentId: 'student-math' }, { studentId: 'student-english' }],
      attendances: [],
      teacher: null,
    }
    const db = {
      classLesson: { findFirst: vi.fn().mockResolvedValue(lesson) },
      systemConfig: { findUnique: vi.fn().mockResolvedValue({ schedulePeriods: [] }) },
      attendance: { count: vi.fn().mockResolvedValue(0) },
      $transaction: vi.fn(),
    }
    mocks.getRequestPrisma.mockResolvedValue(db)

    const request = new NextRequest('http://localhost/api/admin/attendance/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        lessonId: 'lesson-1',
        teacherId: 'teacher-english',
        records: [{ studentId: 'student-math', status: 'PRESENT' }],
      }),
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toContain('名单已更新')
    expect(db.$transaction).not.toHaveBeenCalled()
  })

  it('does not write attendance or hours when the atomic lesson claim is lost', async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
    mocks.isClassLessonInActiveTerm.mockResolvedValue(true)
    const studentId = 'student-math'
    const lesson = {
      id: 'lesson-claim-race',
      division: 'JUNIOR',
      lessonDate: getLocalDayRange(todayLocal()).start,
      startTime: '00:00',
      endTime: '01:00',
      status: 'SCHEDULED',
      subject: '数学',
      teacherId: null,
      attendanceSubmittedAt: null,
      hoursDeductedAt: null,
      settlementStatus: 'UNSETTLED',
      intensiveReviewStatus: 'NOT_REQUIRED',
      group: {
        id: 'group-1',
        name: '初二数学班',
        teacherId: 'teacher-math',
        teacher: { id: 'teacher-math', name: '数学老师' },
        intensiveMode: 'NORMAL',
        lessonMinutes: 60,
        course: { type: 'GROUP', subject: '数学' },
        term: { kind: 'WEEKEND' },
        teacherAssignments: [{
          teacherId: 'teacher-math',
          subject: '数学',
          teacher: { id: 'teacher-math', name: '数学老师' },
        }],
        enrollments: [{
          id: 'enrollment-math', studentId, subjects: ['数学'], totalHours: 10, remainHours: 10,
        }],
      },
      lessonStudents: [{ studentId }],
      attendances: [],
      teacher: null,
    }
    const claim = vi.fn().mockResolvedValue({ count: 0 })
    const attendanceUpsert = vi.fn()
    const tx = { classLesson: { updateMany: claim }, attendance: { upsert: attendanceUpsert } }
    const db = {
      classLesson: { findFirst: vi.fn().mockResolvedValue(lesson) },
      attendance: { count: vi.fn().mockResolvedValue(0) },
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    }
    mocks.getRequestPrisma.mockResolvedValue(db)

    const request = new NextRequest('http://localhost/api/admin/attendance/submit', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lessonId: lesson.id, teacherId: 'teacher-math', records: [{ studentId, status: 'PRESENT' }] }),
    })

    const response = await POST(request)

    expect(response.status).toBe(409)
    expect((await response.json()).error).toContain('正在提交或已提交')
    expect(claim).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ attendanceSubmittedAt: null, hoursDeductedAt: null }),
    }))
    expect(attendanceUpsert).not.toHaveBeenCalled()
  })
})
