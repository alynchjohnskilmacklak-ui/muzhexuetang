import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { dateRangeDays, localDateColumnValue, todayLocal } from '@/lib/date/local-day'

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getRequestPrisma: vi.fn(),
  recordCourseChangeEvent: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/get-user', () => ({ getCurrentUser: mocks.getCurrentUser }))
vi.mock('@/lib/prisma', () => ({ getRequestPrisma: mocks.getRequestPrisma }))
vi.mock('@/lib/course-change-events', () => ({ recordCourseChangeEvent: mocks.recordCourseChangeEvent }))
vi.mock('@/lib/api-handler', () => ({ apiHandler: (handler: unknown) => handler }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))

import { POST } from './route'

function makeRequest(date: string) {
  return new NextRequest('http://localhost/api/class-groups/group-new/lessons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      date, startTime: '09:00', endTime: '10:00',
      teacherId: 'teacher-new', subject: '数学', note: '补充数学课程',
    }),
  })
}

describe('POST /api/class-groups/[id]/lessons', () => {
  beforeEach(() => vi.clearAllMocks())

  it('用教师分配和班级报名学科识别无 subject 快照的旧课次冲突', async () => {
    const date = dateRangeDays(todayLocal(), 4)[3]
    const newGroup = {
      id: 'group-new', division: 'JUNIOR', status: 'ACTIVE', teacherId: 'teacher-new', roomId: 'room-new',
      intensiveMode: 'STANDARD', lessonMinutes: 60,
      term: { startDate: localDateColumnValue(todayLocal()), endDate: localDateColumnValue(dateRangeDays(date, 2)[1]) },
      course: { name: '综合课程', subject: '综合课程' },
      teacherAssignments: [{ teacherId: 'teacher-new', subject: '数学' }],
      enrollments: [{ studentId: 'student-shared', subjects: ['数学'], student: { parentId: null, parentUserId: null } }],
    }
    const existingLesson = {
      id: 'legacy-lesson', groupId: 'group-old', teacherId: 'teacher-math', subject: null,
      startTime: '09:30', endTime: '10:30', lessonStudents: [],
      group: {
        name: '旧数学班', roomId: 'room-old', teacherId: 'teacher-other',
        course: { subject: '综合课程' },
        teacherAssignments: [
          { teacherId: 'teacher-math', subject: '数学' },
          { teacherId: 'teacher-english', subject: '英语' },
        ],
        enrollments: [{ studentId: 'student-shared', subjects: ['数学'] }],
      },
    }
    const tx = {
      classGroup: { findFirst: vi.fn().mockResolvedValue(newGroup) },
      classLesson: {
        findMany: vi.fn().mockResolvedValue([existingLesson]),
        create: vi.fn(),
        count: vi.fn(),
      },
    }
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    }
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
    mocks.getRequestPrisma.mockResolvedValue(prisma)

    const response = await POST(makeRequest(date), { params: Promise.resolve({ id: 'group-new' }) })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.error).toContain('学员时间冲突：旧数学班')
    expect(tx.classLesson.create).not.toHaveBeenCalled()
  })

  it('忽略当前已不再报名该科目的旧快照，避免错误拦截临时加课', async () => {
    const date = dateRangeDays(todayLocal(), 4)[3]
    const newGroup = {
      id: 'group-new', division: 'JUNIOR', status: 'ACTIVE', teacherId: 'teacher-new', roomId: 'room-new',
      intensiveMode: 'STANDARD', lessonMinutes: 60,
      term: { startDate: localDateColumnValue(todayLocal()), endDate: localDateColumnValue(dateRangeDays(date, 2)[1]) },
      course: { name: '综合课程', subject: '综合课程' },
      teacherAssignments: [{ teacherId: 'teacher-new', subject: '数学' }],
      enrollments: [{ studentId: 'student-shared', subjects: ['数学'], student: { parentId: null, parentUserId: null } }],
    }
    const existingLesson = {
      id: 'legacy-lesson', groupId: 'group-old', teacherId: 'teacher-math', subject: '数学',
      startTime: '09:30', endTime: '10:30',
      lessonStudents: [{ studentId: 'student-shared' }],
      group: {
        name: '旧数学班', roomId: 'room-old', teacherId: 'teacher-other',
        course: { subject: '综合课程' },
        teacherAssignments: [{ teacherId: 'teacher-math', subject: '数学' }],
        enrollments: [{ studentId: 'student-shared', subjects: ['英语'] }],
      },
    }
    const tx = {
      classGroup: { findFirst: vi.fn().mockResolvedValue(newGroup), update: vi.fn() },
      classLesson: {
        findMany: vi.fn().mockResolvedValue([existingLesson]),
        create: vi.fn().mockResolvedValue({ id: 'new-lesson' }),
        count: vi.fn().mockResolvedValue(1),
      },
      classLessonStudent: { createMany: vi.fn() },
      activityLog: { create: vi.fn() },
    }
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)),
    }
    mocks.getCurrentUser.mockResolvedValue({ id: 'admin-1', role: 'admin', division: 'JUNIOR' })
    mocks.getRequestPrisma.mockResolvedValue(prisma)
    mocks.recordCourseChangeEvent.mockResolvedValue({ recipientCount: 0, event: { id: 'change-1' } })

    const response = await POST(makeRequest(date), { params: Promise.resolve({ id: 'group-new' }) })
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(payload).toMatchObject({ id: 'new-lesson', studentCount: 1 })
    expect(tx.classLesson.create).toHaveBeenCalledOnce()
    expect(tx.classLessonStudent.createMany).toHaveBeenCalledWith({
      data: [{ lessonId: 'new-lesson', studentId: 'student-shared' }],
    })
  })
})
