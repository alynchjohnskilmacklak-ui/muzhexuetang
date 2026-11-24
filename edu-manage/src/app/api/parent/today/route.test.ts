import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getLocalWeekRange, localDateColumnValue, todayLocal } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getRequestPrisma: vi.fn() }))
vi.mock('@/lib/auth', () => ({ auth: mocks.auth }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))

import { GET } from './route'

function termStudent(id: string, active: boolean) {
  const startDate = new Date(active ? '2026-09-01T00:00:00.000Z' : '2025-09-01T00:00:00.000Z')
  return {
    id,
    identityId: 'same-child',
    name: '学员甲',
    gender: null,
    birthYear: 2013,
    grade: active ? '初二' : '初一',
    membershipLevel: active ? 'VIP' : 'NORMAL',
    updatedAt: startDate,
    mainTeacher: { name: '胡老师' },
    termMemberships: [{
      grade: active ? '初二' : '初一',
      status: 'ACTIVE',
      joinedAt: startDate,
      term: { status: active ? 'ACTIVE' : 'ARCHIVED', startDate, name: active ? '第二期' : '第一期' },
    }],
  }
}

describe('GET /api/parent/today child identity aggregation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.auth.mockResolvedValue({ user: { id: 'parent-a' } })
  })

  it('returns one current child and combines schedules and unread data across linked terms', async () => {
    const classLesson = {
      id: 'lesson-current',
      lessonDate: localDateColumnValue(todayLocal()),
      startTime: '09:00',
      endTime: '10:00',
      isManual: false,
      subject: '数学',
      lessonStudents: [{ studentId: 'old-record' }, { studentId: 'current-record' }],
      teacher: { name: '胡老师' },
      group: {
        name: '初二班',
        course: { name: '数学课', subject: '数学' },
        teacher: { name: '胡老师' },
        teacherId: 'teacher-1',
        teacherAssignments: [],
        room: { name: '201教室' },
        intensiveMode: 'NORMAL',
        enrollments: [
          { studentId: 'old-record', subjects: ['数学'] },
          { studentId: 'current-record', subjects: ['数学'] },
        ],
      },
    }
    const staleEnglishLesson = {
      ...classLesson,
      id: 'lesson-stale-english-snapshot',
      subject: '英语',
      lessonStudents: [{ studentId: 'current-record' }],
      group: {
        ...classLesson.group,
        course: { name: '英语课', subject: '英语' },
        enrollments: [{ studentId: 'current-record', subjects: ['数学'] }],
      },
    }
    const db = {
      student: { findMany: vi.fn().mockResolvedValue([termStudent('old-record', false), termStudent('current-record', true)]) },
      classLesson: { findMany: vi.fn().mockResolvedValue([classLesson, staleEnglishLesson]) },
      attendance: { findMany: vi.fn().mockResolvedValue([{ id: 'attendance-old', studentId: 'old-record', status: 'PRESENT', createdAt: new Date('2026-10-30T01:00:00.000Z') }]) },
      notification: { findMany: vi.fn().mockResolvedValue([{ studentId: 'old-record' }]) },
      leaveRequest: { findMany: vi.fn().mockResolvedValue([{ studentId: 'old-record' }]) },
    }
    mocks.getRequestPrisma.mockResolvedValue(db)

    const response = await GET()
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.students).toHaveLength(1)
    expect(payload.students[0].student).toMatchObject({ id: 'current-record', grade: '初二', membershipLevel: 'VIP' })
    expect(payload.students[0].student.recordIds).toEqual(['old-record', 'current-record'])
    expect(payload.students[0].todaySchedules).toHaveLength(1)
    expect(payload.students[0].attendance).toHaveLength(1)
    expect(payload.students[0].unreadNotifications).toBe(1)
    expect(payload.students[0].leaveThisWeek).toBe(1)
    const weekRange = getLocalWeekRange(todayLocal())
    expect(db.leaveRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        studentId: { in: ['old-record', 'current-record'] },
        deletedAt: null,
        leaveDate: { gte: weekRange.start, lt: weekRange.end },
      }),
    }))
  })
})
